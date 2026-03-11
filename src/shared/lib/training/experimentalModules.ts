export type ExperimentalModuleStage = "prototype" | "polish" | "validation" | "ready";

export type ExperimentalMilestoneStatus = "done" | "in_progress" | "planned";

export interface ExperimentalMilestone {
  id: string;
  label: string;
  status: ExperimentalMilestoneStatus;
  weight: number;
}

export interface ExperimentalModuleMeta {
  id: "block_pattern";
  title: string;
  route: string;
  category: string;
  skills: string[];
  description: string;
  stage: ExperimentalModuleStage;
  stageLabel: string;
  nextFocus: string;
  milestones: ExperimentalMilestone[];
}

export type ExperimentalPromotionTier = "not_ready" | "nearly_ready" | "ready";

export interface ExperimentalPromotionReadiness {
  score: number;
  tier: ExperimentalPromotionTier;
  label: string;
  summary: string;
}

const STAGE_ORDER: ExperimentalModuleStage[] = ["prototype", "polish", "validation", "ready"];

export const EXPERIMENTAL_MODULES: ExperimentalModuleMeta[] = [
  {
    id: "block_pattern",
    title: "Block Pattern Recall",
    route: "/training/block-pattern",
    category: "Логика и память",
    skills: ["Паттерны", "Мысленный поворот"],
    description:
      "Работа с паттернами, поворотами и зеркальностью. База уже собрана, но продукт ещё требует доводки.",
    stage: "polish",
    stageLabel: "Сборка режима",
    nextFocus:
      "Следующий шаг: усилить обучающий слой, метрики качества и подготовить режим к валидации.",
    milestones: [
      { id: "core-loop", label: "Базовый игровой цикл", status: "done", weight: 3 },
      { id: "transform-rules", label: "Поворот и зеркальность", status: "done", weight: 2 },
      { id: "difficulty", label: "Режимы сложности", status: "done", weight: 2 },
      { id: "feedback", label: "Обратная связь и обучение", status: "in_progress", weight: 2 },
      { id: "promotion", label: "Проверка перед переводом в основные", status: "planned", weight: 1 }
    ]
  }
];

function milestoneProgress(status: ExperimentalMilestoneStatus): number {
  if (status === "done") {
    return 1;
  }
  if (status === "in_progress") {
    return 0.55;
  }
  return 0;
}

export function getExperimentalModuleProgress(meta: ExperimentalModuleMeta): number {
  const totalWeight = meta.milestones.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) {
    return 0;
  }

  const completedWeight = meta.milestones.reduce(
    (sum, item) => sum + item.weight * milestoneProgress(item.status),
    0
  );
  return Math.max(0, Math.min(100, Math.round((completedWeight / totalWeight) * 100)));
}

export function getExperimentalModuleDoneCount(meta: ExperimentalModuleMeta): number {
  return meta.milestones.filter((item) => item.status === "done").length;
}

export function getExperimentalModuleCurrentMilestone(meta: ExperimentalModuleMeta): ExperimentalMilestone | null {
  return meta.milestones.find((item) => item.status === "in_progress") ?? null;
}

export function getExperimentalModuleNextMilestone(meta: ExperimentalModuleMeta): ExperimentalMilestone | null {
  return meta.milestones.find((item) => item.status === "planned") ?? null;
}

export function getExperimentalModuleStageIndex(meta: ExperimentalModuleMeta): number {
  return STAGE_ORDER.indexOf(meta.stage) + 1;
}

export function getExperimentalModuleStageTotal(): number {
  return STAGE_ORDER.length;
}

export function getExperimentalModuleMeta(id: ExperimentalModuleMeta["id"]): ExperimentalModuleMeta | undefined {
  return EXPERIMENTAL_MODULES.find((item) => item.id === id);
}

export function getExperimentalModulePromotionReadiness(meta: ExperimentalModuleMeta): ExperimentalPromotionReadiness {
  const progress = getExperimentalModuleProgress(meta);
  const stageRatio = getExperimentalModuleStageIndex(meta) / getExperimentalModuleStageTotal();
  const milestoneCoverage =
    meta.milestones.length > 0 ? getExperimentalModuleDoneCount(meta) / meta.milestones.length : 0;
  const hasOpenWork = meta.milestones.some((item) => item.status !== "done");

  let score = Math.round(progress * 0.65 + stageRatio * 25 + milestoneCoverage * 10);

  if (meta.stage === "prototype") {
    score = Math.min(score, 49);
  } else if (meta.stage === "polish") {
    score = Math.min(score, 74);
  } else if (meta.stage === "validation") {
    score = Math.min(score, hasOpenWork ? 94 : 96);
  } else if (meta.stage === "ready" && !hasOpenWork) {
    score = 100;
  }

  score = Math.max(0, Math.min(100, score));

  if (score >= 95 && meta.stage === "ready" && !hasOpenWork) {
    return {
      score,
      tier: "ready",
      label: "Готов к переводу",
      summary:
        "Ключевые этапы закрыты. Модуль можно переносить в основной каталог без ручной переоценки."
    };
  }

  if (score >= 75) {
    return {
      score,
      tier: "nearly_ready",
      label: "Почти готов",
      summary:
        "Игровая база уже сильная, но перед переводом нужен короткий цикл финальной проверки и полировки."
    };
  }

  return {
    score,
    tier: "not_ready",
    label: "Нужна доработка",
    summary:
      "Переводить рано: сначала нужно стабилизировать UX, системный слой и закрыть оставшиеся этапы."
  };
}
