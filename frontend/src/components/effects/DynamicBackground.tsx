import React, { useEffect, useRef, useCallback, memo } from 'react';
import { useEditorStore } from '../../stores/editorStore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

interface DynamicBackgroundProps {
  particleCount?: number;
  particleSpeed?: number;
  accentColor?: string;
  showScanlines?: boolean;
  showGrid?: boolean;
}

// 使用 memo 避免不必要的重渲染
export const DynamicBackground: React.FC<DynamicBackgroundProps> = memo(({
  particleCount = 50,
  particleSpeed = 0.3,
  accentColor,
  showScanlines = true,
  showGrid = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const isActiveRef = useRef(true);
  const accentColorType = useEditorStore((state) => state.config.accentColor);
  const animationsEnabled = useEditorStore((state) => state.config.animationsEnabled);
  
  // 使用 store 中的强调色或传入的强调色
  const currentAccentColor = accentColor
    ? accentColor
    : accentColorType === 'cyan'
      ? '#00d4ff'
      : accentColorType === 'magenta'
        ? '#ff00ff'
        : accentColorType === 'green'
          ? '#00ff88'
          : '#ff8800';

  // 初始化粒子 - 使用 useCallback 缓存
  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * particleSpeed,
        vy: (Math.random() - 0.5) * particleSpeed,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1,
        color: currentAccentColor,
      });
    }
    return particles;
  }, [particleCount, particleSpeed, currentAccentColor]);

  // 动画循环 - 优化：减少对象创建
  const animate = useCallback(() => {
    if (!isActiveRef.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 绘制网格 - 只在需要时绘制
    if (showGrid) {
      ctx.strokeStyle = `${currentAccentColor}10`;
      ctx.lineWidth = 1;
      const gridSize = 50;
      
      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    // 更新和绘制粒子
    const particles = particlesRef.current;
    const connectionDistance = 100;
    const connectionDistanceSq = connectionDistance * connectionDistance;
    
    // 预计算颜色
    const particleColor = currentAccentColor;
    
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      
      // 更新位置
      particle.x += particle.vx;
      particle.y += particle.vy;

      // 边界检查
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fillStyle = `${particleColor}${Math.floor(particle.alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.fill();
      
      // 绘制连线 - 优化：使用距离平方避免开方运算
      ctx.strokeStyle = `${particleColor}15`;
      ctx.lineWidth = 0.5;
      
      for (let j = i + 1; j < particles.length; j++) {
        const other = particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq < connectionDistanceSq) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      }
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [currentAccentColor, showGrid]);

  // 处理窗口大小变化 - 使用防抖
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particlesRef.current = initParticles(canvas.width, canvas.height);
      }, 100);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [initParticles]);

  // 启动/停止动画 - 优化清理逻辑
  useEffect(() => {
    isActiveRef.current = true;
    
    if (!animationsEnabled) {
      // 动画禁用时清理
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      isActiveRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [animate, animationsEnabled]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Canvas 粒子背景 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: animationsEnabled ? 1 : 0 }}
      />
      
      {/* 扫描线效果 */}
      {showScanlines && (
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.03) 2px,
              rgba(0, 0, 0, 0.03) 4px
            )`,
            pointerEvents: 'none',
          }}
        />
      )}
      
      {/* 渐变遮罩 */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 0%, rgba(10, 14, 23, 0.4) 100%)`,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
});

DynamicBackground.displayName = 'DynamicBackground';

export default DynamicBackground;
