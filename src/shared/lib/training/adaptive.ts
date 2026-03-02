import { getTargetSpeedPerMinute } from "../../../features/schulte/levelConfig";
import type { AdaptiveDecision, Session } from "../../types/domain";

function clampLevel(level: number): number {
  return Math.max(1, Math.min(10, Math.round(level)));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
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
      reason: "Недостаточно данных для пересчёта (нужно 3 сессии).",
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

  const avgNormalizedSpeed =
    window.reduce((sum, entry) => {
      const target = getTargetSpeedPerMinute(entry.modeId, entry.difficulty.gridSize);
      const normalized = target > 0 ? entry.speed / target : 0;
      return sum + Math.max(0, Math.min(1.2, normalized));
    }, 0) / windowSize;

  const meanScore = window.reduce((sum, entry) => sum + entry.score, 0) / windowSize;
  const scoreVariance =
    window.reduce((sum, entry) => sum + (entry.score - meanScore) ** 2, 0) / windowSize;
  const scoreStdDev = Math.sqrt(scoreVariance);
  const consistency = meanScore > 0 ? clamp01(1 - scoreStdDev / meanScore) : 0;

  const readinessScore =
    0.5 * avgAccuracy + 0.3 * clamp01(avgNormalizedSpeed) + 0.2 * consistency;

  let delta: -1 | 0 | 1 = 0;
  let reason = "Уровень сохранён: стабильный баланс точности и темпа.";

  if (readinessScore >= 0.85 && avgAccuracy >= 0.88) {
    delta = 1;
    reason = "Уровень повышен: высокая точность и готовность по темпу.";
  } else if (readinessScore < 0.6 || avgAccuracy < 0.75 || scoreDropPct >= 10) {
    delta = -1;
    reason = "Уровень снижен: точность или устойчивость ниже безопасного порога.";
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
    reason: `${reason} readiness ${(readinessScore * 100).toFixed(0)}%, accuracy ${(
      avgAccuracy * 100
    ).toFixed(0)}%.`,
    applied: delta !== 0,
    source: "auto",
    evaluatedAt: now,
    windowSize
  };
}

