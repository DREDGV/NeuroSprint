import Dexie from "dexie";
import { db } from "../../db/database";
import { toLocalDateKey } from "../../shared/lib/date/date";
import { createId } from "../../shared/lib/id";
import type {
  ClassGroup,
  GroupMember,
  GroupLevelBucket,
  GroupMetric,
  GroupStatsResult,
  GroupStatsSummary,
  Session,
  TrainingModeId,
  UserPercentileResult
} from "../../shared/types/domain";

function metricValue(
  metric: GroupMetric,
  session: { score: number; accuracy: number; speed: number }
): number {
  if (metric === "accuracy") {
    return session.accuracy * 100;
  }
  if (metric === "speed") {
    return session.speed;
  }
  return session.score;
}

function computeSummary(values: number[], membersTotal: number): GroupStatsSummary {
  if (values.length === 0) {
    return {
      best: null,
      avg: null,
      worst: null,
      sessionsTotal: 0,
      membersTotal
    };
  }

  return {
    best: Math.max(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    worst: Math.min(...values),
    sessionsTotal: values.length,
    membersTotal
  };
}

function normalizePeriodDays(period: number | "all"): number | "all" {
  if (period === "all") {
    return "all";
  }
  if (!Number.isFinite(period) || period <= 0) {
    return 30;
  }
  return Math.round(period);
}

function computeFromDateKey(period: number | "all"): string | null {
  if (period === "all") {
    return null;
  }
  const from = new Date();
  from.setDate(from.getDate() - period);
  return toLocalDateKey(from);
}

function filterByPeriod(
  sessions: Session[],
  period: number | "all"
): Session[] {
  const fromDateKey = computeFromDateKey(period);
  if (!fromDateKey) {
    return sessions;
  }
  return sessions.filter((session) => {
    if (session.localDate) {
      return session.localDate >= fromDateKey;
    }
    return toLocalDateKey(session.timestamp) >= fromDateKey;
  });
}

async function loadSessionsForMembersByMode(
  memberIds: string[],
  modeId: TrainingModeId,
  period: number | "all"
): Promise<Session[]> {
  if (memberIds.length === 0) {
    return [];
  }

  const fromDateKey = computeFromDateKey(period);
  const perMember = await Promise.all(
    memberIds.map((memberId) => {
      if (!fromDateKey) {
        return db.sessions
          .where("[userId+moduleId+modeId]")
          .equals([memberId, "schulte", modeId])
          .toArray();
      }

      return db.sessions
        .where("[userId+moduleId+modeId+localDate]")
        .between(
          [memberId, "schulte", modeId, fromDateKey],
          [memberId, "schulte", modeId, Dexie.maxKey]
        )
        .toArray();
    })
  );

  return perMember.flat();
}

export function buildLevelDistribution(
  sessions: Array<{ level: number }>
): GroupLevelBucket[] {
  const counters = new Map<number, number>();
  sessions.forEach((session) => {
    const level = Number.isFinite(session.level) ? Math.round(session.level) : 1;
    const clamped = Math.max(1, Math.min(10, level));
    counters.set(clamped, (counters.get(clamped) ?? 0) + 1);
  });
  return [...counters.entries()]
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => a.level - b.level);
}

export function calculatePercentile(values: number[], target: number): number | null {
  if (values.length === 0) {
    return null;
  }
  const lessOrEqual = values.filter((value) => value <= target).length;
  return (lessOrEqual / values.length) * 100;
}

