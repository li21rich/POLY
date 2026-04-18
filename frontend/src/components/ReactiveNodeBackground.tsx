import React, { useRef, useEffect } from "react";

interface NodeBackgroundProps {
  baseNodeCount?: number;
  cursorEdgeDistance?: number;
  gravityStrength?: number; // How strongly mouse pulls
  nodeColor?: string;
  cursorEdgeColor?: string;
  layers?: number;
}

interface Node {
  x: number;
  y: number;
  vx: number; // Interactive Velocity (Mouse push/pull)
  vy: number;
  driftVx: number; // Constant drifting velocity
  driftVy: number;
  layer: number;
  twinklePhase: number; // For the sine wave
  twinkleSpeed: number; // How fast it twinkles
}

function hexToRgb(hex: string) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return [255, 111, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

const ReactiveNodeBackground: React.FC<NodeBackgroundProps> = ({
  baseNodeCount = 50,
  cursorEdgeDistance = 190,
  gravityStrength = 0.24,
  nodeColor = "#FF6F00",
  cursorEdgeColor = "rgba(255,111,0,0.5)",
  layers = 7,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number | null>(null);
  const scrollYRef = useRef(0);
  const timeRef = useRef(0); // Keeps track of time for twinkle math

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const initNodes = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Density: 1 node per 2000 pixels roughly
      const area = window.innerWidth * window.innerHeight;
      const calculatedCount = Math.floor(area / 2000);

      nodesRef.current = Array.from({ length: calculatedCount }, () => {
        // Random drift direction between -0.2 and 0.2
        const driftSpeed = 0.25;
        return {
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            vx: 0,
            vy: 0,
            driftVx: (Math.random() - 0.5) * driftSpeed,
            driftVy: (Math.random() - 0.5) * driftSpeed,
            layer: Math.floor(Math.random() * layers),
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: 0.02 + Math.random() * 0.09,
        };
      });
    };

    initNodes();
    window.addEventListener("resize", initNodes);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cursor = cursorRef.current;
      const scrollOffset = scrollYRef.current;
      const [r, g, b] = hexToRgb(nodeColor);
      
      // Increment time for sine wave calculations
      timeRef.current += 1; 

      nodesRef.current.forEach((n) => {
        const depthFactor = Math.pow(n.layer / (layers - 1), 1.9) * 0.2 + 0.01;
        let py = n.y - scrollOffset * depthFactor;

        // --- 1. RECYCLING (Wrap around screen) ---
        if (n.x < -50) n.x = canvas.width + 50;
        if (n.x > canvas.width + 50) n.x = -50;
        
        if (py < -50) {
          n.y += canvas.height + 100;
          py += canvas.height + 100;
        } else if (py > canvas.height + 50) {
          n.y -= canvas.height + 100;
          py -= canvas.height + 100;
        }

        // --- 2. PHYSICS ---
        
        // Mouse Interaction
        if (cursor) {
          const dx = cursor.x - n.x;
          const dy = cursor.y - py;
          const dist = Math.hypot(dx, dy);
          const minDist = 66; // Personal space radius

          if (dist < minDist) {
            // Strong Repel if too close
            const repel = (minDist - dist) * 0.008;
            n.vx -= (dx / dist) * repel;
            n.vy -= (dy / dist) * repel;
          } else if (dist < cursorEdgeDistance) {
            // Gentle Attract if within range
            const force = (gravityStrength * (1 - dist / cursorEdgeDistance)) / dist;
            n.vx += dx * force;
            n.vy += dy * force;
          }
        }

        // Apply friction to the interactive velocity only
        n.vx *= 0.93;
        n.vy *= 0.93;

        // Apply velocities   
        // We add driftVx to keep them moving when not interacted with
        n.x += n.vx + n.driftVx;
        n.y += n.vy + n.driftVy;

        // Brownian Motion
        if (Math.random() < 0.01) {
             n.driftVx += (Math.random() - 0.5) * 0.08;
             n.driftVy += (Math.random() - 0.5) * 0.08;
             // Clamp drift so they don't get too fast
             const maxDrift = 1;
             n.driftVx = Math.max(-maxDrift, Math.min(maxDrift, n.driftVx));
             n.driftVy = Math.max(-maxDrift, Math.min(maxDrift, n.driftVy));
        }

        const drawY = n.y - scrollOffset * depthFactor;

        // --- 3. DRAWING ---
        if (drawY > -50 && drawY < canvas.height + 50) {
            
            // TWINKLE LOGIC
            // Base opacity + Sine wave fluctuation
            const baseAlpha = 0.3 + 0.7 * (n.layer / (layers - 1));
            const dynamicAlpha = baseAlpha + 0.05 * Math.sin(timeRef.current * n.twinkleSpeed + n.twinklePhase);

            ctx.fillStyle = `rgba(${r},${g},${b},${dynamicAlpha})`;
            ctx.beginPath();
            ctx.arc(n.x, drawY, 1, 0, Math.PI * 2);
            ctx.fill();

            // Connect lines to cursor
            if (cursor) {
                const dx = cursor.x - n.x;
                const dy = cursor.y - drawY;
                const dist = Math.hypot(dx, dy);

                if (dist < cursorEdgeDistance) {
                    const opacity = 1 - dist / cursorEdgeDistance;
                    // Lines are fainter than dots
                    ctx.strokeStyle = cursorEdgeColor.replace(
                        /[\d.]+\)$/,
                        `${opacity * 0.4})`
                    );
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.moveTo(cursor.x, cursor.y);
                    ctx.lineTo(n.x, drawY);
                    ctx.stroke();
                }
            }
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", initNodes);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [baseNodeCount, cursorEdgeDistance, gravityStrength, nodeColor, cursorEdgeColor, layers]);

  // Input Handling (Mouse/Touch)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
    };
    
    const onTouchMove = (e: TouchEvent) => {
        if(e.touches.length > 0) {
            cursorRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const onTouchEnd = () => {
        cursorRef.current = null;
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);
    
    return () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  useEffect(() => {
    const scroll = () => (scrollYRef.current = window.scrollY);
    window.addEventListener("scroll", scroll);
    return () => window.removeEventListener("scroll", scroll);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
};

export default ReactiveNodeBackground;