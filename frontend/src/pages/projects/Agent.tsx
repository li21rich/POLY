import CmdPanel from "../../components/CmdPanel";
import ReactiveNodeBackground from "../../components/ReactiveNodeBackground";
import SlideIn from "../../components/SlideIn";

const Agent = () => {
  return (
    <div className="w-full max-w-full overflow-x-clip">
      <ReactiveNodeBackground />
      <SlideIn direction="top" delay={200} duration={1600} className="z-10 relative">
        <div className="relative z-10 p-4 sm:p-8 ml-4 sm:ml-32 mt-8 sm:mt-16 text-primary-reddish">         
          <h1 className="text-4xl font-bold mb-8">Here’s what I’m working on.</h1>
          <div className="text-[18px] max-w-[700px] w-full mb-4 leading-relaxed">            
            <a href="https://github.com/li21rich/Agent"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline underline-offset-4 hover:opacity-80">Agent</a> is a fully agentic AI desktop app that completes any complex task across the OS using a lightweight, cloud-native inference stack. No local GPU weights required.
            <div className="my-4" />
            Much like a lightweight, totally portable Omnitool/Gemini Computer Use implementation that is deployed directly onto your own OS, Agent uses computer vision to "see" the screen, an LLM to plan actions, and a low-level driver to simulate human-like mouse and keyboard input.
            <div className="my-4" />
            Built with Python, PyTorch, and Hugging Face. Previously, it used a
            <a
              href="https://github.com/li21rich/omniparser-api-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:opacity-80"
            >
              {" "}self-hosted Microsoft OmniParser API
            </a>{" "}deployed on Fly.io GPUs for GUI object detection and Gemini (via OpenRouter) for MLLM and LLM embeddings. For public use, I replaced my custom APIs with a Replicate implementation.
          </div>
          <CmdPanel />
          <div className="mb-94" />
        </div>
      </SlideIn>
    </div>
  );
};

export default Agent;
