import { useEffect, useState } from "react";

interface ConfettiParticle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
}

const CONFETTI_COLORS = [
  "#ef476f", // Pink
  "#ffd166", // Yellow
  "#06d6a0", // Green
  "#118ab2", // Blue
  "#9d4edd", // Purple
  "#ff9f1c"  // Orange
];

interface ConfettiCelebrationProps {
  onComplete?: () => void;
  duration?: number; // ms
  particleCount?: number;
}

export function ConfettiCelebration({
  onComplete,
  duration = 3000,
  particleCount = 50
}: ConfettiCelebrationProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Генерируем частицы
    const newParticles: ConfettiParticle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      size: 8 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360
    }));

    setParticles(newParticles);

    // Скрываем после завершения
    const timer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [onComplete, duration, particleCount]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="confetti-particle"
          style={{
            left: `${particle.left}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`
          }}
        />
      ))}
    </div>
  );
}

interface CelebrationModalProps {
  title: string;
  message: string;
  onClose: () => void;
  showConfetti?: boolean;
}

export function CelebrationModal({
  title,
  message,
  onClose,
  showConfetti = true
}: CelebrationModalProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 200);
  };

  return (
    <div className={`celebration-overlay ${isAnimating ? 'animate-in' : 'animate-out'}`}>
      {showConfetti && (
        <ConfettiCelebration onComplete={() => {}} duration={4000} />
      )}
      
      <div className="celebration-modal">
        <div className="celebration-icon">🎉</div>
        <h2 className="celebration-title">{title}</h2>
        <p className="celebration-message">{message}</p>
        <button
          className="celebration-close-btn"
          onClick={handleClose}
          autoFocus
        >
          Продолжить
        </button>
      </div>
    </div>
  );
}
