import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Agent from "./pages/projects/Agent";
import Navbar from "./components/Navbar"
import type { NavLinkItem } from "./components/Navbar";
import Cursor from "./components/Cursor";
const navLinks: NavLinkItem[] = [
];
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <div>
      <Router>
        <ScrollToTop />
        <Navbar links={navLinks}/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/agent" element={<Agent />} />
        </Routes>
        <div
          className="fixed bottom-0 left-0 w-full pb-3 py-14 pointer-events-none z-50"
          style={{
            background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          }}>
        </div>
      </Router>
      <Cursor />
    </div>
  );
};

export default App;
