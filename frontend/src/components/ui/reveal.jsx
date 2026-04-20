import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return true;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
};

export function Reveal({
  as = 'div',
  className,
  children,
  delay = 0,
  threshold = 0.16,
  distance = 16,
  once = true,
  style,
  ...props
}) {
  const Element = as;
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(() => prefersReducedMotion() || typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (isVisible || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const node = ref.current;
    if (!node) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            if (once) observer.unobserve(entry.target);
            return;
          }

          if (!once) {
            setIsVisible(false);
          }
        });
      },
      {
        threshold,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, once, threshold]);

  return (
    <Element
      ref={ref}
      className={cn('reveal-block', isVisible && 'is-visible', className)}
      style={{
        '--reveal-delay': `${delay}ms`,
        '--reveal-distance': `${distance}px`,
        ...style,
      }}
      {...props}
    >
      {children}
    </Element>
  );
}
