import React, { useState, useEffect } from 'react';

const Cursor: React.FC = () => {
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isMobile = window.matchMedia('(pointer: coarse)').matches;
  const [showCursor, setShowCursor] = useState(!isMobile);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        ['INPUT', 'BUTTON', 'TEXTAREA', 'A'].includes(target.tagName) ||
        target.classList.contains('cursor-should-hover')
      ) {
        setHovered(true);
      }
    };

    const handleMouseLeave = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        ['INPUT', 'BUTTON', 'TEXTAREA', 'A'].includes(target.tagName) ||
        target.classList.contains('cursor-should-hover')
      ) {
        setHovered(false);
      }
    };

    // 🔥 NEW: hover broadcast handlers
    const hoverOn = () => setHovered(true);
    const hoverOff = () => setHovered(false);

    const handleClick = () => {
      setShowCursor(true);
      setClicked(true);
      setTimeout(() => {
        setClicked(false);
        if (isMobile) setShowCursor(false);
      }, 300);
    };

    window.addEventListener('mousemove', moveCursor);
    document.body.addEventListener('mouseenter', handleMouseEnter, true);
    document.body.addEventListener('mouseleave', handleMouseLeave, true);
    document.body.addEventListener('mousedown', handleClick, true);

    // 🔥 listen globally
    window.addEventListener('hover-broadcast-on', hoverOn);
    window.addEventListener('hover-broadcast-off', hoverOff);

    // center on load
    setPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    handleClick();

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      document.body.removeEventListener('mouseenter', handleMouseEnter, true);
      document.body.removeEventListener('mouseleave', handleMouseLeave, true);
      document.body.removeEventListener('mousedown', handleClick, true);
      window.removeEventListener('hover-broadcast-on', hoverOn);
      window.removeEventListener('hover-broadcast-off', hoverOff);
    };
  }, []);

  const cursorStyle: React.CSSProperties = {
    width: clicked ? '70px' : hovered ? '16px' : '26px',
    height: clicked ? '70px' : hovered ? '16px' : '26px',
    border: clicked
      ? '1px solid white'
      : hovered
      ? '3px solid white'
      : '2px solid #FF6F00',
    backgroundColor: clicked
      ? 'transparent'
      : hovered
      ? 'rgba(255, 255, 255, 0.18)'
      : 'rgba(255, 111, 0, 0.18)',
    opacity: clicked ? 0.1 : 1,
    borderRadius: '50%',
    position: 'fixed',
    top: 0,
    left: 0,
    transform: `translate(-50%, -50%) translate3d(${position.x}px, ${position.y}px, 0)`,
    pointerEvents: 'none',
    zIndex: 9999,
    transition:
      'width 0.2s ease, height 0.2s ease, border-color 0.2s ease, opacity 0.2s ease, border-width 0.2s ease',
    visibility: isMobile ? (showCursor ? 'visible' : 'hidden') : 'visible',
  };

  return <div className="cursorcircle" style={cursorStyle} />;
};

export default Cursor;
