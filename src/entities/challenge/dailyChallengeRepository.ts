import { db } from "../../db/database";
import { toLocalDateKey } from "../../shared/lib/date/date";
import { createId } from "../../shared/lib/id";
import { moduleIdByModeId } from "../../shared/lib/training/modeMapping";
import type {
  DailyChallenge,
  DailyChallengeAttempt,
  DailyChallengeCompletionSummary,
  DailyChallengeHistoryItem,
  DailyChallengeProgress,
  ComparePeriod,
  Session,
  TrainingModeId
} from "../../shared/types/domain";

const DAILY_CHALLENGE_MODE_ROTATION: TrainingModeId[] = [
  "classic_plus",
  "timed_plus",
  "reverse",
  "sprint_add_sub",
  "sprint_mixed",
  "reaction_signal",
  "reaction_stroop",
  "reaction_pair"
];

const MODE_TITLES: Record<TrainingModeId, string> = {
  classic_plus: "Classic+",
  timed_plus: "Timed+",
  reverse: "Reverse",
  sprint_add_sub: "Sprint Add/Sub",
  sprint_mixed: "Sprint Mixed",
  reaction_signal: "Reaction: Сигнал",
  reaction_stroop: "Reaction: Цвет и слово",
  reaction_pair: "Reaction: Пара"
};

function addDays(localDate: string, days: number): string {
  const [year, month, day] = localDate
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const value = new Date(year, (month || 1) - 1, day || 1);
  value.setDate(value.getDate() + days);
  return toLocalDateKey(value);
}

function toDayNumber(localDate: string): number {
  const [year, month, day] = localDate
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return 0;
  }
  return year * 10_000 + month * 100 + day;
}

function resolvePeriodStartLocalDate(period: ComparePeriod): string | null {
  if (period === "all") {
    return null;
  }
  const safePeriod = Number.isFinite(period) && period > 0 ? Math.round(period) : 30;
  const from = new Date();
  from.setDate(from.getDate() - safePeriod + 1);
  return toLocalDateKey(from);
}

async function listChallengesForPeriod(
  userId: string,
  period: ComparePeriod
): Promise<DailyChallenge[]> {
  const fromLocalDate = resolvePeriodStartLocalDate(period);
  if (!fromLocalDate) {
    return db.dailyChallenges
      .where("userId")
      .equals(userId)
      .sortBy("localDate");
  }
  return db.dailyChallenges
    .where("[userId+localDate]")
    .between([userId, fromLocalDate], [userId, "9999-12-31"])
    .toArray();
}

export function resolveDailyChallengeModeId(localDate: string): TrainingModeId {
  const seed = Math.max(0, toDayNumber(localDate));
  const index = seed % DAILY_CHALLENGE_MODE_ROTATION.length;
  return DAILY_CHALLENGE_MODE_ROTATION[index] ?? "classic_plus";
}

export function getChallengeLaunchPath(modeId: TrainingModeId): string {
  const moduleId = moduleIdByModeId(modeId);
  if (moduleId === "sprint_math") {
    return `/training/sprint-math?mode=${modeId}`;
  }
  if (moduleId === "reaction") {
    return `/training/reaction?mode=${modeId}`;
  }
  return `/training/schulte?mode=${modeId}`;
}

export function getChallengeModeTitle(modeId: TrainingModeId): string {
  return MODE_TITLES[modeId] ?? "Режим";
}

export function listUpcomingDailyChallengeModes(
  startLocalDate: string,
  daysCount = 3
): Array<{ localDate: string; modeId: TrainingModeId; modeTitle: string }> {
  const count = Math.max(1, Math.min(14, Math.floor(daysCount)));
  return Array.from({ length: count }, (_, offset) => {
    const localDate = addDays(startLocalDate, offset);
    const modeId = resolveDailyChallengeModeId(localDate);
    return {
      localDate,
      modeId,
      modeTitle: getChallengeModeTitle(modeId)
    };
  });
}

function buildChallengeTitle(modeId: TrainingModeId): string {
  const modeTitle = getChallengeModeTitle(modeId);
  return `Challenge дня: ${modeTitle}`;
}

function buildChallengeDescription(modeId: TrainingModeId): string {
  const modeTitle = getChallengeModeTitle(modeId);
  return `Пройдите 1 сессию в режиме «${modeTitle}».`;
}

function buildChallengeDraft(userId: string, localDate: string): DailyChallenge {
  const modeId = resolveDailyChallengeModeId(localDate);
  const now = new Date().toISOString();
  return {
    id: `${userId}:${localDate}`,
    userId,
    localDate,
    moduleId: moduleIdByModeId(modeId),
    modeId,
    status: "pending",
    requiredAttempts: 1,
    title: buildChallengeTitle(modeId),
    description: buildChallengeDescription(modeId),
    createdAt: now,
    completedAt: null
  };
}

async function markCompletedIfNeeded(
  challenge: DailyChallenge,
  attemptsCount: number
): Promise<DailyChallenge> {
  if (attemptsCount < challenge.requiredAttempts || challenge.status === "completed") {
    return challenge;
  }

  const completedAt = challenge.completedAt ?? new Date().toISOString();
  await db.dailyChallenges.update(challenge.id, {
    status: "completed",
    completedAt
  });

  return {
    ...challenge,
    status: "completed",
    completedAt
  };
}

