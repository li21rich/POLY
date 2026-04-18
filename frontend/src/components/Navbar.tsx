import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export interface NavLinkItem {
  id: string;
  title: string;
  to: string;
  scrollToId?: string;
}

interface NavbarProps {
  links: NavLinkItem[];
  sticky?: boolean;
  offsetY?: number;
}

const Navbar: React.FC<NavbarProps> = ({
  links,
  sticky = true,
  offsetY = 0,
}) => {
  const [toggle, setToggle] = useState(false);
  const navigate = useNavigate();

  const handleClick = (nav: NavLinkItem) => {
    setToggle(false);
    if (nav.scrollToId) {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById(nav.scrollToId!);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 400;
          window.scrollTo({ top, behavior: "smooth" });
        }
      }, 100);
    } else {
      window.scrollTo({ top: offsetY, behavior: "instant" });
    }
  };
return (
  <nav
    id="navbar"
    className={`font-semibold w-full flex py-3 pb-14 justify-between items-center pl-4 pr-8 ${
      sticky ? "sticky top-0 z-50" : ""
    } bg-gradient-to-b from-black/100 to-black/0 pointer-events-none`}
  >
    
    {/* LEFT BRAND */}
    <div className="flex-1 pointer-events-auto">
      <Link
        to="/"
        className="text-white  opacity-70  text-sm ml-4 lg:text-lg"
      >
        starkhacks, 2026
      </Link>
    </div>

    {/* Desktop Menu */}
    <ul className="hidden sm:flex items-center gap-8 pointer-events-auto">
      {links.map((nav) => (
        <li key={nav.id}>
          <Link
            to={nav.scrollToId ? "/" : nav.to}
            onClick={() => handleClick(nav)}
            className="font-poppins text-white  opacity-70  text-sm lg:text-lg hover:opacity-80 transition-opacity"
          >
            {nav.title}
          </Link>
        </li>
      ))}
    </ul>

    {/* Mobile Menu */}
    <div className="sm:hidden flex flex-1 justify-end items-center pointer-events-none">
        <button
          onClick={() => setToggle((prev) => !prev)}
          className="w-10 h-10 flex flex-col justify-center items-center gap-1.5 bg-primary-reddish/20 rounded-lg backdrop-blur-sm z-50 pointer-events-auto"
          aria-label="Toggle menu"
        >
          <span className={`w-6 h-0.5 bg-primary-reddish transition-transform duration-300 ${toggle ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`w-6 h-0.5 bg-primary-reddish transition-opacity duration-300 ${toggle ? "opacity-0" : ""}`} />
          <span className={`w-6 h-0.5 bg-primary-reddish transition-transform duration-300 ${toggle ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>

        <div className={`${toggle ? "flex" : "hidden"} absolute top-16 right-4 p-6 rounded-lg flex-col gap-4 min-w-[200px] backdrop-blur-sm pointer-events-auto`}>
          {links.map((nav) => (
            <Link
              key={nav.id}
              to={nav.scrollToId ? "/" : nav.to}
              onClick={() => handleClick(nav)}
              className="font-poppins text-primary-reddish text-base hover:opacity-80 transition-opacity"
            >
              {nav.title}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;