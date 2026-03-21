import React, { useEffect, useState } from 'react';

interface AnimatedProgressLightProps {
  progress: number; // 0-100
  isActive: boolean;
  height?: number;
  duration?: number; // animation duration in ms
}

export const AnimatedProgressLight: React.FC<AnimatedProgressLightProps> = ({
  progress,
  isActive,
  height = 8,
  duration = 2000,
}) => {
  const [lightPosition, setLightPosition] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setLightPosition(0);
      return;
    }

    let animationFrameId: number;
    let startTime: number | null = null;

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime;
      }

      const elapsed = currentTime - startTime;
      const animationProgress = (elapsed % duration) / duration;
      
      // Position moves from right (100) to left (0)
      const position = 100 - (animationProgress * 100);
      setLightPosition(position);

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isActive, duration]);

  return (
    <div className="relative w-full overflow-hidden rounded-full bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200">
      {/* Background track */}
      <div
        className="h-full bg-gradient-to-r from-slate-200 to-slate-100 transition-all duration-500"
        style={{
          width: `${progress}%`,
        }}
      />

      {/* Animated blue light */}
      {isActive && (
        <div
          className="absolute top-0 h-full transition-all"
          style={{
            left: `${lightPosition}%`,
            width: '40px',
            transform: 'translateX(-50%)',
          }}
        >
          {/* Glow effect */}
          <div
            className="absolute inset-0 rounded-full blur-lg"
            style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.8) 0%, rgba(59, 130, 246, 0.4) 70%, transparent 100%)',
              filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.6))',
            }}
          />

          {/* Core light */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #1e40af 100%)',
              boxShadow: '0 0 20px rgba(59, 130, 246, 0.8), inset 0 0 10px rgba(255, 255, 255, 0.3)',
            }}
          />

          {/* Highlight */}
          <div
            className="absolute top-1 left-1 w-2 h-2 rounded-full"
            style={{
              background: 'rgba(255, 255, 255, 0.6)',
              filter: 'blur(1px)',
            }}
          />
        </div>
      )}

      {/* Progress text overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-semibold text-slate-700 drop-shadow-sm">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default AnimatedProgressLight;
