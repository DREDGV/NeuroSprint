import type { ModeRecommendation, Session, TrainingModeId } from "../../types/domain";

interface ModeRecommendationScore {
  modeId: TrainingModeId;
  priority: number;
  reason: string;
  sampleSize: number;
}

const MODE_IDS: TrainingModeId[] = [
  "classic_plus",
  "timed_plus",
  "reverse",
  "sprint_add_sub",
  "sprint_mixed",
  "reaction_signal",
  "reaction_stroop",
  "reaction_pair",
  "reaction_number",
  "nback_1",
  "nback_1_4x4",
  "nback_2",
  "nback_2_4x4",
  "nback_3",
  "memory_grid_classic",
  "memory_grid_classic_4x4",
  "memory_grid_rush",
  "memory_grid_rush_4x4",
  "decision_kids",
  "decision_standard",
  "decision_pro"
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sortByTimestampDesc(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function scoreGrowthPct(recentDesc: Session[]): number {
  if (recentDesc.length < 2) {
    return 0;
  }
  const newest = recentDesc[0].score;
  const oldest = recentDesc[recentDesc.length - 1].score;
  if (Math.abs(oldest) < 0.0001) {
    return 0;
  }
  return ((newest - oldest) / Math.abs(oldest)) * 100;
}

function sprintTargetSpeed(modeId: TrainingModeId): number {
  return modeId === "sprint_mixed" ? 16 : 20;
}

function isReactionModeId(modeId: TrainingModeId): boolean {
  return (
    modeId === "reaction_signal" ||
    modeId === "reaction_stroop" ||
    modeId === "reaction_pair" ||
    modeId === "reaction_number"
  );
}

function isNBackModeId(modeId: TrainingModeId): boolean {
  return (
    modeId === "nback_1" ||
    modeId === "nback_1_4x4" ||
    modeId === "nback_2" ||
    modeId === "nback_2_4x4" ||
    modeId === "nback_3"
  );
}

function isDecisionModeId(modeId: TrainingModeId): boolean {
  return (
    modeId === "decision_kids" ||
    modeId === "decision_standard" ||
    modeId === "decision_pro"
  );
}

function isMemoryGridModeId(modeId: TrainingModeId): boolean {
  return (
    modeId === "memory_grid_classic" ||
    modeId === "memory_grid_classic_4x4" ||
    modeId === "memory_grid_rush" ||
    modeId === "memory_grid_rush_4x4"
  );
}

function reactionLabel(modeId: TrainingModeId): string {
  if (modeId === "reaction_stroop") {
    return "цвет и слово";
  }
  if (modeId === "reaction_pair") {
    return "пара";
  }
  if (modeId === "reaction_number") {
    return "число-цель";
  }
  return "сигнал";
}

function nBackLabel(modeId: TrainingModeId): string {
  if (modeId === "nback_1_4x4") {
    return "1-back 4x4";
  }
  if (modeId === "nback_2") {
    return "2-back";
  }
  if (modeId === "nback_2_4x4") {
    return "2-back 4x4";
  }
  if (modeId === "nback_3") {
    return "3-back";
  }
  return "1-back";
}

function decisionLabel(modeId: TrainingModeId): string {
  if (modeId === "decision_kids") {
    return "Kids";
  }
  if (modeId === "decision_pro") {
    return "Pro";
  }
  return "Standard";
}

function memoryGridLabel(modeId: TrainingModeId): string {
  if (modeId === "memory_grid_classic_4x4") {
    return "Classic 4x4";
  }
  if (modeId === "memory_grid_rush_4x4") {
    return "Rush 4x4";
  }
  if (modeId === "memory_grid_rush") {
    return "Rush";
  }
  return "Classic";
}

function reactionUntrainedPriority(modeId: TrainingModeId, hasReactionHistory: boolean): number {
  if (hasReactionHistory) {
    return 0.18;
  }
  if (modeId === "reaction_signal") {
    return 0.45;
  }
  if (modeId === "reaction_stroop" || modeId === "reaction_pair") {
    return 0.37;
  }
  return 0.34;
}

function nBackUntrainedPriority(modeId: TrainingModeId, hasNBackHistory: boolean): number {
  if (hasNBackHistory) {
    return 0.16;
  }
  if (modeId === "nback_3") {
    return 0.24;
  }
  if (modeId === "nback_2" || modeId === "nback_2_4x4") {
    return 0.28;
  }
  return 0.3;
}

function decisionUntrainedPriority(modeId: TrainingModeId): number {
  if (modeId === "decision_kids") {
    return 0.33;
  }
  if (modeId === "decision_standard") {
    return 0.3;
  }
  return 0.26;
}

function memoryGridUntrainedPriority(modeId: TrainingModeId): number {
  if (modeId === "memory_grid_classic") {
    return 0.34;
  }
  if (modeId === "memory_grid_rush") {
    return 0.3;
  }
  return 0.26;
}

function reactionTargetMs(modeId: TrainingModeId): number {
  if (modeId === "reaction_stroop") {
    return 950;
  }
  if (modeId === "reaction_pair") {
    return 900;
  }
  if (modeId === "reaction_number") {
    return 800;
  }
  return 600;
}

function nBackTargetSpeed(modeId: TrainingModeId): number {
  if (modeId === "nback_3") {
    return 18;
  }
  if (modeId === "nback_2" || modeId === "nback_2_4x4") {
    return 22;
  }
  return 26;
}

function decisionTargetP90(modeId: TrainingModeId): number {
  if (modeId === "decision_kids") {
    return 1050;
  }
  if (modeId === "decision_pro") {
    return 780;
  }
  return 900;
}

function memoryGridTargetMs(modeId: TrainingModeId): number {
  if (modeId === "memory_grid_classic_4x4" || modeId === "memory_grid_rush_4x4") {
    return 2800;
  }
  return modeId === "memory_grid_rush" ? 2200 : 2500;
}

interface RecommendationBuildContext {
  hasReactionHistory: boolean;
  hasNBackHistory: boolean;
}

function buildModeScore(
  modeId: TrainingModeId,
  sessions: Session[],
  context: RecommendationBuildContext
): ModeRecommendationScore {
  const recentDesc = sortByTimestampDesc(sessions).slice(0, 5);

  if (recentDesc.length === 0) {
    if (isReactionModeId(modeId)) {
      return {
        modeId,
        priority: reactionUntrainedPriority(modeId, context.hasReactionHistory),
        reason: `Вариант Reaction «${reactionLabel(modeId)}» еще не тренировался: добавьте короткую сессию.`,
        sampleSize: 0
      };
    }
    if (isNBackModeId(modeId)) {
      return {
        modeId,
        priority: nBackUntrainedPriority(modeId, context.hasNBackHistory),
        reason: `Режим N-Back Lite (${nBackLabel(modeId)}) еще не тренировался: полезно добавить его сегодня.`,
        sampleSize: 0
      };
    }
    if (isDecisionModeId(modeId)) {
      return {
        modeId,
        priority: decisionUntrainedPriority(modeId),
        reason: `Decision Rush (${decisionLabel(modeId)}) еще не тренировался: добавьте одну короткую серию.`,
        sampleSize: 0
      };
    }
    return {
      modeId,
      priority: 0.95,
      reason: "Режим еще не тренировался: полезно добавить его сегодня.",
      sampleSize: 0
    };
  }

  const avgAccuracy = recentDesc.reduce((sum, entry) => sum + entry.accuracy, 0) / recentDesc.length;
  const growthPct = scoreGrowthPct(recentDesc);
  const avgSpeed = recentDesc.reduce((sum, entry) => sum + entry.speed, 0) / recentDesc.length;

  const accuracyWeakness = clamp(1 - avgAccuracy, 0, 1);
  const trendWeakness = clamp(Math.max(0, -growthPct) / 20, 0, 1);

  let priority = accuracyWeakness * 0.7 + trendWeakness * 0.3;
  let reason = `Точность ${(avgAccuracy * 100).toFixed(1)}%, тренд score ${growthPct.toFixed(1)}%.`;

  if (modeId === "sprint_add_sub" || modeId === "sprint_mixed") {
    const targetSpeed = sprintTargetSpeed(modeId);
    const speedWeakness = clamp((targetSpeed - avgSpeed) / targetSpeed, 0, 1);
    priority += speedWeakness * 0.25;
    reason = `Точность ${(avgAccuracy * 100).toFixed(1)}%, темп ${avgSpeed.toFixed(
      1
    )} задач/мин, тренд score ${growthPct.toFixed(1)}%.`;
  }

  if (isReactionModeId(modeId)) {
    const avgReactionMs = recentDesc.reduce((sum, entry) => sum + entry.durationMs, 0) / recentDesc.length;
    const targetMs = reactionTargetMs(modeId);
    const reactionWeakness = clamp((avgReactionMs - targetMs) / targetMs, 0, 1);
    priority += reactionWeakness * 0.2;
    reason = `Reaction «${reactionLabel(modeId)}»: точность ${(avgAccuracy * 100).toFixed(
      1
    )}%, среднее время ${Math.round(avgReactionMs)} мс, тренд score ${growthPct.toFixed(1)}%.`;
  }

  if (isNBackModeId(modeId)) {
    const targetSpeed = nBackTargetSpeed(modeId);
    const speedWeakness = clamp((targetSpeed - avgSpeed) / targetSpeed, 0, 1);
    priority += speedWeakness * 0.2;
    reason = `N-Back Lite (${nBackLabel(modeId)}): точность ${(avgAccuracy * 100).toFixed(
      1
    )}%, темп ${avgSpeed.toFixed(1)} шаг/мин, тренд score ${growthPct.toFixed(1)}%.`;
  }

  if (isDecisionModeId(modeId)) {
    const p90Values = recentDesc
      .map((entry) => entry.reactionP90Ms ?? entry.durationMs)
      .filter((entry) => Number.isFinite(entry) && entry > 0);
    const avgP90 =
      p90Values.length > 0
        ? p90Values.reduce((sum, value) => sum + value, 0) / p90Values.length
        : 0;
    const targetP90 = decisionTargetP90(modeId);
    const p90Weakness = clamp((avgP90 - targetP90) / targetP90, 0, 1);
    priority += p90Weakness * 0.25;
    reason = `Decision Rush (${decisionLabel(modeId)}): точность ${(avgAccuracy * 100).toFixed(
      1
    )}%, P90 ${Math.round(avgP90)} мс, тренд score ${growthPct.toFixed(1)}%.`;
  }

  return {
    modeId,
    priority,
    reason,
    sampleSize: recentDesc.length
  };
}

export function recommendModeByPerformance(sessions: Session[]): ModeRecommendation {
  if (sessions.length === 0) {
    return {
      modeId: "classic_plus",
      reason: "Начните с базовой оценки в Classic+.",
      confidence: 0.6
    };
  }

  const byMode = new Map<TrainingModeId, Session[]>();
  MODE_IDS.forEach((modeId) => byMode.set(modeId, []));

  const hasReactionHistory = sessions.some((session) => isReactionModeId(session.modeId));
  const hasNBackHistory = sessions.some((session) => isNBackModeId(session.modeId));

  for (const session of sessions) {
    const bucket = byMode.get(session.modeId);
    if (bucket) {
      bucket.push(session);
    }
  }

  const ranked = MODE_IDS.map((modeId) =>
    buildModeScore(modeId, byMode.get(modeId) ?? [], {
      hasReactionHistory,
      hasNBackHistory
    })
  ).sort((a, b) => b.priority - a.priority);

  const selected = ranked[0];
  const second = ranked[1];
  const priorityGap = selected && second ? selected.priority - second.priority : 0;

  let confidence = 0.62;
  if (selected.sampleSize >= 3) {
    confidence += 0.1;
  }
  if (priorityGap >= 0.08) {
    confidence += 0.12;
  }
  if (selected.priority >= 0.65) {
    confidence += 0.06;
  }

  return {
    modeId: selected.modeId,
    reason: selected.reason,
    confidence: clamp(confidence, 0.55, 0.9)
  };
}
