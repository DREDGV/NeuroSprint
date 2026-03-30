import { useMemo, useState, type CSSProperties, type ReactNode, useRef } from "react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { useActiveUser } from "../app/ActiveUserContext";
import { sessionRepository } from "../entities/session/sessionRepository";
import { TRAINING_MODULES } from "../shared/lib/training/presets";
import {
  EXPERIMENTAL_MODULES,
  getExperimentalModuleCurrentMilestone,
  getExperimentalModuleDoneCount,
  getExperimentalModuleNextMilestone,
  getExperimentalModuleProgress,
  getExperimentalModulePromotionReadiness,
  getExperimentalModuleStageIndex,
  getExperimentalModuleStageTotal
} from "../shared/lib/training/experimentalModules";
import { buildSkillGuidance } from "../shared/lib/training/skillGuidance";
import type { Session } from "../shared/types/domain";

const modulePrimaryRouteById: Record<string, string> = {
  schulte: "/training/schulte",
  sprint_math: "/training/sprint-math",
  reaction: "/training/reaction",
  n_back: "/training/nback",
  memory_grid: "/training/memory-grid",
  memory_match: "/training/memory-match",
  spatial_memory: "/training/spatial-memory",
  decision_rush: "/training/decision-rush",
  pattern_recognition: "/training/pattern-recognition"
};

const moduleTitleById: Record<string, string> = {
  schulte: "Таблица Шульте",
  sprint_math: "Математический спринт",
  reaction: "Реакция",
  n_back: "N-Back",
  memory_grid: "Сетка памяти",
  memory_match: "Пары памяти",
  spatial_memory: "Пространственная память",
  decision_rush: "Быстрые решения",
  pattern_recognition: "Распознавание паттернов"
};

function declensionTrainers(count: number): string {
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'тренажёров';
  }
  if (lastDigit === 1) {
    return 'тренажёр';
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'тренажёра';
  }
  return 'тренажёров';
}

const SchulteIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="3" y="3" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.35" />
    <rect x="14" y="3" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.65" />
    <rect x="3" y="14" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.65" />
    <rect x="14" y="14" width="7" height="7" rx="1" fill="currentColor" fillOpacity="0.95" />
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fillOpacity="0" />
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fillOpacity="0" />
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fillOpacity="0" />
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" fillOpacity="0" />
  </svg>
);

const MathIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width={size} height={size}>
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.25" />
    <path d="M8 12h8M12 8v8" strokeWidth="2.8" />
    <path d="M9 9l6 6M15 9l-6 6" strokeWidth="2" opacity="0.9" />
  </svg>
);

const ReactionIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.25" />
    <circle cx="12" cy="12" r="3.5" fill="currentColor" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

const MemoryIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" fillOpacity="0.25" />
    <circle cx="8" cy="8" r="2" fill="currentColor" />
    <circle cx="16" cy="8" r="2" fill="currentColor" />
    <circle cx="8" cy="16" r="2" fill="currentColor" />
    <circle cx="16" cy="16" r="2" fill="currentColor" />
  </svg>
);

const DecisionIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z" fill="currentColor" fillOpacity="0.25" />
    <path d="M12 7v10M7 12h10" strokeWidth="2.8" strokeLinecap="round" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
  </svg>
);

const PatternIcon = ({ size = 32 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size}>
    <circle cx="6" cy="6" r="2.8" fill="currentColor" fillOpacity="0.45" />
    <circle cx="18" cy="6" r="2.8" fill="currentColor" fillOpacity="0.65" />
    <circle cx="6" cy="18" r="2.8" fill="currentColor" fillOpacity="0.65" />
    <circle cx="18" cy="18" r="2.8" fill="currentColor" fillOpacity="0.95" />
    <path d="M6 6l12 12M18 6L6 18" strokeWidth="2" opacity="0.7" />
  </svg>
);

type SkillId = "attention" | "memory" | "reaction" | "math" | "logic";

interface ModuleMeta {
  id: string;
  color: string;
  gradient: string;
  bgLight: string;
  icon: ReactNode;
  primarySkill: string;
  secondarySkills: string[];
  timeLabel: string;
  benefit: string;
  bestFor: string;
  routeLabel: string;
  formatLabel: string;
  skillId: SkillId;
}

