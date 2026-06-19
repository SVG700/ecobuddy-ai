'use client';

import React, { useEffect, useRef } from 'react';
import { animate, useMotionValue } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  duration?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  duration = 1.0,
}) => {
  const count = useMotionValue(0);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Animate count to target value
    const controls = animate(count, value, {
      duration: duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        if (elementRef.current) {
          elementRef.current.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
        }
      }
    });
    
    return () => controls.stop();
  }, [value, count, decimals, prefix, suffix, duration]);

  return (
    <span ref={elementRef} className={className}>
      {prefix}{value.toFixed(decimals)}{suffix}
    </span>
  );
};

export default AnimatedCounter;
