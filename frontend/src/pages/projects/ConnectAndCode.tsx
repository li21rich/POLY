import { useState, useEffect } from 'react';
import { 
  Zap, 
  ChevronRight, 
  Plus, 
  Trash,
  RotateCw, 
  Lightbulb, 
  Box,
  Move,
  PlusCircle,
  Repeat,
  Clock,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = [
  { name: 'Red', hex: '#FF0000' },
  { name: 'Green', hex: '#00FF00' },
  { name: 'Blue', hex: '#0000FF' },
  { name: 'Orange', hex: '#f44f02' },
  { name: 'White', hex: '#FFFFFF' },
];

const NODES = {
  'POLY One': { label: 'POLY One', outputs: ['Servo', 'LED'] },
  'POLY Sense': { label: 'POLY Sense', outputs: ['LED'] },
};
const NODE_MACS: Record<string, string> = {
  'POLY One': '88:56:a6:2c:5d:24',
  'POLY Sense': '88:56:a6:2c:5d:25',
};
const GYRO_MODES = ['Tilted', 'Shaken'];

const ConnectAndCode = () => {
  const [flows, setFlows] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [telemetry, setTelemetry] = useState<any>({ gyro: 0, button: 'IDLE' });
  const [mqttLogs, setMqttLogs] = useState<string[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);

  useEffect(() => {
  const interval = setInterval(() => {
    const gVal = Math.floor(Math.random() * 90);
    setTelemetry({ gyro: gVal, button: Math.random() > 0.8 ? 'ACTIVE' : 'IDLE' });

    if (isRunning && flows.length > 0) {
      const flow = flows[Math.floor(Math.random() * flows.length)];
      setActiveFlowId(flow.id);

      const action = flow.actions[0];
      const target = NODE_MACS[action.nodeId as keyof typeof NODE_MACS];

      let cmd: 'servo' | 'led' | 'gyro' =
        flow.trigger?.item === 'Gyro'
          ? 'gyro'
          : action.item === 'Servo'
          ? 'servo'
          : 'led';

      let val: any =
        flow.trigger?.item === 'Gyro'
          ? (flow.trigger.threshold ?? 1)
          : action.value;

      const payload = { cmd, target, val };

      setMqttLogs(prev => [JSON.stringify(payload), ...prev].slice(0, 5));

      setTimeout(() => setActiveFlowId(null), 800);
    }
  }, 3000);

  return () => clearInterval(interval);
}, [isRunning, flows]);

  const addFlow = (triggerNodeId: string, triggerItem: string) => {
    const newFlow = {
      id: Math.random().toString(36).substr(2, 9),
      trigger: { 
        nodeId: triggerNodeId, 
        item: triggerItem,
        logicType: 'IF',
        mode: triggerItem === 'Gyro' ? 'Tilted' : 'Pressed',
        threshold: triggerItem === 'Gyro' ? 45 : null
      },
      actions: [
        { id: Math.random().toString(36).substr(2, 5), nodeId: 'POLY One', item: 'Servo', value: 90, delay: 0 }
      ]
    };
    setFlows([...flows, newFlow]);
  };

  const addActionToFlow = (flowId: string) => {
    setFlows(flows.map(f => {
      if (f.id === flowId) {
        return {
          ...f,
          actions: [...f.actions, { id: Math.random().toString(36).substr(2, 5), nodeId: 'POLY One', item: 'Servo', value: 90, delay: 0 }]
        };
      }
      return f;
    }));
  };

  const removeActionFromFlow = (flowId: string, actionId: string) => {
    setFlows(flows.map(f => {
      if (f.id === flowId) {
        return { ...f, actions: f.actions.filter((a: any) => a.id !== actionId) };
      }
      return f;
    }));
  };

  const updateTrigger = (id: string, updates: any) => {
    setFlows(flows.map(f => f.id === id ? { ...f, trigger: { ...f.trigger, ...updates } } : f));
  };

  const updateAction = (flowId: string, actionId: string, updates: any) => {
    setFlows(flows.map(f => {
      if (f.id === flowId) {
        return {
          ...f,
          actions: f.actions.map((a: any) => a.id === actionId ? { ...a, ...updates } : a)
        };
      }
      return f;
    }));
  };

  return (
    <div className="min-h-screen bg-[#080809] text-zinc-400 selection:bg-[#f44f02]/30 flex flex-col tracking-tight text-[11px] font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&family=Space+Mono:wght@400;700&display=swap');
        
        .font-mono { font-family: 'Space Mono', monospace !important; }
        .font-sans { font-family: 'Roboto', sans-serif !important; }
        
        /* Smooth transitions for all elements */
        * { transition: all 0.2s ease; }
        
        /* Prevent transitions on range inputs for better performance during drag */
        input[type="range"] { transition: none; }
      `}</style>

      <header className="h-28 border-b-2 border-white/5 bg-[#0D0D0D] flex items-center justify-between px-12 shrink-0 z-50 sticky top-0">
        <div className="flex items-center gap-8 text-white">
          <div className="w-14 h-14 bg-[#f44f02] flex items-center justify-center rounded shadow-[0_0_30px_rgba(244,79,2,0.3)]">
            <Box className="w-8 h-8 text-black fill-black" strokeWidth={3} />
          </div>
          <div>
            <div className="flex items-baseline gap-6">
              <h1 className="text-3xl font-black tracking-tighter italic leading-none">
                POLY <span className="text-[#f44f02]">INSTRUCT</span>
              </h1>
              <span className="text-xl font-bold tracking-[0.2em] text-[#f44f02] lowercase opacity-80 border-l border-white/10 pl-6">
                engineering for everyone
              </span>
            </div>
          </div>
        </div>

        <motion.button 
          layout
          transition={{
            layout: { type: "spring", stiffness: 300, damping: 30 },
            default: { duration: 0.5 }
          }}
          onClick={() => setIsRunning(!isRunning)}
          className={`px-12 py-4 rounded font-black text-sm tracking-[0.1em] transition-all duration-500 border-4 ${
            isRunning 
              ? 'bg-transparent text-white border-white/20' 
              : 'bg-[#f44f02] text-black border-[#f44f02] hover:bg-[#ff5e1a] shadow-[0_0_40px_rgba(244,79,2,0.2)]'
          }`}
        >
          {isRunning ? 'Deactivate' : 'Activate'}
        </motion.button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 bg-[#0D0D0D]/50 border-r-2 border-white/5 flex flex-col p-8 gap-8 overflow-y-auto shrink-0 text-white">
          <section>
            <p className="text-2xl font-black text-[#f44f02] tracking-tight mb-8 opacity-90 border-b-2 border-[#f44f02] pb-3 inline-block">Triggers</p>
            <div className="grid gap-3">
              {[
                { node: 'POLY One', item: 'Button', icon: (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shadow-[0_4px_0_0_#1a1a1a]">
                    <div className="w-4 h-4 rounded-full bg-[#f44f02] shadow-[0_0_10px_#f44f02]" />
                  </div>
                ) },
                { node: 'POLY Two S', item: 'Gyro', icon: <Move className="w-6 h-6 text-zinc-500" /> },
                { node: 'POLY Two S', item: 'Button', icon: (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center shadow-[0_4px_0_0_#1a1a1a]">
                    <div className="w-4 h-4 rounded-full bg-[#f44f02] shadow-[0_0_10px_#f44f02]" />
                  </div>
                ) }
              ].map((t, i) => (
                <button key={i} onClick={() => addFlow(t.node, t.item)} className="bg-white/5 border-2 border-white/10 hover:border-[#f44f02] p-5 rounded-lg flex items-center justify-between group transition-all text-left">
                  <div className="flex items-center gap-4">
                    <div className="p-1">{t.icon}</div>
                    <div>
                       <p className="text-xs font-black text-white tracking-tighter leading-none">{t.node}</p>
                       <p className="text-[9px] font-bold text-white/20 italic mt-1">{t.item} Sensor</p>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-zinc-800 group-hover:text-[#f44f02]" strokeWidth={4} />
                </button>
              ))}
            </div>
          </section>

          <section className="mt-auto bg-black/40 border border-white/5 p-6 rounded-xl text-zinc-400">
             <p className="text-[9px] font-black text-zinc-600 tracking-widest mb-4">Live Hardware Feed</p>
             <div className="space-y-3">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-bold">Gyro Rotation</span>
                   <span className="text-[10px] font-black text-[#f44f02]">{telemetry.gyro}°</span>
                </div>
                <div className="flex justify-between items-center text-green-600">
                   <span className="text-[10px] font-bold tracking-widest">Mesh Link</span>
                   <span className="text-[10px] font-black tracking-widest">Connected</span>
                </div>
             </div>
          </section>
        </aside>

        <main className="flex-1 bg-[#080809] p-12 overflow-y-auto relative bg-[radial-gradient(circle_at_center,_#161616_2px,_transparent_1px)] bg-[size:50px_50px]">
          <div className="max-w-5xl mx-auto flex flex-col gap-12 pb-32">
              {flows.length === 0 && (
                <div className="py-64 flex flex-col items-center justify-center opacity-10 text-center">
                   <Zap className="w-24 h-24 mb-10 text-white" />
                   <p className="text-sm font-black tracking-tight text-white">Ready to build</p>
                </div>
              )}
              
              {flows.map((flow) => (
  <motion.div
    key={flow.id}
    className={`bg-[#111112] border-2 rounded-2xl overflow-hidden shadow-2xl relative shadow-black ${
      activeFlowId === flow.id ? 'border-[#f44f02]' : 'border-white/10'
    }`}
  >
                  {isRunning && (
                    <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#f44f02] to-transparent z-10" />
                  )}
                  
                  <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between relative">
                    <div className="flex items-center gap-8">
                       <button onClick={() => updateTrigger(flow.id, { logicType: flow.trigger.logicType === 'IF' ? 'WHILE' : 'IF' })} className={`flex flex-col items-center gap-1 p-3 rounded border-2 transition-all min-w-[100px] ${flow.trigger.logicType === 'IF' ? 'bg-[#f44f02]/10 border-[#f44f02] text-[#f44f02]' : 'bg-white/5 border-white/40 text-[#f44f02]'}`}>
                         {flow.trigger.logicType === 'IF' ? <Zap className="w-5 h-5" /> : <Repeat className="w-5 h-5 animate-spin-slow" />}
                         <span className="text-[10px] font-black">{flow.trigger.logicType}</span>
                       </button>

                       <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-[10px] font-black text-[#f44f02] tracking-[0.4em] opacity-50">Active Trigger</span>
                            {flow.trigger.logicType === 'WHILE' && (
                               <span className="text-[10px] font-black text-white bg-[#f44f02] px-2 py-0.5 rounded tracking-tighter whitespace-nowrap">Reverts on release</span>
                            )}
                          </div>
                          <p className="text-3xl font-black italic tracking-tighter text-white">{flow.trigger.nodeId} {flow.trigger.item}</p>
                       </div>
                       
                       <div className="h-10 w-[2px] bg-white/10" />
                       
                       <div className="flex items-center gap-4 bg-black/40 px-4 py-2 border border-white/10 rounded-lg text-white">
                          {flow.trigger.item === 'Gyro' ? (
                            <>
                              <select value={flow.trigger.mode} onChange={(e) => updateTrigger(flow.id, { mode: e.target.value })} className="bg-[#111112] border-2 border-white/10 rounded px-3 py-1 text-xs font-black text-[#f44f02] outline-none cursor-pointer hover:border-[#f44f02]/50 transition-colors">
                                {GYRO_MODES.map(m => <option key={m} value={m} className="bg-[#111112] text-white">{m}</option>)}
                              </select>
                              {flow.trigger.mode === 'Tilted' && (
                                <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                                  <input type="range" min="5" max="90" value={flow.trigger.threshold} onChange={(e) => updateTrigger(flow.id, { threshold: parseInt(e.target.value) })} className="accent-[#f44f02] w-24 h-1" />
                                  <span className="text-sm font-black text-[#f44f02] italic">{flow.trigger.threshold}°</span>
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-xs font-black italic">On Press</span>
                          )}
                       </div>
                    </div>
                    <button onClick={() => setFlows(flows.filter(f => f.id !== flow.id))} className="p-3 text-white/10 hover:text-rose-600 hover:bg-rose-600/5 rounded-full transition-all group">
                      <Trash className="w-6 h-6 group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                    </button>
                  </div>

                  <div className="p-8 space-y-6">
                    {flow.actions.map((action: any) => (
                      <div key={action.id} className="flex flex-col gap-6 bg-black/40 border border-white/5 rounded-xl p-8 relative">
                        <div className="flex items-center justify-between text-white">
                          <div className="flex items-center gap-8">
                             <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-zinc-600">
                               {action.item === 'Servo' ? <RotateCw className="w-5 h-5" /> : <Lightbulb className="w-5 h-5" />}
                             </div>
                             <div className="flex items-center gap-6">
                                <select value={action.nodeId} onChange={(e) => {
                                   const nodeKey = e.target.value as keyof typeof NODES;
                                   const item = NODES[nodeKey].outputs[0];
                                   updateAction(flow.id, action.id, { nodeId: e.target.value, item, value: item === 'Servo' ? 90 : '#f44f02' });
                                }} className="bg-[#111112] border-2 border-white/10 rounded px-4 py-1 text-xl font-black outline-none cursor-pointer italic hover:border-[#f44f02]/50 transition-colors">
                                  <option value="POLY One" className="normal-case bg-[#111112] text-white">POLY One</option>
                                  <option value="POLY Two S" className="normal-case bg-[#111112] text-white">POLY Two S</option>
                                </select>
                                <ChevronRight className="w-6 h-6 text-zinc-800" strokeWidth={5} />
                                <select value={action.item} onChange={(e) => updateAction(flow.id, action.id, { item: e.target.value, value: e.target.value === 'Servo' ? 90 : '#f44f02' })} className="bg-[#111112] border-2 border-white/10 rounded px-4 py-1 text-xl font-black text-[#f44f02] outline-none cursor-pointer italic hover:border-[#f44f02]/50 transition-colors">
                                  {NODES[action.nodeId as keyof typeof NODES].outputs.map(out => <option key={out} value={out} className="bg-[#111112] text-white">{out}</option>)}
                                </select>
                             </div>
                          </div>
                          <div className="flex items-center gap-6">
                             <div className="flex items-center gap-3 bg-zinc-900 border border-white/5 px-4 py-2 rounded-lg">
                                <Clock className="w-3 h-3 text-zinc-600" />
                                <span className="text-[10px] font-black text-zinc-500 tracking-widest">Wait</span>
                                <input type="number" step="0.1" min="0" value={action.delay} onChange={(e) => updateAction(flow.id, action.id, { delay: parseFloat(e.target.value) })} className="bg-transparent border-none text-white font-black w-10 text-xs focus:ring-0" />
                                <span className="text-[9px] font-black text-zinc-700">Sec</span>
                             </div>

                             {flow.actions.length > 1 && (
                               <button 
                                 onClick={() => removeActionFromFlow(flow.id, action.id)} 
                                 className="p-2 text-white/10 hover:text-rose-600 transition-all border border-white/5 hover:border-rose-600/30 rounded-lg bg-white/5"
                               >
                                 <Trash className="w-4 h-4" strokeWidth={1.5} />
                               </button>
                             )}
                          </div>
                        </div>

                        <div className="bg-black/60 border border-white/5 rounded-lg p-6 flex items-center justify-between shadow-inner">
                           <div className="flex-1 flex items-center gap-12">
                              {action.item === 'Servo' ? (
                                <div className="w-full flex items-center gap-12">
                                   <input type="range" min="0" max="180" value={action.value} onChange={(e) => updateAction(flow.id, action.id, { value: parseInt(e.target.value) })} className="flex-1 accent-[#f44f02] h-2 bg-zinc-900 rounded-full" />
                                   <div className="min-w-[100px] text-right"><span className="text-4xl font-black text-[#f44f02] italic leading-none">{action.value}°</span></div>
                                </div>
                              ) : (
                                <div className="flex gap-6 w-full justify-center">
                                  {COLORS.map(c => <button key={c.name} onClick={() => updateAction(flow.id, action.id, { value: c.hex })} className={`w-12 h-12 rounded transition-all border-4 ${action.value === c.hex ? 'border-white scale-110 shadow-[0_0_30px_rgba(244,79,2,0.4)]' : 'border-transparent opacity-20 hover:opacity-100'}`} style={{ backgroundColor: c.hex }} />)}
                                </div>
                              )}
                           </div>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addActionToFlow(flow.id)} className="w-full border-2 border-dashed border-white/10 hover:border-[#f44f02]/30 py-6 rounded-xl flex items-center justify-center gap-4 group transition-all text-white">
                      <PlusCircle className="w-6 h-6 text-zinc-800 group-hover:text-[#f44f02]" />
                      <span className="text-xs font-black text-zinc-700 group-hover:text-white transition-colors tracking-tight text-center">Add another action</span>
                    </button>
                  </div>
                </motion.div>
              ))}
          </div>
        </main>
      </div>

      <footer className="h-16 bg-[#0D0D0D] border-t-2 border-white/5 flex items-center px-12 gap-10 shrink-0 overflow-hidden relative">
         <div className="flex items-center gap-3 shrink-0">
            <Terminal className="w-4 h-4 text-[#f44f02]" />
            <span className="text-[10px] font-black tracking-widest text-zinc-600">Live output feed:</span>
         </div>
         <div className="flex-1 flex gap-6 overflow-hidden">
            <AnimatePresence initial={false}>
              {mqttLogs.map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1 - (i * 0.2), y: 0 }} className="font-mono text-[10px] text-[#f44f02] whitespace-nowrap border-r border-white/5 pr-6 italic tracking-tighter">
                  {log}
                </motion.div>
              ))}
              {mqttLogs.length === 0 && <span className="text-zinc-800 text-[10px] italic tracking-widest">Monitoring mesh loop...</span>}
            </AnimatePresence>
         </div>
         <div className="shrink-0 flex items-center gap-4">
            <span className="text-xl font-black italic tracking-tighter text-[#f44f02]">POLY</span>
         </div>
      </footer>
    </div>
  );
};

export default ConnectAndCode;