interface SkillTabDefinition {
  id: SkillId;
  title: string;
  shortTitle: string;
  tabHint: string;
  description: string;
  whyItMatters: string;
  recommendation: string;
  icon: ReactNode;
  accent: string;
}

const MODULE_META: ModuleMeta[] = [
  {
    id: "schulte",
    color: "#1e7f71",
    gradient: "linear-gradient(135deg, #1e7f71 0%, #2d9d8a 100%)",
    bgLight: "rgba(30, 127, 113, 0.08)",
    icon: <SchulteIcon size={36} />,
    primarySkill: "Внимание",
    secondarySkills: ["Концентрация", "Темп"],
    timeLabel: "2-4 мин",
    benefit: "Помогает быстрее замечать нужное и удерживать фокус.",
    bestFor: "Когда нужно собраться и включить внимание",
    routeLabel: "Быстрый старт",
    formatLabel: "Поиск в таблице",
    skillId: "attention"
  },
  {
    id: "sprint_math",
    color: "#7c3aed",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #9f67ff 100%)",
    bgLight: "rgba(124, 58, 237, 0.08)",
    icon: <MathIcon size={36} />,
    primarySkill: "Счёт",
    secondarySkills: ["Скорость", "Логика"],
    timeLabel: "2-5 мин",
    benefit: "Разгоняет устный счёт и уверенность в вычислениях.",
    bestFor: "Когда хочется бодрой нагрузки на математику",
    routeLabel: "Основной модуль",
    formatLabel: "Устный счёт",
    skillId: "math"
  },
  {
    id: "reaction",
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
    bgLight: "rgba(245, 158, 11, 0.08)",
    icon: <ReactionIcon size={36} />,
    primarySkill: "Реакция",
    secondarySkills: ["Скорость", "Сигнал"],
    timeLabel: "1-3 мин",
    benefit: "Даёт быструю разминку и помогает включиться без длинных правил.",
    bestFor: "Когда есть мало времени и нужен быстрый старт",
    routeLabel: "Экспресс-вход",
    formatLabel: "Сигнал и отклик",
    skillId: "reaction"
  },
  {
    id: "memory_match",
    color: "#0d9488",
    gradient: "linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)",
    bgLight: "rgba(13, 148, 136, 0.08)",
    icon: <MemoryIcon size={36} />,
    primarySkill: "Зрительная память",
    secondarySkills: ["Позиции", "Внимание"],
    timeLabel: "2-4 мин",
    benefit: "Тренирует запоминание поля, поиск пар и более аккуратную работу без повторных ошибок.",
    bestFor: "Когда нужен понятный и комфортный вход в тренировку памяти",
    routeLabel: "Лучший первый шаг",
    formatLabel: "Поле и пары",
    skillId: "memory"
  },
  {
    id: "spatial_memory",
    color: "#0b6b68",
    gradient: "linear-gradient(135deg, #0b6b68 0%, #4fd1c5 100%)",
    bgLight: "rgba(11, 107, 104, 0.08)",
    icon: <MemoryIcon size={36} />,
    primarySkill: "Пространственная память",
    secondarySkills: ["Позиции", "Внимание"],
    timeLabel: "2-4 мин",
    benefit: "Тренирует удержание карты поля, зон и опорных точек без перехода в последовательность.",
    bestFor: "Когда хотите прокачать именно расположение и форму на поле",
    routeLabel: "Следующий шаг",
    formatLabel: "Зоны и форма",
    skillId: "memory"
  },
  {
    id: "memory_grid",
    color: "#0f766e",
    gradient: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    bgLight: "rgba(20, 184, 166, 0.08)",
    icon: <MemoryIcon size={36} />,
    primarySkill: "Память",
    secondarySkills: ["Внимание", "Последовательность"],
    timeLabel: "2-5 мин",
    benefit: "Тренирует зрительную память и воспроизведение последовательности без перегруза.",
    bestFor: "Когда хочется понятной тренировки на память",
    routeLabel: "После базы",
    formatLabel: "Паттерн и порядок",
    skillId: "memory"
  },
  {
    id: "n_back",
    color: "#ec4899",
    gradient: "linear-gradient(135deg, #ec4899 0%, #f472b6 100%)",
    bgLight: "rgba(236, 72, 153, 0.08)",
    icon: <MemoryIcon size={36} />,
    primarySkill: "Рабочая память",
    secondarySkills: ["Удержание", "Фокус"],
    timeLabel: "2-4 мин",
    benefit: "Помогает удерживать информацию в голове и не терять последовательность.",
    bestFor: "Когда хотите нагрузку именно на удержание в памяти",
    routeLabel: "Интенсивнее",
    formatLabel: "Удержание шагов",
    skillId: "memory"
  },
  {
    id: "decision_rush",
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)",
    bgLight: "rgba(6, 182, 212, 0.08)",
    icon: <DecisionIcon size={36} />,
    primarySkill: "Гибкость мышления",
    secondarySkills: ["Реакция", "Точность"],
    timeLabel: "2-4 мин",
    benefit: "Учит быстро менять правило и не теряться в потоке решений.",
    bestFor: "Когда хотите проверить скорость и точность одновременно",
    routeLabel: "Смена правил",
    formatLabel: "Решения на скорости",
    skillId: "logic"
  },
  {
    id: "pattern_recognition",
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)",
    bgLight: "rgba(139, 92, 246, 0.08)",
    icon: <PatternIcon size={36} />,
    primarySkill: "Логика",
    secondarySkills: ["Внимание", "Закономерности"],
    timeLabel: "3-5 мин",
    benefit: "Помогает видеть закономерности и быстрее находить следующий правильный ход.",
    bestFor: "Когда хочется спокойной интеллектуальной тренировки",
    routeLabel: "Лучший первый шаг",
    formatLabel: "Закономерности",
    skillId: "logic"
  }
];

