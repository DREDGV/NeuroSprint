import Dexie from "dexie";
import { db } from "../../db/database";
import { normalizeUserRole } from "../user/userRole";
import { toLocalDateKey } from "../../shared/lib/date/date";
import { createId } from "../../shared/lib/id";
import { moduleIdByModeId } from "../../shared/lib/training/modeMapping";
import type {
  ClassGroup,
  GroupMember,
  GroupLevelBucket,
  GroupMetric,
  GroupStatsResult,
  GroupStatsSummary,
  Session,
  TrainingModeId,
  User,
  UserPercentileResult
} from "../../shared/types/domain";

export interface ClassGroupOwnerContext {
  profileId: string;
  accountId?: string | null;
}

function matchesGroupOwner(group: ClassGroup, owner: ClassGroupOwnerContext): boolean {
  if (group.ownerProfileId && group.ownerProfileId === owner.profileId) {
    return true;
  }

  if (group.ownerAccountId && owner.accountId && group.ownerAccountId === owner.accountId) {
    return true;
  }

  return false;
}

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
  const moduleId = moduleIdByModeId(modeId);
  const perMember = await Promise.all(
    memberIds.map((memberId) => {
      if (!fromDateKey) {
        return db.sessions
          .where("[userId+moduleId+modeId]")
          .equals([memberId, moduleId, modeId])
          .toArray();
      }

      return db.sessions
        .where("[userId+moduleId+modeId+localDate]")
        .between(
          [memberId, moduleId, modeId, fromDateKey],
          [memberId, moduleId, modeId, Dexie.maxKey]
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

export function computeMembershipMutation(
  existingMemberships: GroupMember[],
  targetGroupId: string
): { alreadyInTarget: GroupMember | null; toRemoveIds: string[] } {
  const alreadyInTarget =
    existingMemberships.find((entry) => entry.groupId === targetGroupId) ?? null;
  const toRemoveIds = existingMemberships
    .filter((entry) => entry.groupId !== targetGroupId)
    .map((entry) => entry.id);
  return { alreadyInTarget, toRemoveIds };
}

export const groupRepository = {
  async createGroup(name: string, owner?: ClassGroupOwnerContext): Promise<ClassGroup> {
    const group: ClassGroup = {
      id: createId(),
      name: name.trim(),
      ownerProfileId: owner?.profileId,
      ownerAccountId: owner?.accountId ?? undefined,
      createdAt: new Date().toISOString()
    };
    await db.classGroups.add(group);
    return group;
  },

  async listGroups(): Promise<ClassGroup[]> {
    return db.classGroups.orderBy("createdAt").toArray();
  },

  async listOwnedGroups(owner: ClassGroupOwnerContext): Promise<ClassGroup[]> {
    const groups = await this.listGroups();
    return groups.filter((group) => matchesGroupOwner(group, owner));
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

  async removeGroup(groupId: string, owner?: ClassGroupOwnerContext): Promise<void> {
    if (owner) {
      const group = await db.classGroups.get(groupId);
      if (!group || !matchesGroupOwner(group, owner)) {
        return;
      }
    }

    await db.transaction("rw", db.classGroups, db.groupMembers, async () => {
      await db.classGroups.delete(groupId);
      await db.groupMembers.where("groupId").equals(groupId).delete();
    });
  },

  async renameGroup(groupId: string, name: string, owner?: ClassGroupOwnerContext): Promise<void> {
    if (owner) {
      const group = await db.classGroups.get(groupId);
      if (!group || !matchesGroupOwner(group, owner)) {
        return;
      }
    }

    await db.classGroups.update(groupId, { name: name.trim() });
  },

  async addMember(groupId: string, userId: string): Promise<GroupMember> {
    const existingMemberships = await db.groupMembers.where("userId").equals(userId).toArray();
    const mutation = computeMembershipMutation(existingMemberships, groupId);
    if (mutation.alreadyInTarget) {
      return mutation.alreadyInTarget;
    }

    const member: GroupMember = {
      id: createId(),
      groupId,
      userId,
      joinedAt: new Date().toISOString()
    };

    await db.transaction("rw", db.groupMembers, async () => {
      for (const memberId of mutation.toRemoveIds) {
        await db.groupMembers.delete(memberId);
      }
      await db.groupMembers.add(member);
    });

    return member;
  },

  async assignStudent(groupId: string, userId: string): Promise<GroupMember> {
    return this.addMember(groupId, userId);
  },

  async createStudent(groupId: string, name: string): Promise<User> {
    const user: User = {
      id: createId(),
      name: name.trim(),
      role: "student",
      createdAt: new Date().toISOString()
    };

    await db.transaction("rw", db.users, db.groupMembers, async () => {
      await db.users.add(user);
      await db.groupMembers.add({
        id: createId(),
        groupId,
        userId: user.id,
        joinedAt: new Date().toISOString()
      });
    });

    return user;
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

  async listStudents(groupId: string): Promise<User[]> {
    const members = await this.listMembers(groupId);
    if (members.length === 0) {
      return [];
    }
    const users = await db.users.bulkGet(members.map((entry) => entry.userId));
    return users
      .filter((entry): entry is User => Boolean(entry))
      .map((entry) => ({
        ...entry,
        role: normalizeUserRole(entry.role)
      }));
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
