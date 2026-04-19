import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Plus, Trash, RotateCw, Lightbulb, Box, Move, PlusCircle, Terminal, GripVertical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import mqtt, { MqttClient } from 'mqtt';

const MQTT_WS_URL = 'wss://test.mosquitto.org:8081';
const TOPIC_CMD = 'poly/cmd';
const TOPIC_TELEMETRY = 'poly/telemetry';
const GYRO_POLL_MS = 500;
const TRIGGER_RETRIGGER_MS = 1500;

type CmdType = 'led' | 'pwm' | 'gyro';
type PolyCommand = { cmd: CmdType; target: string; val: number | string };
type ImuSample = { mac: string; ax: number; ay: number; az: number; gx: number; gy: number; gz: number; ts: number };
type ButtonSample = { mac: string; state: 'pressed' | 'released'; ts: number };
type Action = { id: string; nodeId: string; item: 'Servo' | 'LED'; value: number | string; delay: number };
type Trigger = { nodeId: string; item: 'Gyro' | 'Button' | 'Start'; logicType: 'IF' | 'WHILE' | 'START'; mode: 'Tilted' | 'Shaken' | 'Pressed' | 'Auto'; threshold: number | null };
type Flow = { id: string; trigger: Trigger; actions: Action[] };
type LogEntry = { id: string; direction: 'out' | 'in'; msg: string };