const SKILL_TABS: SkillTabDefinition[] = [
  {
    id: "attention",
    title: "Внимание и концентрация",
    shortTitle: "Внимание",
    tabHint: "Фокус и собранность",
    description: "Если хотите меньше отвлекаться, быстрее замечать нужное и увереннее держать фокус.",
    whyItMatters: "Подходит перед учёбой, работой и любым делом, где важно быстро собраться.",
    recommendation: "Начните с короткого раунда Шульте, а потом переходите к Pattern Recognition.",
    icon: <SchulteIcon size={32} />,
    accent: "#1e7f71" // Изумрудный зелёный
  },
  {
    id: "memory",
    title: "Память",
    shortTitle: "Память",
    tabHint: "Запоминание и удержание",
    description: "Для удержания образов, последовательностей и опорных элементов в голове.",
    whyItMatters: "Полезно, когда хотите почувствовать прогресс без перегруза и длинных правил.",
    recommendation: "Начните с Memory Match, затем переходите к Spatial Memory и Memory Grid, а для более плотной нагрузки подключайте N-Back Lite.",
    icon: <MemoryIcon size={32} />,
    accent: "#2563eb" // Яркий синий
  },
  {
    id: "reaction",
    title: "Реакция и скорость",
    shortTitle: "Реакция",
    tabHint: "Быстрый отклик",
    description: "Когда нужен быстрый отклик, короткая разминка и чувство темпа.",
    whyItMatters: "Это лучший вход, если времени мало, но хочется всё равно сделать полезную тренировку.",
    recommendation: "Если у вас буквально 2 минуты, начните с Reaction и держите темп короткими сессиями.",
    icon: <ReactionIcon size={32} />,
    accent: "#f59e0b" // Янтарный оранжевый
  },
  {
    id: "math",
    title: "Счёт",
    shortTitle: "Счёт",
    tabHint: "Устные вычисления",
    description: "Для устного счёта, уверенности в вычислениях и более бодрого математического темпа.",
    whyItMatters: "Подходит, когда хочется тренировки с понятной целью и чётким ощущением прогресса.",
    recommendation: "Берите Sprint Math, если хотите короткую, энергичную математическую нагрузку.",
    icon: <MathIcon size={32} />,
    accent: "#7c3aed" // Фиолетовый
  },
  {
    id: "logic",
    title: "Логика и гибкость",
    shortTitle: "Логика",
    tabHint: "Закономерности и решения",
    description: "Когда хочется закономерностей, точных решений и переключения между правилами.",
    whyItMatters: "Подходит для более спокойной, но умственной тренировки без лишней спешки.",
    recommendation: "Сначала попробуйте Pattern Recognition, затем добавьте Decision Rush для скорости решений.",
    icon: <PatternIcon size={32} />,
    accent: "#db2777" // Розово-малиновый
  }
];

