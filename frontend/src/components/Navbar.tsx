import React, { useState } from "react";
import { Link } from "react-router-dom";

export interface NavLinkItem {
  id: string;
  title: string;
  to: string;
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

  const handleScrollToTop = () => {
    window.scrollTo({ top: offsetY, behavior: "instant" });
    setToggle(false);
  };

  return (
    <nav
      id="navbar"
      className={`font-semibold w-full flex py-3 pb-14 justify-between items-center pl-4 pr-8 ${
        sticky ? "sticky top-0 z-50" : ""
      } bg-gradient-to-b from-black/100 to-black/0 pointer-events-none`} // Disable events for the gradient
    >
      {/* Desktop Menu */}
      <ul className="hidden sm:flex items-center flex-1 justify-end gap-8 pointer-events-auto"> {/* Re-enable for links */}
        {links.map((nav) => (
          <li key={nav.id}>
            <Link
              to={nav.to}
              onClick={handleScrollToTop}
              className={`font-poppins text-primary-reddish text-sm lg:text-lg hover:opacity-80 transition-opacity`}
            >
              {nav.title}
            </Link>
          </li>
        ))}
      </ul>

      {/* Mobile Menu */}
      <div className="sm:hidden flex flex-1 justify-end items-center pointer-events-none">
        {/* Hamburger Button */}
        <button
          onClick={() => setToggle((prev) => !prev)}
          className="w-10 h-10 flex flex-col justify-center items-center gap-1.5 bg-primary-reddish/20 rounded-lg backdrop-blur-sm z-50 pointer-events-auto" // Re-enable for button
          aria-label="Toggle menu"
        >
          <span
            className={`w-6 h-0.5 bg-primary-reddish transition-transform duration-300 ${
              toggle ? "rotate-45 translate-y-2" : ""
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-primary-reddish transition-opacity duration-300 ${
              toggle ? "opacity-0" : ""
            }`}
          />
          <span
            className={`w-6 h-0.5 bg-primary-reddish transition-transform duration-300 ${
              toggle ? "-rotate-45 -translate-y-2" : ""
            }`}
          />
        </button>

        {/* Mobile Menu Dropdown */}
        <div
          className={`${
            toggle ? "flex" : "hidden"
          } absolute top-16 right-4 p-6 rounded-lg flex-col gap-4 min-w-[200px] backdrop-blur-sm pointer-events-auto`} // Re-enable for dropdown
        >
          {links.map((nav) => (
            <Link
              key={nav.id}
              to={nav.to}
              onClick={handleScrollToTop}
              className={`font-poppins text-primary-reddish text-base hover:opacity-80 transition-opacity`}
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