import type { Session, TrainingModuleId } from "../../types/domain";
import {
  buildSkillGuidance,
  getSkillGuidanceDefinition,
  type SkillGuidanceSummary
} from "./skillGuidance";

export type SkillRoadmapTone = "focus" | "support" | "maintain" | "checkpoint";

export interface SkillRoadmapDay {
  day: number;
  dayLabel: string;
  tone: SkillRoadmapTone;
  toneLabel: string;
  title: string;
  moduleId: TrainingModuleId;
  moduleTitle: string;
  note: string;
}

export interface SkillRoadmapSummary {
  hasData: boolean;
  headline: string;
  summary: string;
  weekGoal: string;
  cadence: string;
  checkpoint: string;
  guidance: SkillGuidanceSummary;
  days: SkillRoadmapDay[];
}

const MODULE_TITLE_BY_ID: Record<TrainingModuleId, string> = {
  schulte: "Таблица Шульте",
  sprint_math: "Sprint Math",
  reaction: "Reaction",
  n_back: "N-Back Lite",
  memory_grid: "Memory Grid",
  spatial_memory: "Spatial Memory",
  decision_rush: "Decision Rush",
  memory_match: "Memory Match",
  pattern_recognition: "Pattern Recognition"
};

function moduleTitle(moduleId: TrainingModuleId): string {
  return MODULE_TITLE_BY_ID[moduleId];
}

function buildDay(
  day: number,
  tone: SkillRoadmapTone,
  toneLabel: string,
  title: string,
  moduleId: TrainingModuleId,
  note: string
): SkillRoadmapDay {
  return {
    day,
    dayLabel: `День ${day}`,
    tone,
    toneLabel,
    title,
    moduleId,
    moduleTitle: moduleTitle(moduleId),
    note
  };
}

function buildStarterRoadmap(guidance: SkillGuidanceSummary): SkillRoadmapSummary {
  return {
    hasData: false,
    headline: "7-дневный старт профиля",
    summary:
      "Неделя без перегруза: по одной короткой сессии в разных типах тренажёров, чтобы система увидела сильные стороны и реальные зоны роста.",
    weekGoal: "Собрать честную базу по памяти, вниманию, реакции, счёту и логике.",
    cadence: "7 коротких сессий без перегруза. Главное здесь не рекорды, а ровная выборка.",
    checkpoint:
      "В конце недели вернитесь к Memory Match и посмотрите, как изменится карта навыков после первых спокойных касаний.",
    guidance,
    days: [
      buildDay(
        1,
        "focus",
        "Старт",
        "Снять первую точку по памяти",
        "memory_match",
        "Начните с заметных пар и спокойно соберите первый ориентир по зрительной памяти."
      ),
      buildDay(
        2,
        "support",
        "Поддержка",
        "Добавить устойчивое внимание",
        "schulte",
        "Нужна простая база по фокусу, чтобы карта навыков не строилась только на памяти."
      ),
      buildDay(
        3,
        "support",
        "Проверка",
        "Понять темп отклика",
        "reaction",
        "Одна быстрая реакционная сессия покажет, насколько уверенно вы держите скорость."
      ),
      buildDay(
        4,
        "support",
        "Расширение",
        "Подключить логику",
        "pattern_recognition",
        "Добавьте распознавание закономерностей, чтобы профиль не был однобоким."
      ),
      buildDay(
        5,
        "support",
        "Баланс",
        "Проверить темп счёта",
        "sprint_math",
        "Спокойный числовой раунд даст системе ещё одну опорную ось."
      ),
      buildDay(
        6,
        "support",
        "Уточнение",
        "Проверить удержание образов",
        "memory_grid",
        "Эта сессия уточнит, как вы держите визуальные позиции без спешки."
      ),
      buildDay(
        7,
        "checkpoint",
        "Контроль",
        "Собрать первую контрольную точку",
        "memory_match",
        "Вернитесь к первому фокусу, чтобы уже через неделю увидеть осмысленную разницу."
      )
    ]
  };
}

function focusSummary(delta: number, focusLabel: string, strongestLabel: string): string {
  if (delta <= -4) {
    return `Неделя на стабилизацию: спокойно верните ${focusLabel.toLowerCase()} в рабочий ритм и удержите опору в «${strongestLabel}».`;
  }
  if (delta >= 4) {
    return `Навык «${focusLabel}» уже растёт. Задача недели — закрепить его без перегруза и не потерять сильную сторону «${strongestLabel}».`;
  }
  return `Спокойно доберите повторения в зоне «${focusLabel}» и раз в несколько дней поддержите сильную сторону «${strongestLabel}».`;
}

