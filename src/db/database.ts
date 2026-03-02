import Dexie, { type Table } from "dexie";
import type {
  ClassGroup,
  DailyChallenge,
  DailyChallengeAttempt,
  GroupMember,
  Session,
  AppRole,
  UserPreference,
  User,
  UserModeProfile
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
  }
}

export const db = new NeuroSprintDatabase();
