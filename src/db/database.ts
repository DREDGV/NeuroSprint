import Dexie, { type Table } from "dexie";
import type {
  ClassGroup,
  DailyChallenge,
  DailyChallengeAttempt,
  DailyTraining,
  DailyTrainingSessionLink,
  GroupMember,
  Session,
  AppRole,
  UserPreference,
  User,
  UserModeProfile,
  UserLevel,
  UserAchievement,
  XPLog,
  SkillComparison,
  SkillBenchmark,
  UserSkillAchievement,
  UserPvPProfile,
  LeaderboardSeason,
  LeaderboardEntry
} from "../shared/types/domain";

export class NeuroSprintDatabase extends Dexie {
  users!: Table<User, string>;
  sessions!: Table<Session, string>;
  userModeProfiles!: Table<UserModeProfile, string>;
  classGroups!: Table<ClassGroup, string>;
  groupMembers!: Table<GroupMember, string>;
  userPreferences!: Table<UserPreference, string>;
  dailyChallenges!: Table<DailyChallenge, string>;
  dailyChallengeAttempts!: Table<DailyChallengeAttempt, string>;
  dailyTrainings!: Table<DailyTraining, string>;
  dailyTrainingSessions!: Table<DailyTrainingSessionLink, string>;
  userLevels!: Table<UserLevel, string>;
  userAchievements!: Table<UserAchievement, string>;
  xpLogs!: Table<XPLog, string>;
  skillComparisons!: Table<SkillComparison, string>;
  skillBenchmarks!: Table<SkillBenchmark, string>;
  // Phase 3C — Skill Achievements
  userSkillAchievements!: Table<UserSkillAchievement, string>;
  // PvP Foundation (Phase 3C — зарезервировано)
  userPvPProfiles!: Table<UserPvPProfile, string>;
  leaderboardSeasons!: Table<LeaderboardSeason, string>;
  leaderboardEntries!: Table<LeaderboardEntry, string>;

  constructor() {
    super("NeuroSprintDB");

    this.version(1).stores({
      users: "id, name, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, [userId+localDate], [userId+mode+localDate]"
    });

    this.version(2)
      .stores({
        users: "id, name, createdAt",
        sessions:
          "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId]",
        userModeProfiles:
          "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]"
      })
      .upgrade((tx) =>
        tx
          .table("sessions")
          .toCollection()
          .modify((session: Partial<Session>) => {
            if (!session.moduleId) {
              session.moduleId = "schulte";
            }
            if (!session.modeId) {
              session.modeId =
                session.mode === "timed" ? "timed_plus" : "classic_plus";
            }
            if (!session.level) {
              session.level = 1;
            }
            if (!session.presetId) {
              session.presetId = "legacy";
            }
            if (!session.adaptiveSource) {
              session.adaptiveSource = "legacy";
            }
          })
      );

    this.version(3).stores({
      users: "id, name, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId]",
      userModeProfiles:
        "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
      classGroups: "id, name, createdAt",
      groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]"
    });

