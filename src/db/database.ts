import Dexie, { type Table } from "dexie";
import type {
  ClassGroup,
  GroupMember,
  Session,
  User,
  UserModeProfile
} from "../shared/types/domain";

export class NeuroSprintDatabase extends Dexie {
  users!: Table<User, string>;
  sessions!: Table<Session, string>;
  userModeProfiles!: Table<UserModeProfile, string>;
  classGroups!: Table<ClassGroup, string>;
  groupMembers!: Table<GroupMember, string>;

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
  }
}

export const db = new NeuroSprintDatabase();
