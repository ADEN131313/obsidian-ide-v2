import { useEffect, useRef } from 'react';

interface ShootingStar {
  x: number;
  y: number;
  len: number;
  speed: number;
  angle: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const stars = Array.from({ length: 250 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2.5 + 0.3,
      brightness: Math.random(),
      twinkleSpeed: Math.random() * 4 + 1,
      hue: Math.random() > 0.7 ? 200 + Math.random() * 60 : 0,
      saturation: Math.random() > 0.7 ? 40 + Math.random() * 60 : 0
    }));

    const shootingStars: ShootingStar[] = [];

    const spawnShootingStar = () => {
      const side = Math.random();
      let x: number, y: number, angle: number;
      if (side < 0.5) {
        x = Math.random() * canvas.width;
        y = -20;
        angle = Math.PI * 0.15 + Math.random() * Math.PI * 0.3;
      } else {
        x = canvas.width + 20;
        y = Math.random() * canvas.height * 0.5;
        angle = Math.PI * 0.6 + Math.random() * Math.PI * 0.3;
      }

      shootingStars.push({
        x, y, angle,
        len: 60 + Math.random() * 120,
        speed: 8 + Math.random() * 12,
        opacity: 1,
        life: 0,
        maxLife: 40 + Math.random() * 60
      });
    };

    const drawMoon = (cx: number, cy: number, radius: number, waveTime: number) => {
      const wobbleX = Math.sin(waveTime * 0.4) * 8;
      const wobbleY = Math.cos(waveTime * 0.3) * 6;
      const mx = cx + wobbleX;
      const my = cy + wobbleY;
      const breathe = Math.sin(waveTime * 0.5) * 8;
      const r = radius + breathe;

      for (let i = 5; i >= 0; i--) {
        const glowR = r + i * 40;
        const alpha = 0.03 + (5 - i) * 0.015;
        const grad = ctx.createRadialGradient(mx, my, r * 0.3, mx, my, glowR);
        grad.addColorStop(0, `rgba(180, 220, 255, ${alpha})`);
        grad.addColorStop(0.5, `rgba(100, 160, 255, ${alpha * 0.5})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(mx, my, glowR, 0, Math.PI * 2);
        ctx.fill();
      }

      const moonGrad = ctx.createRadialGradient(mx - r * 0.3, my - r * 0.3, 0, mx, my, r);
      moonGrad.addColorStop(0, 'rgba(230, 240, 255, 1)');
      moonGrad.addColorStop(0.4, 'rgba(200, 215, 240, 0.95)');
      moonGrad.addColorStop(0.7, 'rgba(160, 180, 220, 0.9)');
      moonGrad.addColorStop(1, 'rgba(100, 130, 180, 0.85)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();

      const craters = [
        { ox: -0.25, oy: -0.15, sr: 0.12 },
        { ox: 0.15, oy: 0.2, sr: 0.08 },
        { ox: -0.1, oy: 0.3, sr: 0.06 },
        { ox: 0.3, oy: -0.1, sr: 0.1 },
        { ox: -0.35, oy: 0.1, sr: 0.05 },
        { ox: 0.05, oy: -0.35, sr: 0.07 },
        { ox: 0.25, oy: 0.35, sr: 0.04 },
      ];
      craters.forEach(c => {
        const craterX = mx + c.ox * r;
        const craterY = my + c.oy * r;
        const craterR = c.sr * r;
        const cGrad = ctx.createRadialGradient(craterX, craterY, 0, craterX, craterY, craterR);
        cGrad.addColorStop(0, 'rgba(120, 140, 180, 0.4)');
        cGrad.addColorStop(1, 'rgba(160, 180, 210, 0)');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(craterX, craterY, craterR, 0, Math.PI * 2);
        ctx.fill();
      });

      const shadowAngle = waveTime * 0.1;
      const shadowX = mx + Math.cos(shadowAngle) * r * 0.6;
      const shadowY = my + Math.sin(shadowAngle) * r * 0.6;
      const shadowGrad = ctx.createRadialGradient(shadowX, shadowY, r * 0.1, shadowX, shadowY, r * 1.2);
      shadowGrad.addColorStop(0, 'rgba(10, 5, 30, 0.3)');
      shadowGrad.addColorStop(1, 'rgba(10, 5, 30, 0)');
      ctx.fillStyle = shadowGrad;
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.fill();
    };

    let shootTimer = 0;

    const render = () => {
      time += 0.016;
      shootTimer += 0.016;

      ctx.fillStyle = '#030010';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.globalCompositeOperation = 'screen';
      const nebulas = [
        { dx: Math.sin(time * 0.15) * 150, dy: Math.cos(time * 0.2) * 100, r: 500, c: 'rgba(60, 20, 120, 0.12)' },
        { dx: -Math.cos(time * 0.12) * 200, dy: Math.sin(time * 0.1) * 150, r: 600, c: 'rgba(20, 60, 140, 0.08)' },
        { dx: Math.sin(time * 0.08) * 250, dy: -Math.cos(time * 0.14) * 200, r: 400, c: 'rgba(80, 10, 100, 0.1)' },
      ];
      nebulas.forEach(n => {
        const grad = ctx.createRadialGradient(cx + n.dx, cy + n.dy, 0, cx + n.dx, cy + n.dy, n.r);
        grad.addColorStop(0, n.c);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx + n.dx, cy + n.dy, n.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';

      stars.forEach(star => {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.brightness * 10) * 0.5 + 0.5;
        const alpha = 0.2 + twinkle * 0.8;
        if (star.hue > 0) {
          ctx.fillStyle = `hsla(${star.hue}, ${star.saturation}%, 80%, ${alpha})`;
        } else {
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        }
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * (0.8 + twinkle * 0.4), 0, Math.PI * 2);
        ctx.fill();

        if (star.size > 1.8 && twinkle > 0.8) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${(twinkle - 0.8) * 2})`;
          ctx.lineWidth = 0.5;
          const crossLen = star.size * 3;
          ctx.beginPath();
          ctx.moveTo(star.x - crossLen, star.y);
          ctx.lineTo(star.x + crossLen, star.y);
          ctx.moveTo(star.x, star.y - crossLen);
          ctx.lineTo(star.x, star.y + crossLen);
          ctx.stroke();
        }
      });

      if (shootTimer > 0.8 + Math.random() * 2) {
        spawnShootingStar();
        shootTimer = 0;
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.x += Math.cos(s.angle) * s.speed;
        s.y += Math.sin(s.angle) * s.speed;
        s.life++;
        s.opacity = Math.max(0, 1 - s.life / s.maxLife);

        const tailX = s.x - Math.cos(s.angle) * s.len;
        const tailY = s.y - Math.sin(s.angle) * s.len;

        const grad = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.7, `rgba(180, 220, 255, ${s.opacity * 0.6})`);
        grad.addColorStop(1, `rgba(255, 255, 255, ${s.opacity})`);

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();

        const headGlow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 6);
        headGlow.addColorStop(0, `rgba(255, 255, 255, ${s.opacity})`);
        headGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
        ctx.fill();

        if (s.life >= s.maxLife) {
          shootingStars.splice(i, 1);
        }
      }

      const moonRadius = Math.min(canvas.width, canvas.height) * 0.18;
      drawMoon(cx, cy + 20, moonRadius, time);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