export const groupRepository = {
  async createGroup(name: string): Promise<ClassGroup> {
    const group: ClassGroup = {
      id: createId(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };
    await db.classGroups.add(group);
    return group;
  },

  async listGroups(): Promise<ClassGroup[]> {
    return db.classGroups.orderBy("createdAt").toArray();
  },

  async listGroupsForUser(userId: string): Promise<ClassGroup[]> {
    const memberships = await db.groupMembers.where("userId").equals(userId).toArray();
    if (memberships.length === 0) {
      return [];
    }

    const groupIds = [...new Set(memberships.map((entry) => entry.groupId))];
    const groups = await db.classGroups.bulkGet(groupIds);
    return groups.filter((entry): entry is ClassGroup => Boolean(entry));
  },

  async removeGroup(groupId: string): Promise<void> {
    await db.transaction("rw", db.classGroups, db.groupMembers, async () => {
      await db.classGroups.delete(groupId);
      await db.groupMembers.where("groupId").equals(groupId).delete();
    });
  },

  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    const existing = await db.groupMembers
      .where("[groupId+userId]")
      .equals([groupId, userId])
      .first();
    if (existing) {
      return existing;
    }

    const member: GroupMember = {
      id: createId(),
      groupId,
      userId,
      joinedAt: new Date().toISOString()
    };
    await db.groupMembers.add(member);
    return member;
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    const member = await db.groupMembers
      .where("[groupId+userId]")
      .equals([groupId, userId])
      .first();
    if (!member) {
      return;
    }
    await db.groupMembers.delete(member.id);
  },

  async listMembers(groupId: string): Promise<GroupMember[]> {
    return db.groupMembers.where("groupId").equals(groupId).toArray();
  },

  async aggregateGroupStats(
    groupId: string,
    modeId: TrainingModeId,
    period: number | "all",
    metric: GroupMetric
  ): Promise<GroupStatsResult> {
    const normalizedPeriod = normalizePeriodDays(period);
    const members = await this.listMembers(groupId);
    const membersTotal = members.length;
    if (members.length === 0) {
      return {
        summary: computeSummary([], membersTotal),
        trend: [],
        levelDistribution: []
      };
    }

    const memberIds = members.map((entry) => entry.userId);
    const sessions = await loadSessionsForMembersByMode(
      memberIds,
      modeId,
      normalizedPeriod
    );

    const filtered = filterByPeriod(sessions, normalizedPeriod);

    const summaryValues = filtered.map((entry) => metricValue(metric, entry));
    const byDate = new Map<string, number[]>();
    const levelDistribution = buildLevelDistribution(filtered);

    for (const session of filtered) {
      const key = session.localDate ?? toLocalDateKey(session.timestamp);
      const bucket = byDate.get(key) ?? [];
      bucket.push(metricValue(metric, session));
      byDate.set(key, bucket);
    }

    const trend = [...byDate.entries()]
      .map(([date, values]) => ({
        date,
        avg: values.reduce((sum, value) => sum + value, 0) / values.length,
        best: Math.max(...values),
        worst: Math.min(...values),
        count: values.length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      summary: computeSummary(summaryValues, membersTotal),
      trend,
      levelDistribution
    };
  },

  async getUserPercentileInGroup(
    groupId: string,
    userId: string,
    modeId: TrainingModeId,
    metric: GroupMetric,
    period: number | "all"
  ): Promise<UserPercentileResult> {
    const normalizedPeriod = normalizePeriodDays(period);
    const members = await this.listMembers(groupId);
    if (members.length === 0) {
      return {
        userId,
        metric,
        percentile: null,
        userValue: null,
        sampleSize: 0
      };
    }

    const memberIds = members.map((entry) => entry.userId);
    const allModeSessions = await loadSessionsForMembersByMode(
      memberIds,
      modeId,
      normalizedPeriod
    );
    const filteredSessions = filterByPeriod(allModeSessions, normalizedPeriod);

    const perUserValues: Array<{ userId: string; value: number }> = [];
    const byUser = new Map<string, number[]>();
    filteredSessions.forEach((session) => {
      const bucket = byUser.get(session.userId) ?? [];
      bucket.push(metricValue(metric, session));
      byUser.set(session.userId, bucket);
    });

    byUser.forEach((values, memberId) => {
      if (values.length === 0) {
        return;
      }
      const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
      perUserValues.push({ userId: memberId, value: avg });
    });

    if (perUserValues.length === 0) {
      return {
        userId,
        metric,
        percentile: null,
        userValue: null,
        sampleSize: 0
      };
    }

    const target = perUserValues.find((entry) => entry.userId === userId);
    if (!target) {
      return {
        userId,
        metric,
        percentile: null,
        userValue: null,
        sampleSize: perUserValues.length
      };
    }

    const percentile = calculatePercentile(
      perUserValues.map((entry) => entry.value),
      target.value
    );

    return {
      userId,
      metric,
      percentile,
      userValue: target.value,
      sampleSize: perUserValues.length
    };
  }
};
