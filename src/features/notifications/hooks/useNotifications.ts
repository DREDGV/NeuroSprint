import { useState, useEffect, useCallback } from "react";
import { notificationRepository } from "../../../entities/notification/notificationRepository";
import type { CompetitionNotification } from "../../../shared/types/classes";

/**
 * Хук для управления уведомлениями
 */
export function useNotifications(userId: string | null) {
  const [notifications, setNotifications] = useState<CompetitionNotification[]>([]);
  const [unread, setUnread] = useState<CompetitionNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnread([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [all, unreadList, count] = await Promise.all([
        notificationRepository.listByUser(userId, 50),
        notificationRepository.listUnread(userId),
        notificationRepository.getUnreadCount(userId)
      ]);
      setNotifications(all);
      setUnread(unreadList);
      setUnreadCount(count);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Пометить как прочитанное
  const markAsRead = useCallback(async (notificationId: string) => {
    await notificationRepository.markAsRead(notificationId);
    await refresh();
  }, [refresh]);

  // Пометить все как прочитанные
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    await notificationRepository.markAllAsRead(userId);
    await refresh();
  }, [userId, refresh]);

  // Удалить уведомление
  const deleteNotification = useCallback(async (notificationId: string) => {
    await notificationRepository.delete(notificationId);
    await refresh();
  }, [refresh]);

  // Создать уведомление
  const createNotification = useCallback(async (
    type: CompetitionNotification["type"],
    title: string,
    message: string,
    relatedCompetitionId?: string,
    relatedChallengeId?: string,
    relatedClassId?: string
  ) => {
    if (!userId) return;

    await notificationRepository.create(
      userId,
      type,
      title,
      message,
      relatedCompetitionId,
      relatedChallengeId,
      relatedClassId
    );
    await refresh();
  }, [userId, refresh]);

  return {
    notifications,
    unread,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    refresh
  };
}
