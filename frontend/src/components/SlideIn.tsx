import React, { useState, useEffect, useRef } from 'react';

interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  delay?: number;
  duration?: number;
  className?: string;
}

const SlideIn: React.FC<SlideInProps> = ({ 
  children, 
  direction = 'left', 
  delay = 0, 
  duration = 500, 
  className = '',
}) => {
  const [startAnimation, setStartAnimation] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
        ([entry]) => { // destructured
        if (entry.isIntersecting) {
            setStartAnimation(true);
        }
        },
        { threshold: 0.1 }
    );

    if (containerRef.current) {
        observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
    }, []);


  const getSlideStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      transition: `transform ${duration}ms ease-out ${delay}ms, opacity ${duration}ms ease-out ${delay}ms`,
      opacity: startAnimation ? 1 : 0,
    };

    switch (direction) {
      case 'left':
        return { ...baseStyles, transform: `translateX(${startAnimation ? '0' : '-200px'})` };
      case 'right':
        return { ...baseStyles, transform: `translateX(${startAnimation ? '0' : '200px'})` };
      case 'top':
        return { ...baseStyles, transform: `translateY(${startAnimation ? '0' : '-70px'})` };
      case 'bottom':
        return { ...baseStyles, transform: `translateY(${startAnimation ? '0' : '70px'})` };
      default:
        return baseStyles;
    }
  };

  return (
    <div ref={containerRef} className={className} style={getSlideStyles()}>
      {children}
    </div>
  );
};

export default SlideIn;