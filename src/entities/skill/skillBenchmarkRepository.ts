import { db } from "../../db/database";
import type { SkillBenchmark, SkillProfileId } from "../../shared/types/domain";

const VIRTUAL_BENCHMARKS: Record<SkillProfileId, Omit<SkillBenchmark, "skillId" | "lastUpdated" | "source">> = {
  attention: { avg: 42, median: 40, top25: 68, top10: 82, sampleSize: 10000 },
  memory: { avg: 38, median: 36, top25: 62, top10: 78, sampleSize: 10000 },
  reaction: { avg: 45, median: 43, top25: 72, top10: 85, sampleSize: 10000 },
  math: { avg: 40, median: 38, top25: 65, top10: 80, sampleSize: 10000 },
  logic: { avg: 44, median: 42, top25: 70, top10: 83, sampleSize: 10000 }
};

export async function getSkillBenchmarks(skillId: SkillProfileId): Promise<SkillBenchmark> {
  const cached = await db.skillBenchmarks.get(skillId as string);
  if (cached && cached.source === "virtual") return cached;
  const benchmark: SkillBenchmark = { skillId, ...VIRTUAL_BENCHMARKS[skillId], lastUpdated: new Date().toISOString(), source: "virtual" };
  await db.skillBenchmarks.put(benchmark);
  return benchmark;
}

export async function getAllBenchmarks(): Promise<SkillBenchmark[]> {
  const skills: SkillProfileId[] = ["attention", "memory", "reaction", "math", "logic"];
  return Promise.all(skills.map(skill => getSkillBenchmarks(skill)));
}

export async function updateBenchmarksFromServer(benchmarks: SkillBenchmark[]): Promise<void> {
  await db.skillBenchmarks.bulkPut(benchmarks);
}

export async function clearBenchmarksCache(): Promise<void> {
  await db.skillBenchmarks.clear();
}

export function calculatePercentile(userScore: number, benchmark: SkillBenchmark): { percentile: number; rank: string } {
  const { top10, top25, median, avg } = benchmark;
  let percentile: number;
  if (userScore >= top10) percentile = 90 + Math.min(10, (userScore - top10) / 10);
  else if (userScore >= top25) percentile = 75 + ((userScore - top25) / (top10 - top25)) * 15;
  else if (userScore >= median) percentile = 50 + ((userScore - median) / (top25 - median)) * 25;
  else if (userScore >= avg) percentile = 25 + ((userScore - avg) / (median - avg)) * 25;
  else percentile = Math.max(0, 25 * (userScore / avg));
  let rank: string;
  if (percentile >= 99) rank = "top_1%";
  else if (percentile >= 95) rank = "top_5%";
  else if (percentile >= 90) rank = "top_10%";
  else if (percentile >= 75) rank = "top_25%";
  else if (percentile >= 50) rank = "top_50%";
  else rank = "bottom_50%";
  return { percentile: Math.round(percentile), rank };
}

export const skillBenchmarkRepository = { getSkillBenchmarks, getAllBenchmarks, updateBenchmarksFromServer, clearBenchmarksCache, calculatePercentile };
