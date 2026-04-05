import type { Session, TrainingModuleId } from "../../types/domain";
import { buildSkillProfile, type SkillProfileId, type SkillProfileSummary } from "./skillProfile";

export interface SkillGuidanceSummary {
  profile: SkillProfileSummary;
  hasData: boolean;
  focusSkillId: SkillProfileId;
  focusLabel: string;
  strongestSkillId: SkillProfileId;
  strongestLabel: string;
  primaryModuleId: TrainingModuleId;
  primaryModuleTitle: string;
  supportingModuleIds: TrainingModuleId[];
  headline: string;
  summary: string;
  nextStep: string;
  ctaLabel: string;
}

export interface SkillGuidanceDefinition {
  primaryModuleId: TrainingModuleId;
  primaryModuleTitle: string;
  supportingModuleIds: TrainingModuleId[];
}

const SKILL_GUIDANCE_BY_ID: Record<SkillProfileId, SkillGuidanceDefinition> = {
  attention: {
    primaryModuleId: "schulte",
    primaryModuleTitle: "Таблица Шульте",
    supportingModuleIds: ["pattern_recognition", "reaction"]
  },
  memory: {
    primaryModuleId: "memory_match",
    primaryModuleTitle: "Пары памяти",
    supportingModuleIds: ["memory_grid", "n_back"]
  },
  reaction: {
    primaryModuleId: "reaction",
    primaryModuleTitle: "Реакция",
    supportingModuleIds: ["decision_rush", "schulte"]
  },
  math: {
    primaryModuleId: "sprint_math",
    primaryModuleTitle: "Математический спринт",
    supportingModuleIds: ["pattern_recognition"]
  },
  logic: {
    primaryModuleId: "pattern_recognition",
    primaryModuleTitle: "Распознавание паттернов",
    supportingModuleIds: ["decision_rush", "sprint_math"]
  }
};

function resolveStarterFocus(profile: SkillProfileSummary) {
  return profile.axes.find((axis) => axis.id === "memory") ?? profile.focus;
}

function resolveStarterStrongest(profile: SkillProfileSummary) {
  return profile.axes.find((axis) => axis.id === "attention") ?? profile.strongest;
}

function resolveMeaningfulStrongest(profile: SkillProfileSummary) {
  const directAxes = profile.axes.filter((axis) => axis.sessions > 0);
  if (directAxes.length === 0) {
    return profile.strongest;
  }

  return [...directAxes].sort((left, right) => right.score - left.score)[0];
}

export function getSkillGuidanceDefinition(skillId: SkillProfileId): SkillGuidanceDefinition {
  return SKILL_GUIDANCE_BY_ID[skillId];
}

export function buildSkillGuidance(
  sessions: Session[],
  now = new Date()
): SkillGuidanceSummary {
  const profile = buildSkillProfile(sessions, now);
  const focusAxis = profile.hasData ? profile.focus : resolveStarterFocus(profile);
  const strongestAxis = profile.hasData
    ? resolveMeaningfulStrongest(profile)
    : resolveStarterStrongest(profile);
  const guidance = getSkillGuidanceDefinition(focusAxis.id);

  if (!profile.hasData) {
    return {
      profile,
      hasData: false,
      focusSkillId: focusAxis.id,
      focusLabel: focusAxis.label,
      strongestSkillId: strongestAxis.id,
      strongestLabel: strongestAxis.label,
      primaryModuleId: guidance.primaryModuleId,
      primaryModuleTitle: guidance.primaryModuleTitle,
      supportingModuleIds: guidance.supportingModuleIds,
      headline: "Соберите стартовый профиль",
      summary:
        "Сделайте 3–5 коротких сессий на память, внимание и реакцию, чтобы система увидела сильные стороны и зоны роста.",
      nextStep: `Лучший старт сейчас: ${guidance.primaryModuleTitle}.`,
      ctaLabel: "Собрать профиль"
    };
  }

  return {
    profile,
    hasData: true,
    focusSkillId: focusAxis.id,
    focusLabel: focusAxis.label,
    strongestSkillId: strongestAxis.id,
    strongestLabel: strongestAxis.label,
    primaryModuleId: guidance.primaryModuleId,
    primaryModuleTitle: guidance.primaryModuleTitle,
    supportingModuleIds: guidance.supportingModuleIds,
    headline: `Сейчас стоит усилить ${focusAxis.label.toLowerCase()}`,
    summary:
      `Сильнее всего уже выглядит навык «${strongestAxis.label}», а лучший следующий шаг — спокойно подтянуть ${focusAxis.label.toLowerCase()}. ` +
      `Начните с ${guidance.primaryModuleTitle}.`,
    nextStep: `Лучший шаг сейчас: ${guidance.primaryModuleTitle}.`,
    ctaLabel: `Открыть ${guidance.primaryModuleTitle}`
  };
}
