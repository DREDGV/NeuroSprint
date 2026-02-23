import { db } from "../../db/database";
import { toLocalDateKey } from "../../shared/lib/date/date";
import { createId } from "../../shared/lib/id";
import type {
  ClassGroup,
  GroupMember,
  GroupMetric,
  GroupStatsPoint,
  GroupStatsSummary,
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

function computeSummary(values: number[]): GroupStatsSummary {
  if (values.length === 0) {
    return {
      best: null,
      avg: null,
      worst: null,
      sessionsTotal: 0
    };
  }

  return {
    best: Math.max(...values),
    avg: values.reduce((sum, value) => sum + value, 0) / values.length,
    worst: Math.min(...values),
    sessionsTotal: values.length
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
  ): Promise<{ summary: GroupStatsSummary; trend: GroupStatsPoint[] }> {
    const normalizedPeriod = normalizePeriodDays(period);
    const members = await this.listMembers(groupId);
    if (members.length === 0) {
      return {
        summary: computeSummary([]),
        trend: []
      };
    }

    const memberIds = new Set(members.map((entry) => entry.userId));
    const sessions = await db.sessions
      .where("modeId")
      .equals(modeId)
      .and((session) => memberIds.has(session.userId))
      .toArray();

    const filtered =
      normalizedPeriod === "all"
        ? sessions
        : sessions.filter((session) => {
            const date = new Date(session.timestamp);
            const from = new Date();
            from.setDate(from.getDate() - normalizedPeriod);
            return date >= from;
          });

    const summaryValues = filtered.map((entry) => metricValue(metric, entry));
    const byDate = new Map<string, number[]>();

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
      summary: computeSummary(summaryValues),
      trend
    };
  },

  async getUserPercentileInGroup(
    groupId: string,
    userId: string,
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
    const fromDate =
      normalizedPeriod === "all"
        ? null
        : (() => {
            const date = new Date();
            date.setDate(date.getDate() - normalizedPeriod);
            return date;
          })();

    const perUserValues: Array<{ userId: string; value: number }> = [];

    for (const memberId of memberIds) {
      const sessions = await db.sessions
        .where("userId")
        .equals(memberId)
        .and((session) => !fromDate || new Date(session.timestamp) >= fromDate)
        .toArray();
      if (sessions.length === 0) {
        continue;
      }

      const avg =
        sessions.reduce((sum, session) => sum + metricValue(metric, session), 0) /
        sessions.length;
      perUserValues.push({ userId: memberId, value: avg });
    }

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
