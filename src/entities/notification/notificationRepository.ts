import { db } from "../../db/database";
import type { CompetitionNotification } from "../../shared/types/classes";
import { createId } from "../../shared/lib/id";

/**
 * Repository для уведомлений
 * Работает с IndexedDB
 */
export const notificationRepository = {
  /**
   * Создать новое уведомление
   */
  async create(
    userId: string,
    type: CompetitionNotification["type"],
    title: string,
    message: string,
    relatedCompetitionId?: string,
    relatedChallengeId?: string,
    relatedClassId?: string
  ): Promise<CompetitionNotification> {
    const notification: CompetitionNotification = {
      id: createId(),
      userId,
      type,
      title,
      message,
      relatedCompetitionId,
      relatedChallengeId,
      relatedClassId,
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await db.notifications.put(notification);
    return notification;
  },

  /**
   * Получить все уведомления пользователя
   */
  async listByUser(userId: string, limit?: number): Promise<CompetitionNotification[]> {
    const all = await db.notifications
      .where("userId")
      .equals(userId)
      .reverse()
      .sortBy("createdAt");

    if (limit) {
      return all.slice(0, limit);
    }

    return all;
  },

  /**
   * Получить непрочитанные уведомления
   */
  async listUnread(userId: string): Promise<CompetitionNotification[]> {
    const all = await db.notifications.toArray();
    return all
      .filter((n) => n.userId === userId && !n.isRead)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /**
   * Пометить уведомление как прочитанное
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = await db.notifications.get(notificationId);
    if (notification) {
      notification.isRead = true;
      await db.notifications.put(notification);
    }
  },

  /**
   * Пометить все уведомления пользователя как прочитанные
   */
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.listUnread(userId);
    for (const notification of notifications) {
      notification.isRead = true;
      await db.notifications.put(notification);
    }
  },

  /**
   * Удалить уведомление
   */
  async delete(notificationId: string): Promise<void> {
    await db.notifications.delete(notificationId);
  },

  /**
   * Удалить старые уведомления (старше 30 дней)
   */
  async cleanup(userId: string): Promise<void> {
    const all = await db.notifications.toArray();
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const notification of all) {
      if (notification.userId === userId && new Date(notification.createdAt).getTime() < monthAgo) {
        await db.notifications.delete(notification.id);
      }
    }
  },

  /**
   * Получить количество непрочитанных уведомлений
   */
  async getUnreadCount(userId: string): Promise<number> {
    const unread = await this.listUnread(userId);
    return unread.length;
  }
};
