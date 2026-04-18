import React from "react";
import { useNavigate } from "react-router-dom";

interface ArrowButtonProps {
  label: string;
  to: string;             // can be internal route ("/about") or external URL ("https://...")
  color?: string;         // optional, defaults to orange
  textcolor?: string;     // optional, defaults to black
  scrollToId?: string;    // scrolls downward
}

const ArrowButton: React.FC<ArrowButtonProps> = ({
  label,
  to,
  color = "#ff4a08",
  textcolor = "#ff4a08",
  scrollToId = null,
}) => {
  const navigate = useNavigate();

  const handleInternalClick = () => {
    if (window.location.pathname !== to) {
      navigate(to);
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }, 0);
    }
    
    if (scrollToId) {
      setTimeout(() => {
        const el = document.getElementById(scrollToId);
        if (el) {
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.pageYOffset,
            left: 0,
            behavior: "smooth",
          });
        }
      }, 250);
    }
  };

const ButtonContent = (
    <div className="z-15 mb-1 relative inline-flex items-center">
      <div
        className="absolute left-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ease-out group-hover:w-full overflow-hidden bg-transparent"
        style={{ borderColor: color }}
      >
        <span
          className="absolute -inset-px opacity-0 transition-all duration-300 ease-out rounded-full group-hover:opacity-100"
          style={{ backgroundColor: color }}
        ></span>
        <svg
          className="absolute ml-[0.8px] z-10 w-4 h-4 transition-all duration-300 group-hover:text-black"
          style={{ color }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
      <span className="relative z-10 mx-[3rem] font-normal text-[18px] mr-12">
        {label}
      </span>
    </div>
  );

  return (
    <div className="pt-4">
      {to.startsWith("http") ? (
        <a
          href={to}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex font-poppins font-normal hover:!text-black transition-colors duration-300"
          style={{ color: textcolor }}
        >
          {ButtonContent}
        </a>
      ) : (
        <button
          onClick={handleInternalClick}
          className="group relative inline-flex font-poppins font-normal hover:!text-black transition-colors duration-300"
          style={{ color: textcolor }}
        >
          {ButtonContent}
        </button>
      )}
    </div>
  );
};

export default ArrowButton;
