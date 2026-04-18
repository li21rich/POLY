import React, { useRef, useState, useEffect } from "react";

interface Panel {
  image: string;
  link: string;
  stack?: string[];
}

interface PanelCarouselProps {
  panels: Panel[];
  radius?: number;
  panelWidth?: number;
  panelHeight?: number;
  className?: string;
}

const DRAG_THRESHOLD = 5;

const PanelCarousel: React.FC<PanelCarouselProps> = ({
  panels,
  radius = 315,
  panelWidth = 300 * 1.18,
  panelHeight = 200 * 1.18,
  className = "",
}) => {
  const [rotationY, setRotationY] = useState(0);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFlattened, setIsFlattened] = useState(false);

  const startX = useRef(0);
  const lastX = useRef(0);
  const currentRotation = useRef(0);
  const mouseIsDown = useRef(false);
  const didSpin = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Responsive sizing
  const baseRadius = isMobile ? isFlattened ? 260 : Math.min(radius * 0.6, 200) : radius;
  const responsiveRadius = isFlattened ? baseRadius * 0.6 : baseRadius;
  const responsivePanelWidth = isMobile
    ? isFlattened ? 300 : Math.min(panelWidth, 224)
    : panelWidth;
  const responsivePanelHeight = isMobile
    ? isFlattened ? 200 : Math.min(panelHeight, 150)
    : panelHeight;

  // --- Mouse Drag Handling ---
  const onMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    lastX.current = e.clientX;
    didSpin.current = false;
    mouseIsDown.current = true;
  };

  const onMouseMoveGlobal = (e: MouseEvent) => {
    if (!isDragging && containerRef.current && !isMobile) {
      const rect = containerRef.current.getBoundingClientRect();
      const offsetX = (e.clientX - rect.left - rect.width / 2) / rect.width;
      const offsetY = (e.clientY - rect.top - rect.height / 2) / rect.height;
      setTiltY(offsetX * 17);
      setTiltX(-offsetY * 17);
    }

    if (!mouseIsDown.current) return;

    const dx = e.clientX - startX.current;
    if (!isDragging && Math.abs(dx) >= DRAG_THRESHOLD) {
      setIsDragging(true);
      setHoveredIndex(null);
    }

    if (isDragging) {
      const deltaX = e.clientX - lastX.current;
      lastX.current = e.clientX;
      const newRot = currentRotation.current + deltaX * 0.34;
      currentRotation.current = newRot;
      setRotationY(newRot);
      didSpin.current = true;
    }
  };

  const onMouseUpGlobal = () => {
    setIsDragging(false);
    mouseIsDown.current = false;
    currentRotation.current = rotationY;
  };

  // --- Touch Handling ---
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    lastX.current = touch.clientX;
    didSpin.current = false;
    mouseIsDown.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!mouseIsDown.current) return;
    const touch = e.touches[0];

    const dx = touch.clientX - startX.current;
    if (!isDragging && Math.abs(dx) >= DRAG_THRESHOLD) {
      setIsDragging(true);
      setHoveredIndex(null);
    }

    if (isDragging) {
      const deltaX = touch.clientX - lastX.current;
      lastX.current = touch.clientX;
      const newRot = currentRotation.current + deltaX * 0.34;
      currentRotation.current = newRot;
      setRotationY(newRot);
      didSpin.current = true;
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    mouseIsDown.current = false;
    currentRotation.current = rotationY;
  };

  const onWheel = (e: WheelEvent) => {
    if (!containerRef.current) return;
    const delta =
      Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 1) return;
    e.preventDefault();
    const newRot = currentRotation.current + delta * -0.24;
    currentRotation.current = newRot;
    setRotationY(newRot);
    didSpin.current = true;
  };

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMoveGlobal);
    window.addEventListener("mouseup", onMouseUpGlobal);
    const el = containerRef.current;
    if (el) el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("mousemove", onMouseMoveGlobal);
      window.removeEventListener("mouseup", onMouseUpGlobal);
      if (el) el.removeEventListener("wheel", onWheel);
    };
  }, [isDragging, rotationY, isMobile]);

  // --- Click / Hover ---
  const handlePanelClick = (e: React.MouseEvent, link: string) => {
    if (didSpin.current) {
      e.preventDefault();
      return;
    }
    console.log("Navigating to:", link);
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div
        style={{
          position: "absolute",
          top: "-190px",
          left: isMobile ? "96px" : "224px",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          backgroundColor: "rgba(0, 0, 0, 0.05)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          padding: "4px",
          border: "1px solid rgba(0,0,0,0.1)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          pointerEvents: "auto",
        }}
      >
        {/* The Sliding Background */}
        <div
          style={{
            position: "absolute",
            left: "4px",
            top: "4px",
            bottom: "4px",
            width: "calc(50% - 4px)",
            backgroundColor: "#FF4A08",
            borderRadius: "16px",
            transform: isFlattened ? "translateX(100%)" : "translateX(0)",
            transition: "transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
            boxShadow: "0 2px 5px rgba(255, 74, 8, 0.3)",
          }}
        />

        {/* Carousel Button */}
        <button
          onClick={() => setIsFlattened(false)}
          style={{
            position: "relative",
            padding: "7px",
            fontSize: "16px",
            fontWeight: !isFlattened ? "600" : "400",
            color: !isFlattened ? "#000000" : "#FF4A08",
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 1,
            transition: "color 0.3s",
            width: "83px",
            display: "none",
          }}
        >
          carousel
        </button>

        {/* Flipbook Button */}
        <button
          onClick={() => setIsFlattened(true)}
          style={{
            position: "relative",
            padding: "7px",
            fontSize: "16px",
            fontWeight: !isFlattened ? "400" : "600",
            color: isFlattened ? "#000000" : "#FF4A08",
            background: "none",
            border: "none",
            cursor: "pointer",
            zIndex: 1,
            transition: "color 0.3s",
            width: "83px",
            display: "none",
          }}
        >
          flipbook
        </button>
      </div>

      <div
        ref={containerRef}
        className={className}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDragStart={(e) => e.preventDefault()}
        style={{
          width: "100%",
          height: `${responsivePanelHeight + 100}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          perspective: isMobile ? "800px" : "1200px",
          overflow: "visible",
          cursor: isDragging ? "grabbing" : "grab",
          pointerEvents: "none",
          touchAction: "none",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
            // UPDATED TRANSFORM HERE:
            transform: `${isMobile && isFlattened ? "translateX(-40%)" : ""
              } rotateX(${tiltX}deg) rotateY(${rotationY + tiltY}deg)`,
            transition: isDragging ? "none" : "transform 0.5s ease-out",
            zIndex: 10,
            pointerEvents: "none",
          }}
        >
          {panels.map((panel, index) => {
            const angle = (360 / panels.length) * index;
            const isHovered = hoveredIndex === index;
            const panelRotation = isFlattened ? -90 : 0;

            return (
              <a
                key={index}
                href={panel.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => handlePanelClick(e, panel.link)}
                onMouseEnter={() =>
                  !isDragging && !isMobile && setHoveredIndex(index)
                }
                onMouseLeave={() => setHoveredIndex(null)}
                draggable={false}
                style={{
                  position: "absolute",
                  width: responsivePanelWidth,
                  height: responsivePanelHeight,
                  left: "50%",
                  top: "50%",
                  transformStyle: "preserve-3d",
                  transform: `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${responsiveRadius}px) rotateY(${panelRotation}deg)`,
                  borderRadius: isMobile ? 6 : 10,
                  display: "block",
                  backfaceVisibility: "visible",
                  cursor: "pointer",
                  transition:
                    "transform 0.6s ease-in-out, box-shadow 0.2s ease",
                  pointerEvents: "auto",
                  backgroundColor: "rgba(255,255,255,0.01)",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(255, 74, 8, 0.6)",
                    backgroundImage: `url(${panel.image})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "left",
                    display: "flex",
                    alignItems: "flex-start",
                    borderRadius: isMobile ? 6 : 10,
                    pointerEvents: "none",
                    opacity: isHovered ? 1 : 0.73,
                    transition: "opacity 0.2s ease",
                  }}
                >
                  {/* Tech Stack Icons */}
                  {panel.stack && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        zIndex: 2,
                        marginLeft: isMobile
                          ? isFlattened ? "273px" : "203px"
                          : "322px", // offset
                        marginTop: isMobile ? "4px" : "7px",
                      }}
                    >
                      {panel.stack.map((iconUrl, i) => (
                        <img
                          key={i}
                          src={iconUrl}
                          alt="tech-icon"
                          style={{
                            width: isMobile ? "18px" : "26px",
                            height: isMobile ? "18px" : "26px",
                            objectFit: "contain",
                            filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.3))",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PanelCarousel;