function getModuleMeta(moduleId: string) {
  return MODULE_META.find((item) => item.id === moduleId);
}

function getModule(moduleId: string) {
  return TRAINING_MODULES.find((item) => item.id === moduleId);
}

interface TrainingModuleCardProps {
  module: (typeof TRAINING_MODULES)[number];
  meta: ModuleMeta;
  variant?: "featured" | "default";
  skillColor?: string;
}

function TrainingModuleCard({ module, meta, variant = "default", skillColor }: TrainingModuleCardProps) {
  const primaryRoute = modulePrimaryRouteById[module.id];
  const moduleDescription = module.description ?? meta.benefit;

  return (
    <article
      className={`training-module-card${variant === "featured" ? " is-featured" : ""}`}
      style={{
        "--card-bg-light": meta.bgLight,
        "--card-color": skillColor || meta.color
      } as CSSProperties}
    >
      <Link to={primaryRoute} className="module-card-link" data-testid={`training-open-${module.id}`}>
        <div className="module-card-icon" style={{ background: meta.gradient }}>
          {meta.icon}
        </div>
        <div className="module-card-content">
          {variant === "featured" ? <span className="module-card-priority">Рекомендуем начать</span> : null}
          <div className="module-card-head">
            <h3 className="module-card-title">{module.title}</h3>
            <span className="module-card-time">{meta.timeLabel}</span>
          </div>
          <p className="module-card-desc">{moduleDescription}</p>
          <div className="module-card-actions">
            <span className="module-card-cta">
              Запустить <span className="arrow">→</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

export function TrainingHubPage() {
  const { activeUserId } = useActiveUser();
  const [activeSkillId, setActiveSkillId] = useState<SkillId>("attention");
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [hasManualSkillPick, setHasManualSkillPick] = useState(false);
  const trainersSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasManualSkillPick(false);
  }, [activeUserId]);

  useEffect(() => {
    if (hasManualSkillPick && trainersSectionRef.current) {
      trainersSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [hasManualSkillPick, trainersSectionRef, activeSkillId]);

  useEffect(() => {
    if (!activeUserId) {
      setAllSessions([]);
      return;
    }

    let cancelled = false;

    void sessionRepository
      .listByUser(activeUserId)
      .then((sessions) => {
        if (!cancelled) {
          setAllSessions((current) => {
            if (current.length === 0 && sessions.length === 0) {
              return current;
            }
            return sessions;
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllSessions((current) => (current.length === 0 ? current : []));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  const skillGuidance = useMemo(() => buildSkillGuidance(allSessions), [allSessions]);

  useEffect(() => {
    if (!skillGuidance.hasData || hasManualSkillPick) {
      return;
    }

    const focusSkillId = skillGuidance.focusSkillId as SkillId;
    if (focusSkillId !== activeSkillId) {
      setActiveSkillId(focusSkillId);
    }
  }, [activeSkillId, hasManualSkillPick, skillGuidance.focusSkillId, skillGuidance.hasData]);

  const activeSkill = SKILL_TABS.find((item) => item.id === activeSkillId) ?? SKILL_TABS[0];
  const activeModulePairs = useMemo(
    () =>
      MODULE_META.filter((item) => item.skillId === activeSkillId)
        .map((meta) => {
          const module = getModule(meta.id);
          return module ? { module, meta } : null;
        })
        .filter((item): item is { module: (typeof TRAINING_MODULES)[number]; meta: ModuleMeta } => item !== null),
    [activeSkillId]
  );
  const featuredModules = activeModulePairs;
  const strongestSkillMessage = skillGuidance.hasData
    ? skillGuidance.strongestSkillId === activeSkillId
      ? `Сейчас это одна из ваших сильных сторон. Можно закрепить результат и спокойно поднять планку.`
      : `Сильнее всего уже выглядит навык «${skillGuidance.strongestLabel}». Здесь сейчас лучший следующий шаг для роста.`
    : `Пока профиль ещё собирается. Начните с 2-3 коротких сессий, чтобы увидеть сильные стороны.`;

  return (
    <section className="panel training-hub-panel" data-testid="training-hub-page">
      <div className="training-hub-top-shell">
        <header className="training-hub-hero">
          <div className="training-hub-hero-content">
            <h1 className="training-hub-title">Тренировки</h1>
            <p className="training-hub-subtitle">
              Выберите навык для тренировки. Внутри каждой ветки — лучшие тренажёры для старта.
            </p>
          </div>
        </header>

        <section className="training-skill-tabs-shell" data-testid="training-skill-tabs">
          <div className="training-skill-tabs-head">
            <h2>Что хотите тренировать сегодня?</h2>
            <p className="training-skill-tabs-subtitle">
              Выберите направление — внутри лучшие тренажёры для старта
            </p>
          </div>

          <div className="training-skill-cards-row">
            {SKILL_TABS.map((item) => {
              const isActive = item.id === activeSkillId;
              const tabModules = MODULE_META.filter((meta) => meta.skillId === item.id);
              const starterMeta = tabModules[0];
              const starterModuleName = starterMeta?.primarySkill === "Зрительная память"
                ? "Memory Match"
                : getModule(starterMeta?.id ?? "")?.title ?? item.shortTitle;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`training-skill-card${isActive ? " is-active" : ""}`}
                  data-testid={`training-skill-tab-${item.id}`}
                  onClick={() => {
                    setHasManualSkillPick(true);
                    setActiveSkillId(item.id);
                  }}
                  style={{ "--skill-accent": item.accent } as CSSProperties}
                  aria-pressed={isActive}
                >
                  <div className="training-skill-card-icon" style={{ background: `color-mix(in srgb, ${item.accent} 12%, white)` }}>
                    {item.icon}
                  </div>
                  <div className="training-skill-card-content">
                    <h3 className="training-skill-card-title">{item.shortTitle}</h3>
                    <p className="training-skill-card-hint">{item.tabHint}</p>
                  </div>
                  <div className="training-skill-card-meta">
                    <span className="training-skill-card-count">
                      {tabModules.length} {declensionTrainers(tabModules.length)}
                    </span>
                    <ul className="training-skill-card-trainers-list">
                      {tabModules.map((meta) => {
                        const route = modulePrimaryRouteById[meta.id];
                        const title = moduleTitleById[meta.id] ?? meta.primarySkill;
                        return (
                          <li key={meta.id}>
                            <a
                              href={route}
                              className="training-skill-card-trainer-link"
                              data-testid={`training-skill-trainer-${meta.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="trainer-link-title">{title}</span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            ref={trainersSectionRef}
            className="training-skill-panel"
            data-testid={`training-skill-panel-${activeSkillId}`}
            style={{ "--skill-accent": activeSkill.accent } as CSSProperties}
          >
            <div className="training-skill-panel-main">
              <div className="training-skill-featured" data-testid={`training-featured-modules-${activeSkillId}`}>
                <div className="training-skill-featured-head">
                  <h3>Тренажёры по навыку: {activeSkill.shortTitle}</h3>
                  <div className="training-skill-featured-pill">
                    {featuredModules.length} {declensionTrainers(featuredModules.length)}
                  </div>
                </div>
                <div className="training-modules-grid training-modules-grid-featured-inline">
                  {featuredModules.map(({ module, meta }) => (
                    <TrainingModuleCard
                      key={module.id}
                      module={module}
                      meta={meta}
                      variant="featured"
                      skillColor={activeSkill.accent}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="training-skill-panel-side">
              <div className="training-skill-panel-callout">
                <span className="training-skill-panel-callout-label">Что уже получается лучше всего</span>
                <p>{strongestSkillMessage}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="setup-block training-alpha-section" data-testid="training-alpha-trainers">
        <div className="training-alpha-section-head">
          <div>
            <p className="stats-section-kicker">Отдельный блок</p>
            <h2>Экспериментальные тренажёры</h2>
          </div>
          <p className="status-line">
            Эти режимы можно тестировать уже сейчас, но они ещё не входят в основную статистику, рекомендации и прогресс-систему.
          </p>
        </div>
        <div className="training-alpha-grid">
          {EXPERIMENTAL_MODULES.map((module) => {
            const progress = getExperimentalModuleProgress(module);
            const currentMilestone = getExperimentalModuleCurrentMilestone(module);
            const nextMilestone = getExperimentalModuleNextMilestone(module);
            const doneCount = getExperimentalModuleDoneCount(module);
            const readiness = getExperimentalModulePromotionReadiness(module);
            const stageIndex = getExperimentalModuleStageIndex(module);
            const stageTotal = getExperimentalModuleStageTotal();

            return (
              <Link
                key={module.id}
                className="training-alpha-card"
                to={module.route}
                data-testid={`training-alpha-${module.id.replace("_", "-")}`}
              >
                <div className="training-alpha-topline">
                  <span className="training-alpha-title">{module.title}</span>
                  <span className="module-card-badge locked">Эксперимент</span>
                </div>
                <div className="training-alpha-meta-row" aria-hidden="true">
                  <span className="training-alpha-chip">{module.category}</span>
                  <span className="training-alpha-chip">{module.skills.join(" • ")}</span>
                </div>
                <span className="training-alpha-desc">{module.description}</span>

                <div className="training-alpha-progress-block">
                  <div className="training-alpha-progress-head">
                    <span className="training-alpha-progress-label">{module.stageLabel}</span>
                    <strong className="training-alpha-progress-value">{progress}%</strong>
                  </div>
                  <div
                    className="training-alpha-progress-track"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-label={`Готовность ${module.title}`}
                  >
                    <span className="training-alpha-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="training-alpha-progress-meta">
                    <span>Этап {stageIndex} из {stageTotal}</span>
                    <span>{doneCount}/{module.milestones.length} этапов закрыто</span>
                  </div>
                </div>

                <div className="training-alpha-next-step">
                  <span className="training-alpha-next-kicker">Сейчас в работе</span>
                  <strong>{currentMilestone?.label ?? module.stageLabel}</strong>
                  <p>{module.nextFocus}</p>
                  {nextMilestone ? <span className="training-alpha-next-target">Дальше: {nextMilestone.label}</span> : null}
                </div>
                <div className={`training-alpha-readiness is-${readiness.tier}`}>
                  <span className="training-alpha-readiness-kicker">Готовность к переводу</span>
                  <strong>{readiness.score}/100 · {readiness.label}</strong>
                  <p>{readiness.summary}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="training-quick-actions">
        <div className="training-quick-actions-head">
          <div>
            <p className="stats-section-kicker">Навигация</p>
            <h2>Если нужен другой путь</h2>
          </div>
          <p>Когда не хотите выбирать модуль вручную и проще перейти сразу к готовому плану, статистике или настройкам.</p>
        </div>
        <div className="quick-actions-grid">
          <Link className="quick-action-card" to="/training/pre-session">
            <span className="quick-action-icon">📋</span>
            <span className="quick-action-title">План дня</span>
            <span className="quick-action-desc">Если хотите готовую рекомендацию на сегодня</span>
          </Link>
          <Link className="quick-action-card" to="/stats">
            <span className="quick-action-icon">📊</span>
            <span className="quick-action-title">Статистика</span>
            <span className="quick-action-desc">Чтобы посмотреть, где уже есть прогресс</span>
          </Link>
          <Link className="quick-action-card" to="/settings">
            <span className="quick-action-icon">⚙️</span>
            <span className="quick-action-title">Настройки</span>
            <span className="quick-action-desc">Чтобы подстроить приложение под себя</span>
          </Link>
        </div>
      </section>
    </section>
  );
}






















