import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface GravityStarsProps extends React.HTMLAttributes<HTMLDivElement> {
  starsCount?: number;
  starsSize?: number;
  starsOpacity?: number;
  glowIntensity?: number;
  movementSpeed?: number;
  mouseInfluence?: number;
  mouseGravity?: 'attract' | 'repel';
  gravityStrength?: number;
  starColor?: string;
}

export function GravityStarsBackground({
  className = '',
  starsCount = 140,
  starsSize = 1.5,
  starsOpacity = 0.75,
  glowIntensity = 9,
  movementSpeed = 0.14,
  mouseInfluence = 110,
  mouseGravity = 'attract',
  gravityStrength = 65,
  starColor = '#ffffff',
  style,
  ...rest
}: GravityStarsProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const mouse      = useRef({ x: -9999, y: -9999 });
  const starsRef   = useRef<Star[]>([]);
  const rafRef     = useRef<number>(0);

  useEffect(() => {
    const wrapper = wrapperRef.current!;
    const canvas  = canvasRef.current!;
    const ctx     = canvas.getContext('2d')!;

    // Size canvas to wrapper (not the canvas itself which has no intrinsic size)
    const setSize = () => {
      const { width, height } = wrapper.getBoundingClientRect();
      canvas.width  = Math.round(width);
      canvas.height = Math.round(height);
    };
    setSize();

    const ro = new ResizeObserver(setSize);
    ro.observe(wrapper);

    // Init stars
    const initStars = () => {
      starsRef.current = Array.from({ length: starsCount }, () => {
        const base = starsOpacity * (0.2 + Math.random() * 0.8);
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * movementSpeed,
          vy: (Math.random() - 0.5) * movementSpeed,
          // 80% tiny, 20% slightly larger for depth
          size: starsSize * (Math.random() < 0.80
            ? 0.25 + Math.random() * 0.55
            : 0.75 + Math.random() * 0.9),
          baseOpacity: base,
          opacity: base,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.35 + Math.random() * 1.1,
        };
      });
    };
    initStars();

    // Mouse events relative to wrapper
    const onMove = (e: MouseEvent | TouchEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const cy = 'touches' in e ? e.touches[0].clientY : e.clientY;
      mouse.current = { x: cx - rect.left, y: cy - rect.top };
    };
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 }; };
    wrapper.addEventListener('mousemove', onMove);
    wrapper.addEventListener('touchmove', onMove, { passive: true });
    wrapper.addEventListener('mouseleave', onLeave);

    // Parse hex colour
    const parseHex = (hex: string): [number, number, number] => {
      const c = hex.replace('#', '');
      if (c.length === 3) {
        return [parseInt(c[0]+c[0],16), parseInt(c[1]+c[1],16), parseInt(c[2]+c[2],16)];
      }
      return [parseInt(c.slice(0,2),16), parseInt(c.slice(2,4),16), parseInt(c.slice(4,6),16)];
    };
    const [r, g, b] = parseHex(starColor.startsWith('#') ? starColor : '#ffffff');

    let lastTime = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      for (const s of starsRef.current) {
        // Natural twinkle via sin breathing
        s.twinklePhase += s.twinkleSpeed * dt;
        const twinkle = 0.60 + 0.40 * Math.sin(s.twinklePhase);

        // Gravity / repel influence from mouse
        const dx   = mouse.current.x - s.x;
        const dy   = mouse.current.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouseInfluence && dist > 1) {
          const norm  = (mouseInfluence - dist) / mouseInfluence;
          const force = (gravityStrength * norm * norm) / (dist + 8);
          const dir   = mouseGravity === 'attract' ? 1 : -1;
          s.vx += (dx / dist) * force * dir * dt;
          s.vy += (dy / dist) * force * dir * dt;
        }

        // Damping
        s.vx *= 0.986;
        s.vy *= 0.986;
        s.x  += s.vx;
        s.y  += s.vy;

        // Soft wrap
        if (s.x < -2) s.x = W + 2;
        if (s.x > W + 2) s.x = -2;
        if (s.y < -2) s.y = H + 2;
        if (s.y > H + 2) s.y = -2;

        const alpha = s.baseOpacity * twinkle;

        // Glow halo — only for larger stars to keep realism
        if (s.size > 0.65) {
          const glowR = glowIntensity * s.size;
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
          grd.addColorStop(0,   `rgba(${r},${g},${b},${alpha * 0.28})`);
          grd.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.07})`);
          grd.addColorStop(1,   `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(s.x, s.y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // Star core dot
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      wrapper.removeEventListener('mousemove', onMove);
      wrapper.removeEventListener('touchmove', onMove);
      wrapper.removeEventListener('mouseleave', onLeave);
    };
  }, [starsCount, starsSize, starsOpacity, glowIntensity, movementSpeed, mouseInfluence, mouseGravity, gravityStrength, starColor]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}
      {...rest}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default GravityStarsBackground;
