import type { AdaptiveDecision, Session } from "../../types/domain";

function clampLevel(level: number): number {
  return Math.max(1, Math.min(10, Math.round(level)));
}

export function computeAdaptiveDecision(
  sessions: Session[],
  previousLevel: number
): AdaptiveDecision {
  const now = new Date().toISOString();

  const sorted = [...sessions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const window = sorted.slice(-3);
  const windowSize = window.length;

  if (windowSize < 3) {
    return {
      userId: sessions[0]?.userId ?? "",
      moduleId: "schulte",
      modeId: sessions[0]?.modeId ?? "classic_plus",
      previousLevel,
      nextLevel: previousLevel,
      delta: 0,
      avgAccuracy: 0,
      scoreGrowthPct: 0,
      scoreDropPct: 0,
      reason: "Недостаточно данных для пересчета (нужно 3 сессии).",
      applied: false,
      source: "auto",
      evaluatedAt: now,
      windowSize
    };
  }

  const first = window[0];
  const last = window[window.length - 1];
  const avgAccuracy = window.reduce((sum, entry) => sum + entry.accuracy, 0) / windowSize;
  const scoreGrowthPct =
    first.score > 0 ? ((last.score - first.score) / first.score) * 100 : 0;
  const scoreDropPct =
    first.score > 0 ? ((first.score - last.score) / first.score) * 100 : 0;

  let delta: -1 | 0 | 1 = 0;
  let reason = "Уровень сохранен: стабильная динамика.";

  if (avgAccuracy >= 0.9 && scoreGrowthPct >= 8) {
    delta = 1;
    reason = "Уровень повышен: высокая точность и устойчивый рост score.";
  } else if (avgAccuracy < 0.75 || scoreDropPct >= 10) {
    delta = -1;
    reason = "Уровень снижен: точность ниже порога или заметная просадка score.";
  }

  const nextLevel = clampLevel(previousLevel + delta);

  return {
    userId: last.userId,
    moduleId: last.moduleId,
    modeId: last.modeId,
    previousLevel,
    nextLevel,
    delta,
    avgAccuracy,
    scoreGrowthPct,
    scoreDropPct,
    reason,
    applied: delta !== 0,
    source: "auto",
    evaluatedAt: now,
    windowSize
  };
}