function uniqueModules(moduleIds: TrainingModuleId[]): TrainingModuleId[] {
  return [...new Set(moduleIds)];
}

function resolveMaintainModule(
  focusModuleId: TrainingModuleId,
  strongestModuleId: TrainingModuleId
): TrainingModuleId {
  if (strongestModuleId !== focusModuleId) {
    return strongestModuleId;
  }
  return focusModuleId === "memory_match" ? "schulte" : "memory_match";
}

export function buildSkillRoadmap(
  sessions: Session[],
  now = new Date()
): SkillRoadmapSummary {
  const guidance = buildSkillGuidance(sessions, now);
  if (!guidance.hasData) {
    return buildStarterRoadmap(guidance);
  }

  const focusAxis =
    guidance.profile.axes.find((axis) => axis.id === guidance.focusSkillId) ?? guidance.profile.focus;
  const focusDefinition = getSkillGuidanceDefinition(guidance.focusSkillId);
  const strongestDefinition = getSkillGuidanceDefinition(guidance.strongestSkillId);
  const focusModuleId = focusDefinition.primaryModuleId;
  const strongestPrimaryModuleId = strongestDefinition.primaryModuleId;
  const supportModules = uniqueModules([
    ...focusDefinition.supportingModuleIds,
    ...strongestDefinition.supportingModuleIds,
    strongestPrimaryModuleId
  ]).filter((moduleId) => moduleId !== focusModuleId);
  const firstSupportModuleId = supportModules[0] ?? strongestPrimaryModuleId;
  const secondSupportModuleId = supportModules[1] ?? firstSupportModuleId;
  const maintainModuleId = resolveMaintainModule(focusModuleId, strongestPrimaryModuleId);

  return {
    hasData: true,
    headline: `7 дней на ${guidance.focusLabel.toLowerCase()}`,
    summary: focusSummary(focusAxis.trendDelta, guidance.focusLabel, guidance.strongestLabel),
    weekGoal: `Подтянуть ${guidance.focusLabel.toLowerCase()} и не просадить сильную сторону «${guidance.strongestLabel}».`,
    cadence: "4 фокусных дня, 2 поддерживающих и 1 контрольный. Такой ритм обычно даёт рост без перегруза.",
    checkpoint: `В конце недели вернитесь в ${focusDefinition.primaryModuleTitle} и сравните ощущение темпа, точности и устойчивости.`,
    guidance,
    days: [
      buildDay(
        1,
        "focus",
        "Фокус",
        "Войти в ритм недели",
        focusModuleId,
        `Начните с ${focusDefinition.primaryModuleTitle} без спешки: сейчас важнее чистота и устойчивость, чем максимальный темп.`
      ),
      buildDay(
        2,
        "support",
        "Поддержка",
        "Подсветить навык с другого угла",
        firstSupportModuleId,
        "Эта сессия поддержит фокус недели через соседний навык и не даст плану стать однообразным."
      ),
      buildDay(
        3,
        "focus",
        "Фокус",
        "Закрепить базу",
        focusModuleId,
        focusAxis.trendDelta <= -4
          ? "Сделайте ещё один спокойный подход и верните привычную точность."
          : "Повторите фокусный тренажёр, чтобы новый темп закрепился не случайно, а стабильно."
      ),
      buildDay(
        4,
        "maintain",
        "Опора",
        "Не терять сильную сторону",
        maintainModuleId,
        `Поддержите навык «${guidance.strongestLabel}», чтобы общий профиль рос ровно, без перекоса в одну ось.`
      ),
      buildDay(
        5,
        "focus",
        "Фокус",
        "Поднять рабочий темп",
        focusModuleId,
        "Если база держится, добавьте чуть больше темпа. Если нет, оставьте прежний ритм и не форсируйте."
      ),
      buildDay(
        6,
        "support",
        "Поддержка",
        "Смешать нагрузку",
        secondSupportModuleId,
        "Короткая смена типа задачи поможет сохранить внимание к плану без утомления."
      ),
      buildDay(
        7,
        "checkpoint",
        "Контроль",
        "Проверить неделю",
        focusModuleId,
        `Вернитесь в ${focusDefinition.primaryModuleTitle}, чтобы увидеть, как изменилась ${guidance.focusLabel.toLowerCase()} после недели спокойной практики.`
      )
    ]
  };
}
