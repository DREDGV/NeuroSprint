import Dexie from "dexie";
import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import { computeAdaptiveDecision } from "../../shared/lib/training/adaptive";
import type {
  AdaptiveDecision,
  ModeRecommendation,
  Session,
  TrainingModeId,
  TrainingModuleId,
  UserModeProfile
} from "../../shared/types/domain";

function normalizeLevel(level: number): number {
  return Math.max(1, Math.min(10, Math.round(level)));
}

function createDefaultProfile(
  userId: string,
  moduleId: TrainingModuleId,
  modeId: TrainingModeId
): UserModeProfile {
  const now = new Date().toISOString();
  return {
    id: createId(),
    userId,
    moduleId,
    modeId,
    level: 1,
    autoAdjust: true,
    manualLevel: null,
    lastDecisionReason: null,
    lastEvaluatedAt: null,
    updatedAt: now
  };
}

function sortByTimestampDesc(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export const trainingRepository = {
  async getUserModeProfile(
    userId: string,
    moduleId: TrainingModuleId,
    modeId: TrainingModeId
  ): Promise<UserModeProfile> {
    const existing = await db.userModeProfiles
      .where("[userId+moduleId+modeId]")
      .equals([userId, moduleId, modeId])
      .first();

    if (existing) {
      return existing;
    }

    const created = createDefaultProfile(userId, moduleId, modeId);
    await db.userModeProfiles.put(created);
    return created;
  },

  async saveUserModeProfile(profile: UserModeProfile): Promise<void> {
    const normalized: UserModeProfile = {
      ...profile,
      level: normalizeLevel(profile.autoAdjust ? profile.level : profile.manualLevel ?? profile.level),
      updatedAt: new Date().toISOString()
    };

    await db.userModeProfiles.put(normalized);
  },

  async listUserModeProfiles(userId: string): Promise<UserModeProfile[]> {
    return db.userModeProfiles.where("userId").equals(userId).toArray();
  },

  async listRecentSessionsByMode(
    userId: string,
    moduleId: TrainingModuleId,
    modeId: TrainingModeId,
    limit: number
  ): Promise<Session[]> {
    return db.sessions
      .where("[userId+moduleId+modeId+timestamp]")
      .between(
        [userId, moduleId, modeId, Dexie.minKey],
        [userId, moduleId, modeId, Dexie.maxKey]
      )
      .reverse()
      .limit(Math.max(1, Math.round(limit)))
      .toArray();
  },

  async evaluateAdaptiveLevel(
    userId: string,
    moduleId: TrainingModuleId,
    modeId: TrainingModeId
  ): Promise<AdaptiveDecision> {
    const profile = await this.getUserModeProfile(userId, moduleId, modeId);
    const recent = await this.listRecentSessionsByMode(userId, moduleId, modeId, 3);
    const ordered = [...recent].reverse();
    const now = new Date().toISOString();

    if (!profile.autoAdjust && profile.manualLevel != null) {
      const manualLevel = normalizeLevel(profile.manualLevel);
      const manualDecision: AdaptiveDecision = {
        userId,
        moduleId,
        modeId,
        previousLevel: profile.level,
        nextLevel: manualLevel,
        delta: manualLevel > profile.level ? 1 : manualLevel < profile.level ? -1 : 0,
        avgAccuracy: 0,
        scoreGrowthPct: 0,
        scoreDropPct: 0,
        reason: "Автоадаптация отключена, применяется ручной уровень.",
        applied: manualLevel !== profile.level,
        source: "manual",
        evaluatedAt: now,
        windowSize: ordered.length
      };

      await this.saveUserModeProfile({
        ...profile,
        level: manualLevel,
        lastDecisionReason: manualDecision.reason,
        lastEvaluatedAt: now
      });
      return manualDecision;
    }

    const decision = computeAdaptiveDecision(ordered, profile.level);
    const nextLevel = normalizeLevel(decision.nextLevel);
    const applied = nextLevel !== profile.level;

    await this.saveUserModeProfile({
      ...profile,
      level: nextLevel,
      lastDecisionReason: decision.reason,
      lastEvaluatedAt: now
    });

    return {
      ...decision,
      userId,
      moduleId,
      modeId,
      previousLevel: profile.level,
      nextLevel,
      delta: nextLevel > profile.level ? 1 : nextLevel < profile.level ? -1 : 0,
      applied,
      source: "auto",
      evaluatedAt: now
    };
  },

  async recommendModeForToday(userId: string): Promise<ModeRecommendation> {
    const sessions = await db.sessions.where("userId").equals(userId).toArray();
    if (sessions.length === 0) {
      return {
        modeId: "classic_plus",
        reason: "Начните с базовой оценки в Classic+.",
        confidence: 0.6
      };
    }

    const byMode = new Map<TrainingModeId, Session[]>();
    for (const session of sessions) {
      const bucket = byMode.get(session.modeId) ?? [];
      bucket.push(session);
      byMode.set(session.modeId, bucket);
    }

    const candidates: Array<{ modeId: TrainingModeId; score: number }> = [];
    (["classic_plus", "timed_plus", "reverse"] as TrainingModeId[]).forEach(
      (modeId) => {
        const items = sortByTimestampDesc(byMode.get(modeId) ?? []).slice(0, 3);
        if (items.length === 0) {
          candidates.push({ modeId, score: 0 });
          return;
        }
        const avgAccuracy =
          items.reduce((sum, entry) => sum + entry.accuracy, 0) / items.length;
        candidates.push({ modeId, score: avgAccuracy });
      }
    );

    candidates.sort((a, b) => a.score - b.score);
    const target = candidates[0];
    return {
      modeId: target.modeId,
      reason:
        "Рекомендуем потренировать режим с наименьшей текущей стабильностью точности.",
      confidence: 0.75
    };
  }
};
