import { useEffect, useState } from "react";

const PROMPT_TEXT = "Enter a task for Agent:   ";
const USER_COMMAND = "subscribe to github on yt";

const SYSTEM_LOGS = [
  { text: "", delay: 400 },
  { text: "# Press 'Alt + A' at any time to force quit.", delay: 100 },
  { text: "# Conducting first screen read...", delay: 600 },
  { text: "# Screenshot taken...", delay: 400 },
  { text: "# Starting screen read...", delay: 400 },
  { text: "# [0/3] Sending to OmniParser (Size: (1200, 750))...", delay: 400 },
  { text: "# [1/3] Omniparser API Response Received: 2.8619s", delay: 2860 },
  { text: "# [2/3] Parsed_lists: 0.0053s", delay: 10 },
  { text: "# [3/3] Gemini captioning: 2.7741s", delay: 2770 },
  { text: "# Total screen read time: 5.6413s", delay: 100 },
  { text: "", delay: 100 },
  { text: "Step 1", delay: 600 },
  { text: "Thought: The current screen shows the code editor with `main.py` open.", delay: 400 },
  { text: "Action: key_hotkey", delay: 500 },
  { text: "Args: {'ks': ['alt', 'tab']}", delay: 200 },
];

export default function CmdPanel() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    // 1. Define a local flag specific to THIS run of the effect
    let isMounted = true;

    const runSequence = async () => {
      // Check flag before starting
      if (!isMounted) return;
      
      // Initial delay
      await new Promise((r) => setTimeout(r, 2000));
      if (!isMounted) return;

      // --- Sequence Start ---
      setLines([PROMPT_TEXT]);

      // Typewriter Effect
      let currentInput = "";
      for (let i = 0; i < USER_COMMAND.length; i++) {
        if (!isMounted) return; // Check flag inside loops
        
        const typingDelay = Math.random() * 60 + 30;
        await new Promise((r) => setTimeout(r, typingDelay));

        currentInput += USER_COMMAND[i];
        setLines([PROMPT_TEXT + currentInput]);
      }

      // Pause before logs
      await new Promise((r) => setTimeout(r, 800));
      if (!isMounted) return;

      // Process Logs
      for (const log of SYSTEM_LOGS) {
        if (!isMounted) return; // Check flag inside loops
        await new Promise((r) => setTimeout(r, log.delay));
        
        // Use functional state update to safely append
        setLines((prev) => (log.text ? [...prev, log.text] : prev));
      }

      // Wait and Restart
      await new Promise((r) => setTimeout(r, 4000));
      if (isMounted) {
        runSequence();
      }
    };

    runSequence();

    // 2. Cleanup function kills ONLY this specific run
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="mt-12 max-w-[720px] rounded-xl bg-black/80 border border-primary-reddish/20 p-4 font-mono text-sm text-primary-reddish shadow-lg backdrop-blur min-h-[400px]">
      {lines.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap leading-relaxed">
          {l}
        </div>
      ))}
      <span className="strong-pulse">▍</span>
    </div>
  );
}