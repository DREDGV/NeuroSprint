import { db } from "../../db/database";
import { createId } from "../../shared/lib/id";
import type { User } from "../../shared/types/domain";

export const userRepository = {
  async create(name: string): Promise<User> {
    const user: User = {
      id: createId(),
      name: name.trim(),
      createdAt: new Date().toISOString()
    };

    await db.users.add(user);
    return user;
  },

  async list(): Promise<User[]> {
    return db.users.orderBy("createdAt").toArray();
  },

  async rename(id: string, name: string): Promise<void> {
    await db.users.update(id, { name: name.trim() });
  },

  async remove(id: string): Promise<void> {
    await db.transaction(
      "rw",
      db.users,
      db.sessions,
      db.userModeProfiles,
      db.groupMembers,
      async () => {
      await db.users.delete(id);
      await db.sessions.where("userId").equals(id).delete();
      await db.userModeProfiles.where("userId").equals(id).delete();
      await db.groupMembers.where("userId").equals(id).delete();
    }
    );
  }
};
