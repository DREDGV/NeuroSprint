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
  "sprint_mixed"
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

function buildModeScore(modeId: TrainingModeId, sessions: Session[]): ModeRecommendationScore {
  const recentDesc = sortByTimestampDesc(sessions).slice(0, 5);

  if (recentDesc.length === 0) {
    return {
      modeId,
      priority: 0.95,
      reason: "Режим ещё не тренировался: полезно добавить его сегодня.",
      sampleSize: 0
    };
  }

  const avgAccuracy =
    recentDesc.reduce((sum, entry) => sum + entry.accuracy, 0) / recentDesc.length;
  const growthPct = scoreGrowthPct(recentDesc);
  const avgSpeed =
    recentDesc.reduce((sum, entry) => sum + entry.speed, 0) / recentDesc.length;

  const accuracyWeakness = clamp(1 - avgAccuracy, 0, 1);
  const trendWeakness = clamp(Math.max(0, -growthPct) / 20, 0, 1);

  let priority = accuracyWeakness * 0.7 + trendWeakness * 0.3;
  let reason = `Точность ${(avgAccuracy * 100).toFixed(1)}%, тренд score ${growthPct.toFixed(
    1
  )}%.`;

  if (modeId === "sprint_add_sub" || modeId === "sprint_mixed") {
    const targetSpeed = sprintTargetSpeed(modeId);
    const speedWeakness = clamp((targetSpeed - avgSpeed) / targetSpeed, 0, 1);
    priority += speedWeakness * 0.25;
    reason = `Точность ${(avgAccuracy * 100).toFixed(1)}%, темп ${avgSpeed.toFixed(
      1
    )} задач/мин, тренд score ${growthPct.toFixed(1)}%.`;
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
  for (const modeId of MODE_IDS) {
    byMode.set(modeId, []);
  }

  for (const session of sessions) {
    const bucket = byMode.get(session.modeId) ?? [];
    bucket.push(session);
    byMode.set(session.modeId, bucket);
  }

  const ranked = MODE_IDS.map((modeId) => buildModeScore(modeId, byMode.get(modeId) ?? [])).sort(
    (a, b) => b.priority - a.priority
  );

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
