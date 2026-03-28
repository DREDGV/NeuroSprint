import { useState } from "react";
import { useNotifications } from "../hooks/useNotifications";
import type { CompetitionNotification } from "../../../shared/types/classes";

interface NotificationBellProps {
  userId: string | null;
  onNotificationClick?: (notification: CompetitionNotification) => void;
  className?: string;
}

const NOTIFICATION_ICONS: Partial<Record<CompetitionNotification["type"], string>> = {
  challenge_received: "⚔️",
  challenge_accepted: "✅",
  competition_starting: "🏁",
  competition_finished: "🏆",
  rank_changed: "📊",
  achievement_unlocked: "🎖️",
  team_invite: "👥"
};

function getNotificationIcon(type: CompetitionNotification["type"]): string {
  return NOTIFICATION_ICONS[type] || "📢";
}

/**
 * Компонент колокольчика уведомлений
 */
export function NotificationBell({ userId, onNotificationClick, className = "" }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    notifications,
    unread,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotifications(userId);

  const handleNotificationClick = (notification: CompetitionNotification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <div className={`notification-bell-container ${className}`} data-testid="notification-bell">
      <button
        type="button"
        className="notification-bell-btn"
        onClick={handleOpen}
        aria-label="Уведомления"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4>Уведомления</h4>
            <button
              type="button"
              className="btn-mark-all-read"
              onClick={markAllAsRead}
            >
              Пометить все как прочитанные
            </button>
          </div>

          <div className="notification-dropdown-content">
            {notifications.length === 0 && (
              <div className="notification-empty">
                <p>Нет уведомлений</p>
              </div>
            )}
            {notifications.length > 0 && (
              <>
                {notifications.map((notification: CompetitionNotification) => (
                  <div
                    key={notification.id}
                    className={`notification-item${!notification.isRead ? " is-unread" : ""}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="notification-content">
                      <div className="notification-title">{notification.title}</div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">
                        {new Date(notification.createdAt).toLocaleString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="notification-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      aria-label="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="notification-dropdown-footer">
            <button
              type="button"
              className="btn-close-dropdown"
              onClick={() => setIsOpen(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
