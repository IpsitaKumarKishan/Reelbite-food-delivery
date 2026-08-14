import { useRef, useEffect } from 'react';

/**
 * Custom hook that creates a magnetic cursor attraction effect for buttons / interactive elements.
 * @param {number} strength - Factor of magnetic pull (default: 0.35)
 * @param {number} maxDistance - Maximum pixel offset (default: 25)
 */
export default function useMagnetic(strength = 0.35, maxDistance = 25) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let rafId = null;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const animate = () => {
      currentX += (targetX - currentX) * 0.15;
      currentY += (targetY - currentY) * 0.15;

      el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        rafId = requestAnimationFrame(animate);
      } else {
        el.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
        rafId = null;
      }
    };

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * strength;
      const deltaY = (e.clientY - centerY) * strength;

      // Clamp offset within max distance
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        targetX = Math.cos(angle) * maxDistance;
        targetY = Math.sin(angle) * maxDistance;
      } else {
        targetX = deltaX;
        targetY = deltaY;
      }

      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    };

    const handleMouseLeave = () => {
      targetX = 0;
      targetY = 0;
      if (!rafId) {
        rafId = requestAnimationFrame(animate);
      }
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
      if (el) el.style.transform = '';
    };
  }, [strength, maxDistance]);

  return ref;
}
