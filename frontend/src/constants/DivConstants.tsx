// Project images
import NWFImg from "../assets/nwfstrategies.png";
import AgentImg from "../assets/agent.png";
import ESP32Img from "../assets/esp32.png";
import YAMImg from "../assets/yam.png";
import TwitterScrapeImg from "../assets/twitterscrape.png";

// Tech stack icons
import PythonSvg from "../assets/python.svg";
import PyTorchSvg from "../assets/pytorch.svg";
import FlySvg from "../assets/fly.svg";
import DockerSvg from "../assets/docker.svg";
import GeminiSvg from "../assets/gemini.svg";
import HuggingFaceSvg from "../assets/huggingface.svg";
import VercelSvg from "../assets/vercel.svg";
import TailwindSvg from "../assets/tailwind.svg";
import TypescriptSvg from "../assets/typescript.svg";
import ReactSvg from "../assets/react.svg";
import ViteSvg from "../assets/vite.svg";
import ESPIDFSvg from "../assets/espidf.svg";
import CSvg from "../assets/c.svg";
import FreeRTOSSvg from "../assets/freertos.svg";
import CMakeSvg from "../assets/CMake.svg";
import NetlifySvg from "../assets/netlify.svg";
import JSSvg from "../assets/js.svg";
import SeleniumSvg from "../assets/selenium.svg";

export interface ProjectPanel {
  image: string;
  link: string;
  stack?: string[];
}

export const PORTFOLIO_PROJECTS: ProjectPanel[] = [
  {
    image: AgentImg,
    link: "/agent",
    stack: [PythonSvg, PyTorchSvg, HuggingFaceSvg, DockerSvg, FlySvg, GeminiSvg]
  },
  {
    image: NWFImg,
    link: "https://nwfstrategies.com",
    stack: [TypescriptSvg, ReactSvg, ViteSvg, TailwindSvg, VercelSvg]
  },
  {
    image: ESP32Img,
    link: "https://drive.google.com/drive/folders/1bsd-UsG1Ua-wUnwbUodg4tPk-yWUh7ul?usp=sharing",
    stack: [CSvg, ESPIDFSvg, FreeRTOSSvg, CMakeSvg, DockerSvg]
  },
  {
    image: YAMImg,
    link: "https://www.youthartmovement.org",
    stack: [JSSvg, ReactSvg, NetlifySvg]
  },
  {
    image: TwitterScrapeImg,
    link: "https://github.com/li21rich/twitterscrape",
    stack: [PythonSvg, SeleniumSvg]
  },
];