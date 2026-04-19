import PanelCarousel from "../components/PanelCarousel";
import SlideIn from "../components/SlideIn";
import ReactiveNodeBackground from "../components/ReactiveNodeBackground";
import { PORTFOLIO_PROJECTS } from "../constants/DivConstants";
import { useRef } from "react";

const Home = () => {
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToCarousel = () => {
    const el = carouselRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 300;
    window.scrollTo({ top, behavior: "smooth" });
  };
  return (
    <div className="w-full max-w-full overflow-x-clip">
      <ReactiveNodeBackground />
      <SlideIn direction="top" delay={200} duration={2000} className="z-10 relative">
        <div className="relative ml-32 text-primary-reddish">
          <h1 className="text-[300px] font-bold italic" style={{ fontFamily: 'Roboto, sans-serif' }}>
          POLY
        </h1>
          <p className="text-[25px] text-right mr-48">
            <span className="font-bold text-[35px]"> engineering for everyone</span>
            <br />(even your grandpa)
          </p>
        </div>
      </SlideIn>

      {/* Scroll-down button */}
      <div className="z-10 relative flex justify-center mt-36 mb-0">
        <button
          onClick={scrollToCarousel}
          aria-label="Scroll to projects"
          className="group flex flex-col items-center gap-2 text-white opacity-70 hover:opacity-100 transition-opacity duration-300"
        >
          <span className="mt-12 text-sm tracking-widest uppercase font-bold">products</span>
          <div className="w-10 h-10 border-0 border-white rounded-full flex items-center justify-center animate-bounce group-hover:animate-none group-hover:scale-110 transition-transform duration-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </div>
        </button>
      </div>

      <SlideIn direction="bottom" delay={100} duration={2500}>
        <div id="products" ref={carouselRef}>
          <PanelCarousel panels={PORTFOLIO_PROJECTS} className="my-90 overflow-auto" />
        </div>
      </SlideIn>
      <div className="w-full h-[450px]" />
    </div>
  );
};

export default Home;