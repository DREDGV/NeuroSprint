import {
  getSkillBenchmarks,
  calculatePercentile as calcPercentile
} from "../../../entities/skill/skillBenchmarkRepository";
import type {
  SkillPercentile,
  SkillProfileId,
  SkillRank,
  SkillBenchmark,
  SkillSummary,
  SkillMapSummary
} from "../../../shared/types/domain";

export async function calculateSkillPercentile(
  skillId: SkillProfileId,
  userScore: number
): Promise<SkillPercentile> {
  const benchmark = await getSkillBenchmarks(skillId);
  const { percentile, rank } = calcPercentile(userScore, benchmark);

  return {
    skillId,
    userScore,
    percentile,
    rank: rank as SkillRank,
    sampleSize: benchmark.sampleSize,
    source: benchmark.source
  };
}

export async function calculateAllSkillPercentiles(
  skillScores: Record<SkillProfileId, number>
): Promise<SkillPercentile[]> {
  const skills = Object.keys(skillScores) as SkillProfileId[];
  const results: SkillPercentile[] = [];

  for (const skillId of skills) {
    const score = skillScores[skillId];
    if (score === undefined || score === null) continue;

    results.push(await calculateSkillPercentile(skillId, score));
  }

  return results;
}

export function getRankDescription(rank: SkillRank): string {
  const descriptions: Record<SkillRank, string> = {
    "top_1%": "Легендарный результат. Вы уже в топ-1% пользователей.",
    "top_5%": "Очень высокий уровень. Вы в топ-5% пользователей.",
    "top_10%": "Сильный результат. Вы в топ-10% пользователей.",
    "top_25%": "Выше среднего. Навык уже развит лучше, чем у большинства.",
    "top_50%": "Около середины. База есть, но потенциал роста ещё большой.",
    "bottom_50%": "Пока ниже среднего. Здесь особенно заметен запас для прогресса."
  };

  return descriptions[rank] || "";
}

export function getRankColor(rank: SkillRank): string {
  const colors: Record<SkillRank, string> = {
    "top_1%": "#FFD700",
    "top_5%": "#9932CC",
    "top_10%": "#4169E1",
    "top_25%": "#32CD32",
    "top_50%": "#FFA500",
    "bottom_50%": "#808080"
  };

  return colors[rank] || "#808080";
}

export function getSkillLevel(score: number): "weak" | "medium" | "strong" {
  if (score < 40) return "weak";
  if (score < 70) return "medium";
  return "strong";
}

export async function getSkillSummary(
  skillId: SkillProfileId,
  userScore: number,
  improvements: number = 0
): Promise<SkillSummary> {
  const { percentile, rank } = calcPercentile(userScore, await getSkillBenchmarks(skillId));

  return {
    skillId,
    score: userScore,
    percentile,
    rank: rank as SkillRank,
    level: getSkillLevel(userScore),
    improvements
  };
}

export async function getSkillMapSummary(
  userId: string,
  skillScores: Record<SkillProfileId, number>
): Promise<SkillMapSummary> {
  const skills = Object.keys(skillScores) as SkillProfileId[];
  const summaries: SkillSummary[] = [];

  for (const skillId of skills) {
    const score = skillScores[skillId];
    if (score === undefined || score === null) continue;

    summaries.push(await getSkillSummary(skillId, score));
  }

  const avgPercentile = summaries.length > 0
    ? Math.round(summaries.reduce((sum, summary) => sum + summary.percentile, 0) / summaries.length)
    : 0;

  const bestSkill = summaries.length > 0
    ? summaries.reduce((best, summary) => summary.percentile > best.percentile ? summary : best)
    : null;

  const weakestSkill = summaries.length > 0
    ? summaries.reduce((weakest, summary) => summary.percentile < weakest.percentile ? summary : weakest)
    : null;

  const topRankCount = summaries.filter((summary) => summary.percentile >= 75).length;

  return {
    userId,
    skills: summaries,
    avgPercentile,
    bestSkill,
    weakestSkill,
    topRankCount,
    lastUpdated: new Date().toISOString()
  };
}

export function getBenchmarkDescription(benchmark: SkillBenchmark): string {
  return `Средний уровень: ${benchmark.avg} · топ-25%: ${benchmark.top25} · топ-10%: ${benchmark.top10}`;
}

export function compareSkills(
  skill1: SkillSummary,
  skill2: SkillSummary
): {
  better: SkillSummary;
  worse: SkillSummary;
  percentileDiff: number;
} {
  const percentileDiff = Math.abs(skill1.percentile - skill2.percentile);

  return {
    better: skill1.percentile >= skill2.percentile ? skill1 : skill2,
    worse: skill1.percentile < skill2.percentile ? skill1 : skill2,
    percentileDiff
  };
}

export const skillPercentileService = {
  calculateSkillPercentile,
  calculateAllSkillPercentiles,
  getRankDescription,
  getRankColor,
  getSkillLevel,
  getSkillSummary,
  getSkillMapSummary,
  getBenchmarkDescription,
  compareSkills
};