import { Link } from "react-router-dom";
import { TRAINING_MODULES } from "../shared/lib/training/presets";
import { InfoHint } from "../shared/ui/InfoHint";

const modulePrimaryRouteById: Record<string, string> = {
  schulte: "/training/schulte",
  sprint_math: "/training/sprint-math",
  reaction: "/training/reaction",
  n_back: "/training/nback",
  memory_grid: "/training/memory-grid",
  decision_rush: "/training/decision-rush",
  pattern_recognition: "/training/pattern-recognition"
};

const modulePreSessionRouteById: Record<string, string> = {
  schulte: "/training/pre-session?module=schulte",
  sprint_math: "/training/pre-session?module=sprint_math",
  reaction: "/training/pre-session?module=reaction",
  n_back: "/training/pre-session?module=n_back",
  memory_grid: "/training/pre-session?module=memory_grid",
  decision_rush: "/training/pre-session?module=decision_rush"
};

// Иконки для модулей
const SchulteIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);

const MathIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width={size} height={size}>
    <path d="M4 8l4 4-4 4"/>
    <path d="M12 6v12"/>
    <path d="M8 12h8"/>
    <path d="M16 8l4 4-4 4"/>
  </svg>
);

const ReactionIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
  </svg>
);

const MemoryIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="4" y="4" width="16" height="16" rx="2"/>
    <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="16" cy="8" r="1.5" fill="currentColor"/>
    <circle cx="8" cy="16" r="1.5" fill="currentColor"/>
    <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
    <path d="M12 8v8"/>
  </svg>
);

const DecisionIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z"/>
    <path d="M12 12l4-4M12 12l-4 4"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
  </svg>
);

const PatternIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="6" cy="6" r="2.5" fill="currentColor"/>
    <circle cx="18" cy="6" r="2.5" fill="currentColor"/>
    <circle cx="6" cy="18" r="2.5" fill="currentColor"/>
    <circle cx="18" cy="18" r="2.5" fill="currentColor"/>
    <path d="M6 6l12 12M18 6L6 18"/>
  </svg>
);

const LockIcon = ({ size = 20 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size}>
    <rect x="5" y="11" width="14" height="10" rx="2"/>
    <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

interface TrainingModuleCardProps {
  module: typeof TRAINING_MODULES[0];
  color: string;
  gradient: string;
  icon: React.ReactNode;
  bgLight: string;
}

function TrainingModuleCard({ module, color, gradient, icon, bgLight }: TrainingModuleCardProps) {
  const primaryRoute = modulePrimaryRouteById[module.id];
  const preSessionRoute = modulePreSessionRouteById[module.id];

  if (module.status !== "active") {
    return (
      <article className="training-module-card coming-soon">
        <div className="module-card-icon" style={{ background: gradient }}>
          {icon}
        </div>
        <div className="module-card-content">
          <h3 className="module-card-title">{module.title}</h3>
          <p className="module-card-desc">{module.description}</p>
          <span className="module-card-badge locked">
            <LockIcon size={16} /> Скоро
          </span>
        </div>
      </article>
    );
  }

  return (
    <article className="training-module-card" style={{ "--card-bg-light": bgLight } as React.CSSProperties}>
      <Link to={primaryRoute} className="module-card-link" style={{ "--card-color": color } as React.CSSProperties}>
        <div className="module-card-icon" style={{ background: gradient }}>
          {icon}
        </div>
        <div className="module-card-content">
          <h3 className="module-card-title">{module.title}</h3>
          <p className="module-card-desc">{module.description}</p>
          <div className="module-card-actions">
            <span className="module-card-cta">
              Начать <span className="arrow">→</span>
            </span>
          </div>
        </div>
      </Link>
      {preSessionRoute && (
        <div className="module-card-footer">
          <Link className="module-presession-link" to={preSessionRoute}>
            <span>📋</span> План дня
          </Link>
        </div>
      )}
    </article>
  );
}

export function TrainingHubPage() {
  const moduleConfigs = [
    {
      id: "schulte",
      color: "#1e7f71",
      gradient: "linear-gradient(135deg, #1e7f71 0%, #2d9d8a 100%)",
      bgLight: "rgba(30, 127, 113, 0.08)",
      icon: <SchulteIcon size={36} />
    },
    {
      id: "sprint_math",
      color: "#7c3aed",
      gradient: "linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%)",
      bgLight: "rgba(124, 58, 237, 0.08)",
      icon: <MathIcon size={36} />
    },
    {
      id: "reaction",
      color: "#f59e0b",
      gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
      bgLight: "rgba(245, 158, 11, 0.08)",
      icon: <ReactionIcon size={36} />
    },
    {
      id: "n_back",
      color: "#ec4899",
      gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
      bgLight: "rgba(236, 72, 153, 0.08)",
      icon: <MemoryIcon size={36} />
    },
    {
      id: "decision_rush",
      color: "#06b6d4",
      gradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
      bgLight: "rgba(6, 182, 212, 0.08)",
      icon: <DecisionIcon size={36} />
    },
    {
      id: "pattern_recognition",
      color: "#8b5cf6",
      gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
      bgLight: "rgba(139, 92, 246, 0.08)",
      icon: <PatternIcon size={36} />
    }
  ];

  return (
    <section className="panel training-hub-panel" data-testid="training-hub-page">
      {/* Hero Section */}
      <header className="training-hub-hero">
        <div className="training-hub-hero-content">
          <h1 className="training-hub-title">
            <span className="hero-icon">🎯</span>
            Тренировки
          </h1>
          <p className="training-hub-subtitle">
            Выберите модуль для тренировки когнитивных навыков
          </p>
        </div>
      </header>

      {/* Info Hint */}
      <InfoHint title="💡 Подсказка" testId="training-hub-hint">
        <p>Если сомневаетесь, с чего начать, откройте «План дня».</p>
        <p>N-Back Lite лучше начинать с уровня 1-back и сессии 60 секунд.</p>
      </InfoHint>

      {/* Modules Grid */}
      <div className="training-modules-grid">
        {TRAINING_MODULES.map((module) => {
          const config = moduleConfigs.find((c) => c.id === module.id);
          return (
            <TrainingModuleCard
              key={module.id}
              module={module}
              color={config?.color || "#1e7f71"}
              gradient={config?.gradient || "linear-gradient(135deg, #1e7f71 0%, #2d9d8a 100%)"}
              bgLight={config?.bgLight || "rgba(30, 127, 113, 0.08)"}
              icon={config?.icon || <SchulteIcon size={36} />}
            />
          );
        })}
      </div>

      {/* Quick Actions */}
      <section className="training-quick-actions">
        <h2 className="section-title">
          <span className="section-title-icon">⚡</span>
          Быстрый доступ
        </h2>
        <div className="quick-actions-grid">
          <Link className="quick-action-card" to="/training/pre-session">
            <span className="quick-action-icon">📋</span>
            <span className="quick-action-title">План дня</span>
            <span className="quick-action-desc">Рекомендация на сегодня</span>
          </Link>
          <Link className="quick-action-card" to="/stats">
            <span className="quick-action-icon">📊</span>
            <span className="quick-action-title">Статистика</span>
            <span className="quick-action-desc">Прогресс и результаты</span>
          </Link>
          <Link className="quick-action-card" to="/settings">
            <span className="quick-action-icon">⚙️</span>
            <span className="quick-action-title">Настройки</span>
            <span className="quick-action-desc">Параметры приложения</span>
          </Link>
        </div>
      </section>
    </section>
  );
}