    this.version(4).stores({
      users: "id, name, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate]",
      userModeProfiles:
        "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
      classGroups: "id, name, createdAt",
      groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]"
    });

    this.version(5)
      .stores({
        users: "id, name, createdAt",
        sessions:
          "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate]",
        userModeProfiles:
          "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
        classGroups: "id, name, createdAt",
        groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
        userPreferences: "id, userId, updatedAt"
      })
      .upgrade(async (tx) => {
        await tx
          .table("sessions")
          .toCollection()
          .modify((session: Partial<Session>) => {
            if (!session.visualThemeId) {
              session.visualThemeId = "classic_bw";
            }
            if (!session.audioEnabledSnapshot) {
              session.audioEnabledSnapshot = {
                muted: false,
                volume: 0.35,
                startEnd: true,
                click: false,
                correct: false,
                error: false
              };
            }
          });
      });

    this.version(6).stores({
      users: "id, name, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate], [userId+moduleId+modeId+timestamp]",
      userModeProfiles:
        "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
      classGroups: "id, name, createdAt",
      groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
      userPreferences: "id, userId, updatedAt"
    });

    this.version(7)
      .stores({
        users: "id, name, role, createdAt",
        sessions:
          "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate], [userId+moduleId+modeId+timestamp]",
        userModeProfiles:
          "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
        classGroups: "id, name, createdAt",
        groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
        userPreferences: "id, userId, updatedAt"
      })
      .upgrade(async (tx) => {
        await tx
          .table("users")
          .toCollection()
          .modify((user: Partial<User>) => {
            const role = user.role;
            if (role !== "teacher" && role !== "student" && role !== "home") {
              user.role = "student" as AppRole;
            }
          });
      });

    this.version(8).stores({
      users: "id, name, role, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate], [userId+moduleId+modeId+timestamp]",
      userModeProfiles:
        "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
      classGroups: "id, name, createdAt",
      groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
      userPreferences: "id, userId, updatedAt",
      dailyChallenges: "id, userId, localDate, modeId, status, [userId+localDate]",
      dailyChallengeAttempts:
        "id, challengeId, userId, sessionId, localDate, createdAt, [challengeId+sessionId], [challengeId+createdAt], [userId+localDate]"
    });
    this.version(9)
      .stores({
        users: "id, name, role, createdAt",
        sessions:
          "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate], [userId+moduleId+modeId+timestamp]",
        userModeProfiles:
          "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
        classGroups: "id, name, createdAt",
        groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
        userPreferences: "id, userId, updatedAt",
        dailyChallenges: "id, userId, localDate, modeId, status, [userId+localDate]",
        dailyChallengeAttempts:
          "id, challengeId, userId, sessionId, localDate, createdAt, [challengeId+sessionId], [challengeId+createdAt], [userId+localDate]"
      })
      .upgrade(async (tx) => {
        // Добавляем поддержку pattern_recognition
        await tx
          .table("sessions")
          .toCollection()
          .modify((session: Partial<Session>) => {
            // Миграция для будущих сессий pattern_recognition
          });
      });

    this.version(10).stores({
      users: "id, name, role, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate], [userId+moduleId+modeId+timestamp]",
      userModeProfiles:
        "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
      classGroups: "id, name, createdAt",
      groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
      userPreferences: "id, userId, updatedAt",
      dailyChallenges: "id, userId, localDate, modeId, status, [userId+localDate]",
      dailyChallengeAttempts:
        "id, challengeId, userId, sessionId, localDate, createdAt, [challengeId+sessionId], [challengeId+createdAt], [userId+localDate]",
      // Daily Training System (Phase 1 — Progress System)
      dailyTrainings:
        "id, userId, localDate, status, [userId+localDate], [userId+status+localDate]",
      dailyTrainingSessions:
        "id, dailyTrainingId, userId, sessionId, createdAt, [dailyTrainingId+sessionId], [userId+sessionId]"
    });

    this.version(11).stores({
      users: "id, name, role, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate], [userId+moduleId+modeId+timestamp]",
      userModeProfiles:
        "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
      classGroups: "id, name, createdAt",
      groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
      userPreferences: "id, userId, updatedAt",
      dailyChallenges: "id, userId, localDate, modeId, status, [userId+localDate]",
      dailyChallengeAttempts:
        "id, challengeId, userId, sessionId, localDate, createdAt, [challengeId+sessionId], [challengeId+createdAt], [userId+localDate]",
      dailyTrainings:
        "id, userId, localDate, status, [userId+localDate], [userId+status+localDate]",
      dailyTrainingSessions:
        "id, dailyTrainingId, userId, sessionId, createdAt, [dailyTrainingId+sessionId], [userId+sessionId]",
      // Progress System Phase 2 — Levels + Achievements
      userLevels: "id, userId, level, [userId+level]",
      userAchievements: "id, userId, achievementId, completed, [userId+completed], [userId+achievementId]",
      xpLogs: "id, userId, source, createdAt, [userId+source], [userId+createdAt]"
    });

    this.version(12).stores({
      users: "id, name, role, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate], [userId+moduleId+modeId+timestamp]",
      userModeProfiles:
        "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
      classGroups: "id, name, createdAt",
      groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
      userPreferences: "id, userId, updatedAt",
      dailyChallenges: "id, userId, localDate, modeId, status, [userId+localDate]",
      dailyChallengeAttempts:
        "id, challengeId, userId, sessionId, localDate, createdAt, [challengeId+sessionId], [challengeId+createdAt], [userId+localDate]",
      dailyTrainings:
        "id, userId, localDate, status, [userId+localDate], [userId+status+localDate]",
      dailyTrainingSessions:
        "id, dailyTrainingId, userId, sessionId, createdAt, [dailyTrainingId+sessionId], [userId+sessionId]",
      userLevels: "id, userId, level, [userId+level]",
      userAchievements: "id, userId, achievementId, completed, [userId+completed], [userId+achievementId]",
      xpLogs: "id, userId, source, createdAt, [userId+source], [userId+createdAt]",
      // Progress System Phase 3 — Skill Map + Comparison
      skillComparisons: "id, userId, skillId, percentile, [userId+skillId], [userId+percentile]",
      skillBenchmarks: "id, skillId, source, [skillId+source]"
    });

    this.version(13).stores({
      users: "id, name, role, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, moduleId, modeId, level, [userId+localDate], [userId+mode+localDate], [userId+moduleId+modeId], [modeId+localDate], [userId+moduleId+modeId+localDate], [userId+moduleId+modeId+timestamp]",
      userModeProfiles:
        "id, userId, moduleId, modeId, updatedAt, [userId+moduleId+modeId]",
      classGroups: "id, name, createdAt",
      groupMembers: "id, groupId, userId, joinedAt, [groupId+userId]",
      userPreferences: "id, userId, updatedAt",
      dailyChallenges: "id, userId, localDate, modeId, status, [userId+localDate]",
      dailyChallengeAttempts:
        "id, challengeId, userId, sessionId, localDate, createdAt, [challengeId+sessionId], [challengeId+createdAt], [userId+localDate]",
      dailyTrainings:
        "id, userId, localDate, status, [userId+localDate], [userId+status+localDate]",
      dailyTrainingSessions:
        "id, dailyTrainingId, userId, sessionId, createdAt, [dailyTrainingId+sessionId], [userId+sessionId]",
      userLevels: "id, userId, level, [userId+level]",
      userAchievements: "id, userId, achievementId, completed, [userId+completed], [userId+achievementId]",
      xpLogs: "id, userId, source, createdAt, [userId+source], [userId+createdAt]",
      skillComparisons: "id, userId, skillId, percentile, [userId+skillId], [userId+percentile]",
      skillBenchmarks: "id, skillId, source, [skillId+source]",
      // Phase 3C — Skill Achievements
      userSkillAchievements: "id, userId, skillAchievementId, completed, [userId+skillAchievementId], [userId+completed]",
      // PvP Foundation (Phase 3C — зарезервировано для Phase 4)
      userPvPProfiles: "id, userId, currentLeague, [userId+currentLeague]",
      leaderboardSeasons: "id, isActive, startDate, endDate",
      leaderboardEntries: "id, seasonId, userId, skillId, rank, [seasonId+userId], [seasonId+skillId], [userId+rank]"
    });
  }
}

export const db = new NeuroSprintDatabase();
