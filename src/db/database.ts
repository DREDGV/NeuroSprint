import Dexie, { type Table } from "dexie";
import type { Session, User } from "../shared/types/domain";

export class NeuroSprintDatabase extends Dexie {
  users!: Table<User, string>;
  sessions!: Table<Session, string>;

  constructor() {
    super("NeuroSprintDB");

    this.version(1).stores({
      users: "id, name, createdAt",
      sessions:
        "id, userId, taskId, mode, timestamp, localDate, score, [userId+localDate], [userId+mode+localDate]"
    });
  }
}

export const db = new NeuroSprintDatabase();