function buildProgress(challenge: DailyChallenge, attemptsCount: number): DailyChallengeProgress {
  const completed = challenge.status === "completed" || attemptsCount >= challenge.requiredAttempts;
  const remainingAttempts = Math.max(0, challenge.requiredAttempts - attemptsCount);
  return {
    challenge,
    attemptsCount,
    remainingAttempts,
    completed,
    launchPath: getChallengeLaunchPath(challenge.modeId),
    progressLabel: `${Math.min(attemptsCount, challenge.requiredAttempts)} / ${challenge.requiredAttempts}`
  };
}

async function synchronizeAttempts(challenge: DailyChallenge): Promise<number> {
  const existingAttempts = await db.dailyChallengeAttempts
    .where("challengeId")
    .equals(challenge.id)
    .toArray();
  const existingSessionIds = new Set(existingAttempts.map((entry) => entry.sessionId));

  const sessions = await db.sessions
    .where("[userId+moduleId+modeId+localDate]")
    .equals([challenge.userId, challenge.moduleId, challenge.modeId, challenge.localDate])
    .toArray();

  const missingAttempts: DailyChallengeAttempt[] = sessions
    .filter((session) => !existingSessionIds.has(session.id))
    .map((session) => ({
      id: createId(),
      challengeId: challenge.id,
      userId: challenge.userId,
      sessionId: session.id,
      moduleId: challenge.moduleId,
      modeId: challenge.modeId,
      localDate: challenge.localDate,
      createdAt: session.timestamp
    }));

  if (missingAttempts.length > 0) {
    await db.dailyChallengeAttempts.bulkAdd(missingAttempts);
  }

  return existingAttempts.length + missingAttempts.length;
}

export const dailyChallengeRepository = {
  async getOrCreateForToday(
    userId: string,
    localDate = toLocalDateKey(new Date())
  ): Promise<DailyChallengeProgress> {
    let challenge =
      (await db.dailyChallenges
        .where("[userId+localDate]")
        .equals([userId, localDate])
        .first()) ?? null;

    if (!challenge) {
      challenge = buildChallengeDraft(userId, localDate);
      await db.dailyChallenges.put(challenge);
    }

    const attemptsCount = await synchronizeAttempts(challenge);
    const finalizedChallenge = await markCompletedIfNeeded(challenge, attemptsCount);
    return buildProgress(finalizedChallenge, attemptsCount);
  },

  async registerSession(session: Session): Promise<void> {
    const localDate = session.localDate || toLocalDateKey(session.timestamp);
    await db.transaction(
      "rw",
      db.dailyChallenges,
      db.dailyChallengeAttempts,
      async () => {
        const challenge = await db.dailyChallenges
          .where("[userId+localDate]")
          .equals([session.userId, localDate])
          .first();

        if (!challenge || challenge.modeId !== session.modeId) {
          return;
        }

        const existingAttempt = await db.dailyChallengeAttempts
          .where("[challengeId+sessionId]")
          .equals([challenge.id, session.id])
          .first();
        if (existingAttempt) {
          return;
        }

        await db.dailyChallengeAttempts.put({
          id: createId(),
          challengeId: challenge.id,
          userId: challenge.userId,
          sessionId: session.id,
          moduleId: challenge.moduleId,
          modeId: challenge.modeId,
          localDate: challenge.localDate,
          createdAt: session.timestamp
        });

        const attemptsCount = await db.dailyChallengeAttempts
          .where("challengeId")
          .equals(challenge.id)
          .count();

        await markCompletedIfNeeded(challenge, attemptsCount);
      }
    );
  },

  async getCompletionSummary(
    userId: string,
    period: ComparePeriod
  ): Promise<DailyChallengeCompletionSummary> {
    const challenges = await listChallengesForPeriod(userId, period);
    const total = challenges.length;
    const completed = challenges.filter((entry) => entry.status === "completed").length;
    const pending = Math.max(0, total - completed);
    const completionRatePct = total > 0 ? (completed / total) * 100 : 0;

    return {
      period,
      total,
      completed,
      pending,
      completionRatePct
    };
  },

  async listHistory(
    userId: string,
    period: ComparePeriod,
    limit = 14
  ): Promise<DailyChallengeHistoryItem[]> {
    const challenges = await listChallengesForPeriod(userId, period);
    const sorted = [...challenges].sort((a, b) => b.localDate.localeCompare(a.localDate));
    const sliced = sorted.slice(0, Math.max(1, Math.min(90, Math.round(limit))));

    const withAttempts = await Promise.all(
      sliced.map(async (challenge) => {
        const attemptsCount = await db.dailyChallengeAttempts
          .where("challengeId")
          .equals(challenge.id)
          .count();
        return {
          challengeId: challenge.id,
          localDate: challenge.localDate,
          modeId: challenge.modeId,
          modeTitle: getChallengeModeTitle(challenge.modeId),
          status: challenge.status,
          requiredAttempts: challenge.requiredAttempts,
          attemptsCount,
          completedAt: challenge.completedAt
        } satisfies DailyChallengeHistoryItem;
      })
    );

    return withAttempts;
  }
};
