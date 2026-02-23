import { db } from "../../db/database";
import type {
  ClassicDailyPoint,
  Session,
  TimedDailyPoint
} from "../../shared/types/domain";

function byDateAsc<T extends { date: string }>(a: T, b: T): number {
  return a.date.localeCompare(b.date);
}

export function buildClassicDailyPoints(sessions: Session[]): ClassicDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "classic") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: ClassicDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    const durations = values.map((entry) => entry.durationMs);
    const bestDurationMs = Math.min(...durations);
    const avgDurationMs =
      durations.reduce((acc, value) => acc + value, 0) / durations.length;
    points.push({
      date,
      bestDurationMs,
      avgDurationMs,
      count: values.length
    });
  }

  return points.sort(byDateAsc);
}

export function buildTimedDailyPoints(sessions: Session[]): TimedDailyPoint[] {
  const grouped = new Map<string, Session[]>();
  for (const session of sessions) {
    if (session.mode !== "timed") {
      continue;
    }

    const bucket = grouped.get(session.localDate);
    if (bucket) {
      bucket.push(session);
    } else {
      grouped.set(session.localDate, [session]);
    }
  }

  const points: TimedDailyPoint[] = [];
  for (const [date, values] of grouped.entries()) {
    let effectivePerMinuteSum = 0;
    let scoreSum = 0;

    for (const entry of values) {
      const effective = entry.effectiveCorrect ?? 0;
      const minutes = entry.durationMs > 0 ? entry.durationMs / 60_000 : 1;
      effectivePerMinuteSum += effective / minutes;
      scoreSum += entry.score;
    }

    points.push({
      date,
      effectivePerMinute: effectivePerMinuteSum / values.length,
      avgScore: scoreSum / values.length,
      count: values.length
    });
  }

  return points.sort(byDateAsc);
}

export const sessionRepository = {
  async save(session: Session): Promise<void> {
    await db.sessions.put(session);
  },

  async listByUser(userId: string): Promise<Session[]> {
    const sessions = await db.sessions.where("userId").equals(userId).toArray();
    return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async listByUserMode(userId: string, mode: Session["mode"]): Promise<Session[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === mode)
      .toArray();
    return sessions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },

  async aggregateDailyClassic(userId: string): Promise<ClassicDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === "classic")
      .toArray();
    return buildClassicDailyPoints(sessions);
  },

  async aggregateDailyTimed(userId: string): Promise<TimedDailyPoint[]> {
    const sessions = await db.sessions
      .where("userId")
      .equals(userId)
      .and((session) => session.mode === "timed")
      .toArray();
    return buildTimedDailyPoints(sessions);
  }
};