const COLORS = [
  { name: 'Red', hex: '#FF0000' },
  { name: 'Green', hex: '#00FF00' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Orange', hex: '#f44f02' },
  { name: 'White', hex: '#FFFFFF' },
];

const NODES: Record<string, { label: string; inputs: string[]; outputs: string[] }> = {
  'POLY One':   { label: 'POLY One',   inputs: ['Button'],         outputs: ['Servo', 'LED'] },
  'POLY Sense': { label: 'POLY Sense', inputs: ['Gyro', 'Button'], outputs: ['LED'] },
  'POLY Home':  { label: 'POLY Home',  inputs: ['Button'],         outputs: ['LED'] },
};

const ITEM_ICONS: Record<string, React.ReactNode> = {
  Button: (
    <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shadow-[0_4px_0_0_#1a1a1a]">
      <div className="w-4 h-4 rounded-full bg-[#f44f02] shadow-[0_0_10px_#f44f02]" />
    </div>
  ),
  Gyro:  <Move className="w-6 h-6 text-zinc-500" />,
  Start: <div className="w-8 h-8 rounded-full bg-emerald-900 border-2 border-emerald-700 flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-emerald-500" /></div>,
  Servo: <RotateCw className="w-5 h-5" />,
  LED:   <Lightbulb className="w-5 h-5" />,
};

const NODE_MACS: Record<string, string> = {
  'POLY One':   'ac:eb:e6:56:4a:d0',
  'POLY Sense': '88:56:a6:2c:5d:24',
  'POLY Home':  'host',
};

const GYRO_MODES = ['Tilted', 'Shaken'];

function hexToInt(hex: string): number {
  const s = (hex || '#000000').replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((c) => c + c).join('') : s, 16);
  return Number.isFinite(n) ? n : 0;
}

function tiltDegrees(s: ImuSample): number {
  const horiz = Math.sqrt(s.ax * s.ax + s.ay * s.ay);
  return (Math.atan2(horiz, Math.abs(s.az)) * 180) / Math.PI;
}

function shakeMagnitude(s: ImuSample): number {
  return Math.sqrt(s.gx * s.gx + s.gy * s.gy + s.gz * s.gz);
}

function useMqtt(url: string, onButtonPress?: (mac: string) => void) {
  const clientRef = useRef<MqttClient | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'error'>('connecting');
  const imuRef = useRef<Record<string, ImuSample>>({});
  const buttonRef = useRef<Record<string, ButtonSample>>({});
  const [, forceTick] = useState(0);
  const logsRef = useRef<LogEntry[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const onButtonPressRef = useRef(onButtonPress);
  useEffect(() => { onButtonPressRef.current = onButtonPress; }, [onButtonPress]);

  const pushLog = useCallback((entry: LogEntry) => {
    logsRef.current = [entry, ...logsRef.current].slice(0, 30);
    setLogs(logsRef.current);
  }, []);

  useEffect(() => {
    const client = mqtt.connect(url, {
      protocolVersion: 4,
      clientId: `poly-ui-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 2000,
      keepalive: 30,
      clean: true,
    });
    clientRef.current = client;

    client.on('connect', () => {
      setStatus('connected');
      client.subscribe(TOPIC_TELEMETRY, { qos: 0 });
    });
    client.on('reconnect', () => setStatus('reconnecting'));
    client.on('error', () => setStatus('error'));

    client.on('message', (topic, payload) => {
      if (topic !== TOPIC_TELEMETRY) return;
      try {
        const obj = JSON.parse(payload.toString());
        if (typeof obj.mac !== 'string') return;

        if ('ax' in obj) {
          const sample: ImuSample = {
            mac: obj.mac,
            ax: +obj.ax, ay: +obj.ay, az: +obj.az,
            gx: +obj.gx, gy: +obj.gy, gz: +obj.gz,
            ts: Date.now(),
          };
          imuRef.current = { ...imuRef.current, [obj.mac]: sample };
          forceTick((n) => n + 1);
          pushLog({ id: Math.random().toString(36).slice(2), direction: 'in', msg: `IMU ${obj.mac.slice(-5)} tilt=${tiltDegrees(sample).toFixed(0)}°` });
        } else if ('state' in obj) {
          const b: ButtonSample = { mac: obj.mac, state: obj.state, ts: Date.now() };
          buttonRef.current = { ...buttonRef.current, [obj.mac]: b };
          forceTick((n) => n + 1);
          pushLog({ id: Math.random().toString(36).slice(2), direction: 'in', msg: `BTN ${obj.mac.slice(-5)} ${obj.state}` });
          if (obj.state === 'pressed') {
            onButtonPressRef.current?.(obj.mac);
          }
        }
      } catch {}
    });

    return () => { client.end(true); clientRef.current = null; };
  }, [url, pushLog]);

  const publish = useCallback((cmd: PolyCommand) => {
    const c = clientRef.current;
    const json = JSON.stringify(cmd);
    if (!c || !c.connected) return;
    c.publish(TOPIC_CMD, json, { qos: 0 });
    pushLog({ id: Math.random().toString(36).slice(2), direction: 'out', msg: json });
  }, [pushLog]);

  return { status, publish, imu: imuRef.current, buttons: buttonRef.current, logs };
}

const SortableAction = ({ action, flow, i, removeActionFromFlow, updateAction, focusedActionId, setFocusedActionId }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: action.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.3 : 1,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  };

  return (
    <div ref={setNodeRef} style={style} className="group/action inline-flex items-center">
      {i > 0 && <span className="text-white/20 not-italic font-bold text-sm uppercase tracking-[0.2em] shrink-0">and then</span>}
      <div className="flex items-center gap-3 relative">
        <div {...attributes} {...listeners} className="absolute -top-4 -left-12 w-6 h-6 text-white/10 hover:text-[#f44f02] cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover/action:opacity-100 transition-all z-50">
          <GripVertical className="w-4 h-4" />
        </div>
        {flow.actions.length > 1 && (
          <button onClick={() => removeActionFromFlow(flow.id, action.id)} className="absolute -top-4 -left-4 w-6 h-6 bg-zinc-800 text-zinc-400 border border-white/10 rounded-lg flex items-center justify-center opacity-0 group-hover/action:opacity-100 transition-all z-50 hover:bg-rose-600 hover:text-white hover:border-rose-600 shadow-lg">
            <Trash className="w-3 h-3" strokeWidth={2} />
          </button>
        )}
        <select
          value={action.nodeId}
          onChange={(e) => {
            const nodeKey = e.target.value as keyof typeof NODES;
            const item = NODES[nodeKey].outputs[0];
            updateAction(flow.id, action.id, { nodeId: e.target.value, item, value: item === 'Servo' ? 90 : '#f44f02' });
          }}
          className="bg-zinc-800/50 border border-white/10 rounded pl-6 pr-7 h-12 text-white font-black italic cursor-pointer hover:bg-[#f44f02] hover:text-black transition-all appearance-none outline-none min-w-[220px]"
        >
          {Object.keys(NODES).map((nodeId) => (
            <option key={nodeId} value={nodeId} className="bg-[#111112] text-white italic">{nodeId}</option>
          ))}
        </select>
        {NODES[action.nodeId as keyof typeof NODES].outputs.length > 1 ? (
          <select value={action.item} onChange={(e) => updateAction(flow.id, action.id, { item: e.target.value, value: e.target.value === 'Servo' ? 90 : '#f44f02' })} className="bg-zinc-800/50 border border-white/10 rounded px-4 h-12 text-[#f44f02] font-black cursor-pointer hover:bg-[#f44f02] hover:text-black transition-all appearance-none outline-none">
            {NODES[action.nodeId as keyof typeof NODES].outputs.map((out) => (
              <option key={out} value={out} className="bg-[#111112] text-white">{out}</option>
            ))}
          </select>
        ) : (
          <span className="text-[#f44f02] font-black">{action.item}</span>
        )}
      </div>
      <span className="text-white/20 not-italic font-bold text-sm uppercase tracking-[0.2em] shrink-0">{action.item === 'Servo' ? 'moves to' : 'set to'}</span>
      {action.item === 'Servo' ? (
        <div className="flex items-center gap-4 bg-white/5 px-4 h-12 rounded-xl border border-white/10 shrink-0">
          <input type="range" min="0" max="180" value={action.value} onChange={(e) => updateAction(flow.id, action.id, { value: parseInt(e.target.value) })} className="accent-[#f44f02] w-24 h-1" />
          <span className="text-2xl text-[#f44f02]">{action.value}°</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2 relative shrink-0">
          <div className="flex items-center gap-3 bg-white/5 px-3 h-12 rounded-xl border border-white/10 focus-within:border-[#f44f02] transition-colors">
            <div className="w-6 h-6 rounded-full border border-white/20" style={{ backgroundColor: action.value as string }} />
            <input type="text" maxLength={7} value={(action.value as string) || ''} onFocus={() => setFocusedActionId(action.id)} onBlur={() => setTimeout(() => setFocusedActionId(null), 200)} onChange={(e) => updateAction(flow.id, action.id, { value: e.target.value })} className="bg-transparent border-none p-0 text-xl font-mono font-bold w-24 focus:ring-0 uppercase h-full" style={{ color: (action.value as string) || '#f44f02' }} />
          </div>
          {focusedActionId === action.id && (
            <div className="absolute top-full left-0 mt-1 flex gap-1.5 p-2 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl z-[100] animate-in fade-in slide-in-from-top-1 shrink-0">
              {COLORS.map((c) => (
                <button key={c.name} onClick={() => updateAction(flow.id, action.id, { value: c.hex })} className={`w-5 h-5 rounded-full border border-white/10 hover:scale-110 transition-transform ${action.value === c.hex ? 'border-white ring-1 ring-[#f44f02]/50' : ''}`} style={{ backgroundColor: c.hex }} title={c.name} />
              ))}
              <button onClick={() => updateAction(flow.id, action.id, { value: '#000000' })} className={`w-5 h-5 rounded-full border border-white/10 bg-black hover:scale-110 transition-transform ${action.value === '#000000' ? 'border-white ring-1 ring-[#f44f02]/50' : ''}`} title="OFF" />
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-white/20 not-italic font-bold text-sm uppercase tracking-[0.2em] self-center">after</span>
        <div className="flex items-center gap-2 bg-black/40 px-3 h-10 rounded border border-white/5">
          <input type="number" step="1" min="0" value={action.delay || 0} onChange={(e) => updateAction(flow.id, action.id, { delay: parseFloat(e.target.value) })} className="bg-transparent border-none text-[#f44f02] font-black w-10 text-xl focus:ring-0 text-center h-full" />
          <span className="text-[10px] text-white/20 font-bold uppercase">s</span>
        </div>
      </div>
    </div>
  );
};

const ConnectAndCode = () => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [focusedActionId, setFocusedActionId] = useState<string | null>(null);

  const lastFiredRef = useRef<Record<string, number>>({});
  const activeWhileRef = useRef<Record<string, boolean>>({});
  const isRunningRef = useRef(isRunning);
  const flowsRef = useRef(flows);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);
  useEffect(() => { flowsRef.current = flows; }, [flows]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const runActions = useCallback((flow: Flow, publishFn: (cmd: PolyCommand) => void) => {
    setActiveFlowId(flow.id);
    let accumulated = 0;
    flow.actions.forEach((action) => {
      accumulated += (action.delay || 0) * 1000;
      const target = NODE_MACS[action.nodeId] ?? action.nodeId;
      setTimeout(() => {
        if (action.item === 'Servo') publishFn({ cmd: 'pwm', target, val: Number(action.value) });
        else publishFn({ cmd: 'led', target, val: hexToInt(String(action.value)) });
      }, accumulated);
    });
    setTimeout(() => setActiveFlowId(null), accumulated + 800);
  }, []);

  const publishRef = useRef<(cmd: PolyCommand) => void>(() => {});

  const handleButtonPress = useCallback((mac: string) => {
    if (!isRunningRef.current) return;
    const matchingFlows = flowsRef.current.filter(
      (f) => f.trigger.item === 'Button' && NODE_MACS[f.trigger.nodeId] === mac
    );
    matchingFlows.forEach((f) => {
      const now = Date.now();
      const last = lastFiredRef.current[f.id] ?? 0;
      if (now - last > TRIGGER_RETRIGGER_MS) {
        lastFiredRef.current[f.id] = now;
        runActions(f, publishRef.current);
      }
    });
  }, [runActions]);

  const { status, publish, imu, buttons, logs } = useMqtt(MQTT_WS_URL, handleButtonPress);
  useEffect(() => { publishRef.current = publish; }, [publish]);

  const evaluateTrigger = useCallback((flow: Flow): boolean => {
    if (flow.trigger.logicType === 'START') return true;
    const mac = NODE_MACS[flow.trigger.nodeId];
    if (!mac) return false;
    if (flow.trigger.item === 'Gyro') {
      const sample = imu[mac];
      if (!sample) return false;
      if (flow.trigger.mode === 'Tilted') return tiltDegrees(sample) >= (flow.trigger.threshold ?? 30);
      if (flow.trigger.mode === 'Shaken') return shakeMagnitude(sample) >= 250;
    }
    if (flow.trigger.item === 'Button') {
      const b = buttons[mac];
      return !!b && b.state === 'pressed';
    }
    return false;
  }, [imu, buttons]);

  useEffect(() => {
    if (!isRunning) {
      lastFiredRef.current = {};
      activeWhileRef.current = {};
      return;
    }
    const interval = setInterval(() => {
      const polledMacs = new Set<string>();
      flows.forEach((f) => {
        if (f.trigger.item === 'Gyro') {
          const mac = NODE_MACS[f.trigger.nodeId];
          if (mac && !polledMacs.has(mac)) {
            publish({ cmd: 'gyro', target: mac, val: 1 });
            polledMacs.add(mac);
          }
        }
      });
      flows.forEach((f) => {
        const now = Date.now();
        const firing = evaluateTrigger(f);
        if (f.trigger.logicType === 'IF') {
          if (firing) {
            const last = lastFiredRef.current[f.id] ?? 0;
            if (now - last > TRIGGER_RETRIGGER_MS) {
              lastFiredRef.current[f.id] = now;
              runActions(f, publish);
            }
          }
        } else if (f.trigger.logicType === 'WHILE') {
          const wasActive = activeWhileRef.current[f.id] ?? false;
          if (firing && !wasActive) {
            activeWhileRef.current[f.id] = true;
            runActions(f, publish);
          } else if (!firing && wasActive) {
            activeWhileRef.current[f.id] = false;
            f.actions.forEach((a) => {
              const target = NODE_MACS[a.nodeId] ?? a.nodeId;
              if (a.item === 'LED') publish({ cmd: 'led', target, val: 0 });
              if (a.item === 'Servo') publish({ cmd: 'pwm', target, val: 0 });
            });
          }
        } else if (f.trigger.logicType === 'START') {
          const hasFired = lastFiredRef.current[f.id] ?? false;
          if (!hasFired) {
            lastFiredRef.current[f.id] = now;
            runActions(f, publish);
          }
        }
      });
    }, GYRO_POLL_MS);
    return () => clearInterval(interval);
  }, [isRunning, flows, publish, evaluateTrigger, runActions]);

  const senseMac = NODE_MACS['POLY Sense'];
  const liveSample = imu[senseMac];
  const liveTilt = liveSample ? Math.round(tiltDegrees(liveSample)) : 0;

  const handleDragEnd = (event: any, flowId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFlows((prev) => prev.map((flow) => {
      if (flow.id !== flowId) return flow;
      const oldIndex = flow.actions.findIndex((a) => a.id === active.id);
      const newIndex = flow.actions.findIndex((a) => a.id === over.id);
      return { ...flow, actions: arrayMove(flow.actions, oldIndex, newIndex) };
    }));
  };

  const addFlow = (triggerNodeId: string, triggerItem: string) => {
    const newFlow: Flow = {
      id: Math.random().toString(36).slice(2, 11),
      trigger: {
        nodeId: triggerNodeId,
        item: triggerItem as any,
        logicType: triggerItem === 'Start' ? 'START' : 'IF',
        mode: triggerItem === 'Gyro' ? 'Tilted' : triggerItem === 'Start' ? 'Auto' : 'Pressed',
        threshold: triggerItem === 'Gyro' ? 45 : null,
      },
      actions: [{ id: Math.random().toString(36).slice(2, 11), nodeId: 'POLY One', item: 'Servo', value: 90, delay: 0 }],
    };
    setFlows([...flows, newFlow]);
  };

  const addActionToFlow = (flowId: string) => {
    setFlows(flows.map((f) => f.id === flowId
      ? { ...f, actions: [...f.actions, { id: Math.random().toString(36).slice(2, 11), nodeId: 'POLY One', item: 'Servo', value: 90, delay: 0 }] }
      : f));
  };

  const removeActionFromFlow = (flowId: string, actionId: string) => {
    setFlows(flows.map((f) => f.id === flowId ? { ...f, actions: f.actions.filter((a) => a.id !== actionId) } : f));
  };

  const updateTrigger = (id: string, updates: Partial<Trigger>) => {
    setFlows(flows.map((f) => f.id === id ? { ...f, trigger: { ...f.trigger, ...updates } } : f));
  };

  const updateAction = (flowId: string, actionId: string, updates: Partial<Action>) => {
    setFlows(flows.map((f) => f.id === flowId
      ? { ...f, actions: f.actions.map((a) => a.id === actionId ? { ...a, ...updates } : a) }
      : f));
  };

  const connText = useMemo(() => ({
    connecting: 'Connecting…', connected: 'Mesh Link OK', reconnecting: 'Reconnecting…', error: 'Offline',
  }[status]), [status]);

  const connColor = status === 'connected' ? 'text-green-500' : status === 'error' ? 'text-rose-500' : 'text-amber-500';

  return (
    <div className="min-h-screen bg-[#080809] text-zinc-400 selection:bg-[#f44f02]/30 flex flex-col tracking-tight text-[11px] font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap');
        .font-mono { font-family: 'Space Mono', monospace !important; }
        .font-sans { font-family: 'Roboto', sans-serif !important; }
        input[type="range"] { transition: none; }
      `}</style>

      <header className="h-28 border-b-2 border-white/5 bg-[#0D0D0D] flex items-center justify-between px-12 shrink-0 z-50 sticky top-0">
        <div className="flex items-center gap-8 text-white">
          <div className="w-14 h-14 bg-[#f44f02] flex items-center justify-center rounded shadow-[0_0_30px_rgba(244,79,2,0.3)]">
            <Box className="w-8 h-8 text-black fill-black" strokeWidth={3} />
          </div>
          <div>
            <div className="flex items-baseline gap-6">
              <h1 className="text-3xl font-black tracking-tighter italic leading-none">POLY <span className="text-[#f44f02]">INSTRUCT</span></h1>
              <span className="text-xl font-bold tracking-[0.2em] text-[#f44f02] lowercase opacity-80 border-l border-white/10 pl-6">engineering for everyone</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end gap-1 text-right">
            <span className={`text-[10px] font-black tracking-widest uppercase ${connColor}`}>{connText}</span>
            <span className="text-[10px] font-mono text-zinc-600">tilt {liveTilt}°</span>
          </div>
          <motion.button
            layout
            transition={{ layout: { type: 'spring', stiffness: 300, damping: 30 }, default: { duration: 0.5 } }}
            onClick={() => setIsRunning(!isRunning)}
            disabled={status !== 'connected'}
            className={`px-12 py-4 rounded font-black text-sm tracking-[0.1em] transition-all duration-500 border-4 disabled:opacity-40 disabled:cursor-not-allowed ${isRunning ? 'bg-[#f44f02] text-black border-[#f44f02] shadow-[0_0_40px_rgba(244,79,2,0.2)]' : 'bg-transparent text-white border-white/20'}`}
          >
            {isRunning ? 'System Active' : 'Activate System'}
          </motion.button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 bg-[#080809] p-12 overflow-y-auto relative bg-[radial-gradient(circle_at_center,_#161616_2px,_transparent_1px)] bg-[size:50px_50px]">
          <div className="max-w-7xl mx-auto flex flex-col gap-12 pb-32">
            {flows.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-center">
                <p className="text-3xl font-black tracking-tighter text-white uppercase mb-16 italic opacity-20">Start Your Automation</p>
                <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                  <button onClick={() => addFlow('System', 'Start')} className="bg-[#111112] border-2 border-white/5 hover:border-emerald-600 p-8 rounded-3xl flex items-center justify-between group transition-all text-left">
                    <div className="flex items-center gap-6">{ITEM_ICONS['Start']}<div><p className="text-xl font-black text-white italic tracking-tighter">On Start</p><p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Global Trigger</p></div></div>
                    <Plus className="w-6 h-6 text-white/5 group-hover:text-emerald-600 transition-colors" />
                  </button>
                  {Object.entries(NODES).map(([id, node]) => (
                    <div key={id} className="flex flex-col gap-4">
                      <p className="text-xl font-black text-[#f44f02] tracking-tighter italic uppercase text-left">{id}</p>
                      <div className="grid gap-3">
                        {node.inputs.map((input) => (
                          <button key={input} onClick={() => addFlow(id, input)} className="bg-[#111112] border-2 border-white/5 hover:border-[#f44f02] p-8 rounded-3xl flex items-center justify-between group transition-all text-left">
                            <div className="flex items-center gap-6">
                              {ITEM_ICONS[input]}
                              <div>
                                <p className="text-xl font-black text-white italic tracking-tighter">{input}</p>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Input Sensor</p>
                              </div>
                            </div>
                            <Plus className="w-6 h-6 text-white/5 group-hover:text-[#f44f02] transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {flows.map((flow) => (
                  <div key={flow.id} className={`bg-[#111112] border-2 rounded-3xl overflow-hidden shadow-2xl relative shadow-black group ${activeFlowId === flow.id ? 'border-[#f44f02]' : 'border-white/5 hover:border-white/10'}`}>
                    {activeFlowId === flow.id && isRunning && (
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#f44f02] origin-left shadow-[0_0_15px_#f44f02]" />
                    )}
                    <button onClick={() => setFlows(flows.filter((f) => f.id !== flow.id))} className="absolute top-6 right-6 p-3 text-white/5 hover:text-rose-600 hover:bg-rose-600/5 rounded-full transition-all opacity-0 group-hover:opacity-100 z-50">
                      <Trash className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                    <div className="p-12 flex flex-col gap-10 text-3xl font-black tracking-tighter text-white text-left">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-10">
                        {flow.trigger.logicType !== 'START' && (
                          <select value={flow.trigger.logicType} onChange={(e) => updateTrigger(flow.id, { logicType: e.target.value as 'IF' | 'WHILE' })} className="bg-zinc-800/50 border border-white/10 rounded px-4 h-12 text-[#f44f02] font-black cursor-pointer hover:bg-[#f44f02] hover:text-black transition-all appearance-none outline-none">
                            <option value="IF" className="bg-[#111112] text-white">If</option>
                            <option value="WHILE" className="bg-[#111112] text-white">While</option>
                          </select>
                        )}
                        {flow.trigger.logicType === 'START' && <span className="text-emerald-500 font-black h-12 flex items-center">On Start</span>}
                        {flow.trigger.logicType !== 'START' && (
                          <select value={flow.trigger.nodeId} onChange={(e) => { const nodeKey = e.target.value as keyof typeof NODES; const item = NODES[nodeKey].inputs[0]; updateTrigger(flow.id, { nodeId: e.target.value, item: item as any, mode: item === 'Gyro' ? 'Tilted' : 'Pressed' }); }} className="bg-zinc-800/50 border border-white/10 rounded pl-6 pr-7 h-12 text-white font-black italic cursor-pointer hover:bg-[#f44f02] hover:text-black transition-all appearance-none outline-none min-w-[220px]">
                            {Object.keys(NODES).map((nodeId) => (
                              <option key={nodeId} value={nodeId} className="bg-[#111112] text-white italic">{nodeId}</option>
                            ))}
                          </select>
                        )}
                        {flow.trigger.logicType !== 'START' && NODES[flow.trigger.nodeId as keyof typeof NODES].inputs.length > 1 ? (
                          <select value={flow.trigger.item} onChange={(e) => updateTrigger(flow.id, { item: e.target.value as any, mode: e.target.value === 'Gyro' ? 'Tilted' : 'Pressed' })} className="bg-zinc-800/50 border border-white/10 rounded px-4 h-12 text-[#f44f02] font-black cursor-pointer hover:bg-[#f44f02] hover:text-black transition-all appearance-none outline-none">
                            {NODES[flow.trigger.nodeId as keyof typeof NODES].inputs.map((input) => (
                              <option key={input} value={input} className="bg-[#111112] text-white">{input}</option>
                            ))}
                          </select>
                        ) : flow.trigger.logicType !== 'START' && (
                          <span className="text-[#f44f02] h-12 flex items-center">{flow.trigger.item}</span>
                        )}
                        {flow.trigger.logicType !== 'START' && <span className="text-white/20 not-italic font-bold text-sm uppercase tracking-[0.2em] self-center">is</span>}
                        {flow.trigger.logicType !== 'START' && flow.trigger.item === 'Gyro' ? (
                          <select value={flow.trigger.mode} onChange={(e) => updateTrigger(flow.id, { mode: e.target.value as any })} className="bg-zinc-800/50 border border-white/10 rounded px-4 h-12 text-[#f44f02] font-black cursor-pointer hover:bg-[#f44f02] hover:text-black transition-all appearance-none outline-none">
                            {GYRO_MODES.map((m) => <option key={m} value={m} className="bg-[#111112] text-white">{m}</option>)}
                          </select>
                        ) : flow.trigger.logicType !== 'START' && (
                          <span className="text-[#f44f02] h-12 flex items-center">{flow.trigger.mode}</span>
                        )}
                        {flow.trigger.mode === 'Tilted' && (
                          <div className="flex items-center gap-4 h-12">
                            <span className="text-white/20 not-italic font-bold text-sm uppercase tracking-[0.2em] self-center">past</span>
                            <div className="flex items-center gap-4 bg-white/5 px-4 h-full rounded-xl border border-white/10">
                              <input type="range" min="5" max="90" value={flow.trigger.threshold || 0} onChange={(e) => updateTrigger(flow.id, { threshold: parseInt(e.target.value) })} className="accent-[#f44f02] w-24 h-1" />
                              <span className="text-2xl text-[#f44f02]">{flow.trigger.threshold || 0}°</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-10">
                        <span className="text-white/20 not-italic font-bold text-sm uppercase tracking-[0.2em] self-center h-12 flex items-center">then</span>
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, flow.id)}>
                          <SortableContext items={flow.actions.map((a) => a.id)} strategy={horizontalListSortingStrategy}>
                            {flow.actions.map((action, i) => (
                              <SortableAction key={action.id} action={action} flow={flow} i={i} removeActionFromFlow={removeActionFromFlow} updateAction={updateAction} focusedActionId={focusedActionId} setFocusedActionId={setFocusedActionId} />
                            ))}
                          </SortableContext>
                        </DndContext>
                        <button onClick={() => addActionToFlow(flow.id)} className="flex items-center gap-2 text-[#f44f02] hover:text-white transition-colors group/add h-12">
                          <span className="text-white/20 not-italic font-bold text-sm uppercase tracking-[0.2em] self-center group-hover/add:text-[#f44f02]">and then...</span>
                          <PlusCircle className="w-6 h-6 opacity-20 group-hover/add:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    </div>
                    {flow.trigger.logicType === 'WHILE' && (
                      <div className="mt-8 flex items-center gap-4 text-white/20 not-italic font-bold text-sm uppercase tracking-[0.2em] px-12 pb-8">
                        <div className="h-[2px] flex-1 bg-white/5" />
                        <span className="italic text-[10px]">otherwise revert to previous state</span>
                        <div className="h-[2px] flex-1 bg-white/5" />
                      </div>
                    )}
                    <div className="absolute -bottom-[2px] left-12 right-12 h-[2px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  </div>
                ))}
                <div className="py-24 border-4 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center px-12">
                  <p className="text-2xl font-black tracking-tighter text-white uppercase mb-12 italic opacity-20">Add Another Sequence</p>
                  <div className="grid grid-cols-2 gap-8 w-full max-w-2xl">
                    <button onClick={() => addFlow('System', 'Start')} className="bg-[#111112] border-2 border-white/5 hover:border-emerald-600 p-8 rounded-3xl flex items-center justify-between group transition-all text-left">
                      <div className="flex items-center gap-6">{ITEM_ICONS['Start']}<div><p className="text-xl font-black text-white italic tracking-tighter">On Start</p><p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Global Trigger</p></div></div>
                      <Plus className="w-6 h-6 text-white/5 group-hover:text-emerald-600 transition-colors" />
                    </button>
                    {Object.entries(NODES).map(([id, node]) => (
                      <div key={id} className="flex flex-col gap-4">
                        <p className="text-xl font-black text-[#f44f02] tracking-tighter italic uppercase text-left">{id}</p>
                        <div className="grid gap-3">
                          {node.inputs.map((input) => (
                            <button key={input} onClick={() => addFlow(id, input)} className="bg-[#111112] border-2 border-white/5 hover:border-[#f44f02] p-8 rounded-3xl flex items-center justify-between group transition-all text-left">
                              <div className="flex items-center gap-6">
                                {ITEM_ICONS[input]}
                                <div>
                                  <p className="text-xl font-black text-white italic tracking-tighter">{input}</p>
                                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Input Sensor</p>
                                </div>
                              </div>
                              <Plus className="w-6 h-6 text-white/5 group-hover:text-[#f44f02] transition-colors" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      <footer className="h-16 bg-[#0D0D0D] border-t-2 border-white/5 flex items-center px-12 gap-10 shrink-0 overflow-hidden relative">
        <div className="flex items-center gap-3 shrink-0 text-zinc-600">
          <Terminal className="w-4 h-4 text-[#f44f02]" />
          <span className="text-[10px] font-black tracking-widest">Live output feed:</span>
        </div>
        <div className="flex-1 flex overflow-hidden items-center justify-start h-full">
          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <motion.div key={log.id} layout initial={{ opacity: 0, x: -100, width: 0 }} animate={{ opacity: Math.max(0, 1 - i * 0.15), x: 0, width: 'auto', marginRight: '1.5rem' }} exit={{ opacity: 0, x: 100, width: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} className={`font-mono text-[10px] whitespace-nowrap border-r border-white/5 pr-6 italic tracking-tighter shrink-0 ${log.direction === 'in' ? 'text-cyan-400' : 'text-[#f44f02]'}`}>
                <span className="opacity-50 mr-2">{log.direction === 'in' ? '←' : '→'}</span>
                {log.msg}
              </motion.div>
            ))}
          </AnimatePresence>
          {logs.length === 0 && <span className="text-zinc-800 text-[10px] italic tracking-widest animate-pulse">Monitoring mesh loop...</span>}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[9px] font-black text-white tracking-[0.2em]">engineered by</span>
          <span className="text-xl font-black italic tracking-tighter text-[#f44f02]">POLY</span>
        </div>
      </footer>
    </div>
  );
};

export default ConnectAndCode;