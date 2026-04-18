import React, { useRef, useState, useEffect } from "react";

interface Panel {
  title: string;
  image: string;
  stack?: string[];
  unreleased?: boolean;
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
  radius = 355,
  panelWidth = 250 * 1.18,
  panelHeight = 200 * 1.18,
  className = "",
}) => {
  const [rotationY, setRotationY] = useState(0);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isFlattened] = useState(false);

  const startX = useRef(0);
  const lastX = useRef(0);
  const currentRotation = useRef(0);
  const mouseIsDown = useRef(false);
  const didSpin = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const baseRadius = isMobile ? (isFlattened ? 260 : Math.min(radius * 0.6, 200)) : radius;
  const responsiveRadius = isFlattened ? baseRadius * 0.6 : baseRadius;
  const responsivePanelWidth = isMobile ? (isFlattened ? 300 : Math.min(panelWidth, 224)) : panelWidth;
  const responsivePanelHeight = isMobile ? (isFlattened ? 200 : Math.min(panelHeight, 150)) : panelHeight;

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
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
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

  return (
    <div style={{ position: "relative", width: "100%" }}>
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
            transform: `${isMobile && isFlattened ? "translateX(-40%)" : ""} rotateX(${tiltX}deg) rotateY(${rotationY + tiltY}deg)`,
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
              <div
                key={index}
                onMouseEnter={() => !isDragging && !isMobile && setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  position: "absolute",
                  width: responsivePanelWidth,
                  height: responsivePanelHeight,
                  left: "50%",
                  top: "50%",
                  transformStyle: "preserve-3d",
                  transform: `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${responsiveRadius}px) rotateY(${panelRotation}deg)`,
                  borderRadius: isMobile ? 6 : 10,
                  backfaceVisibility: "visible",
                  transition: "transform 0.6s ease-in-out",
                  pointerEvents: "auto",
                }}
              >
                
                {/* Card face */}
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(255, 255, 255, 0)",
                    backgroundImage: `url(${panel.image})`,
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "left",
                    borderRadius: isMobile ? 6 : 10,
                    pointerEvents: "none",
                    opacity: isHovered ? 1 : 0.73,
                    transition: "opacity 0.2s ease",
                    position: "relative",
                  }}
                >
                 <div
                  style={{
                    position: "absolute",
                    top: "-36px",
                    left: "0",
                    width: "100%",
                    textAlign: "center",
                    pointerEvents: "none",
                    color: index === 0 ? "#ff4a08" : "#ffffff",
                    fontSize: index === 0 ? "28px" : "24px",
                    fontWeight: index === 0 ? 800 : 500,
                    letterSpacing: "0.07em",
                    opacity: index === 0 ? 1 : 0.85,
                  }}
                  >
                    {panel.title}
                    {panel.unreleased && (
                      <span style={{
                        fontSize: "11px",
                        fontWeight: 400,
                        letterSpacing: "0.08em",
                        color: "rgba(255,255,255,0.3)",
                        marginLeft: "8px",
                      }}>
                        (pending July)
                      </span>
                    )}
                  </div>
                  {/* Parts sidebar */}
                  {panel.stack && (
                    <div
                      style={{
                        position: "absolute",
                        right: "-138px",
                        top: "0",
                        bottom: "0",
                        width: "128px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: "7px",
                      }}
                    >
                      {panel.stack.map((part, i) => (
                        <div
                          key={i}
                          style={{
                            backgroundColor: "rgba(255, 74, 8, 0.92)",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "6px",
                            padding: "6px 12px",
                            color: "#000000",
                            fontSize: isMobile ? "9px" : "12px",
                            fontWeight: 700,
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {part}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PanelCarousel;