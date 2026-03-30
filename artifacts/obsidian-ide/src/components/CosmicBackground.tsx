import React, { useEffect, useRef } from 'react';

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

    // Stars
    const stars = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2,
      speed: (Math.random() + 0.1) * 0.2,
      brightness: Math.random()
    }));

    const drawNebula = (x: number, y: number, radius: number, color1: string, color2: string) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const render = () => {
      time += 0.01;
      
      // Clear background
      ctx.fillStyle = '#060212'; // Deep cosmic purple/black
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Nebulas
      ctx.globalCompositeOperation = 'screen';
      
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      
      const n1x = cx + Math.sin(time * 0.2) * 200;
      const n1y = cy + Math.cos(time * 0.3) * 150;
      drawNebula(n1x, n1y, 400, 'rgba(120, 40, 200, 0.15)', 'rgba(0, 0, 0, 0)');
      
      const n2x = cx - Math.cos(time * 0.25) * 300;
      const n2y = cy - Math.sin(time * 0.15) * 200;
      drawNebula(n2x, n2y, 500, 'rgba(40, 180, 255, 0.1)', 'rgba(0, 0, 0, 0)');

      const n3x = cx + Math.sin(time * 0.1) * 400;
      const n3y = cy + Math.cos(time * 0.2) * 300;
      drawNebula(n3x, n3y, 600, 'rgba(255, 40, 150, 0.08)', 'rgba(0, 0, 0, 0)');

      ctx.globalCompositeOperation = 'source-over';

      // Draw Sun/Moon Arc
      const moonX = cx + Math.cos(time * 0.05) * (canvas.width * 0.4);
      const moonY = cy + Math.sin(time * 0.05) * (canvas.height * 0.4);
      
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 100);
      moonGlow.addColorStop(0, 'rgba(150, 250, 255, 0.8)');
      moonGlow.addColorStop(0.2, 'rgba(100, 200, 255, 0.4)');
      moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 100, 0, Math.PI * 2);
      ctx.fill();

      // Draw Stars
      stars.forEach(star => {
        star.x -= star.speed;
        if (star.x < 0) {
          star.x = canvas.width;
          star.y = Math.random() * canvas.height;
        }
        
        const twinkle = Math.sin(time * 3 + star.brightness * 10) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + twinkle * 0.7})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Organic Vines at edges
      ctx.strokeStyle = 'rgba(40, 200, 255, 0.15)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height * (i/5));
        for(let x = 0; x < 200; x += 20) {
          const yOff = Math.sin(x * 0.05 + time + i) * 30;
          ctx.lineTo(x, canvas.height * (i/5) + yOff);
        }
        ctx.stroke();
      }

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
      className="fixed inset-0 w-full h-full pointer-events-none z-[-1]"
    />
  );
}
