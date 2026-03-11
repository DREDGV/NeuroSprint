import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import { buildSkillProfile } from "../../shared/lib/training/skillProfile";
import { getSkillBenchmarks, calculatePercentile } from "./skillBenchmarkRepository";
import type { SkillComparison, SkillProfileId, SkillRank } from "../../shared/types/domain";

async function getOrCreateComparison(userId: string, skillId: SkillProfileId, userScore: number): Promise<SkillComparison> {
  const existing = await db.skillComparisons.where("[userId+skillId]").equals([userId, skillId]).first();
  if (existing) return existing;
  const now = new Date().toISOString();
  const comparison: SkillComparison = { id: createId(), userId, skillId, userScore, percentile: 0, rank: "bottom_50%", createdAt: now, updatedAt: now };
  await db.skillComparisons.put(comparison);
  return comparison;
}

async function updateComparison(userId: string, skillId: SkillProfileId, userScore: number, percentile: number, rank: SkillRank): Promise<SkillComparison> {
  const existing = await db.skillComparisons.where("[userId+skillId]").equals([userId, skillId]).first();
  const now = new Date().toISOString();
  const comparison: SkillComparison = existing ? { ...existing, userScore, percentile, rank, updatedAt: now } : { id: createId(), userId, skillId, userScore, percentile, rank, createdAt: now, updatedAt: now };
  await db.skillComparisons.put(comparison);
  return comparison;
}

export async function updateAllSkillComparisons(userId: string): Promise<SkillComparison[]> {
  const sessions = await db.sessions.where("userId").equals(userId).toArray();
  const profile = buildSkillProfile(sessions);
  const comparisons: SkillComparison[] = [];
  for (const axis of profile.axes) {
    const benchmark = await getSkillBenchmarks(axis.id);
    const { percentile, rank } = calculatePercentile(axis.score, benchmark);
    const comparison = await updateComparison(userId, axis.id, axis.score, percentile, rank as SkillRank);
    comparisons.push(comparison);
  }
  return comparisons;
}

export async function getUserSkillComparisons(userId: string): Promise<SkillComparison[]> {
  return db.skillComparisons.where("userId").equals(userId).sortBy("skillId");
}

export async function getSkillComparison(userId: string, skillId: SkillProfileId): Promise<SkillComparison | null> {
  const result = await db.skillComparisons.where("[userId+skillId]").equals([userId, skillId]).first();
  return result ?? null;
}

export async function getSkillSummary(userId: string) {
  const comparisons = await getUserSkillComparisons(userId);
  if (comparisons.length === 0) return { totalSkills: 0, avgPercentile: 0, bestSkill: null, weakestSkill: null, topRankCount: 0 };
  const avgPercentile = comparisons.reduce((sum, c) => sum + c.percentile, 0) / comparisons.length;
  const bestSkill = comparisons.reduce((best, c) => c.percentile > best.percentile ? c : best);
  const weakestSkill = comparisons.reduce((weakest, c) => c.percentile < weakest.percentile ? c : weakest);
  const topRankCount = comparisons.filter(c => c.percentile >= 75).length;
  return { totalSkills: comparisons.length, avgPercentile: Math.round(avgPercentile), bestSkill, weakestSkill, topRankCount };
}

export async function getRankedSkills(userId: string): Promise<SkillComparison[]> {
  const comparisons = await getUserSkillComparisons(userId);
  return comparisons.sort((a, b) => b.percentile - a.percentile);
}

export async function checkRankChange(userId: string, skillId: SkillProfileId, newPercentile: number) {
  const existing = await getSkillComparison(userId, skillId);
  if (!existing) return { changed: false };
  const oldRank = existing.rank;
  const newRank = getRankFromPercentile(newPercentile);
  if (oldRank === newRank) return { changed: false };
  return { changed: true, oldRank, newRank };
}

function getRankFromPercentile(percentile: number): SkillRank {
  if (percentile >= 99) return "top_1%";
  if (percentile >= 95) return "top_5%";
  if (percentile >= 90) return "top_10%";
  if (percentile >= 75) return "top_25%";
  if (percentile >= 50) return "top_50%";
  return "bottom_50%";
}

export async function clearUserComparisons(userId: string): Promise<void> {
  const comparisons = await getUserSkillComparisons(userId);
  const ids = comparisons.map(c => c.id);
  await db.skillComparisons.bulkDelete(ids);
}

export const skillComparisonRepository = { getOrCreateComparison, updateComparison, updateAllSkillComparisons, getUserSkillComparisons, getSkillComparison, getSkillSummary, getRankedSkills, checkRankChange, clearUserComparisons };
