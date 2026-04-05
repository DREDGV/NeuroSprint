import { useEffect, useState, type CSSProperties } from "react";
import type {
  AppRole,
  ProfileOwnershipKind,
  ProfileSyncState,
  User
} from "../../shared/types/domain";
import { formatLastActivity, formatTotalTime } from "../../shared/lib/format";

const ROLE_COLORS: Record<AppRole, string> = {
  student: "#10b981",
  teacher: "#3b82f6",
  home: "#f59e0b",
  admin: "#8b5cf6"
};

const ROLE_LABELS: Record<AppRole, string> = {
  student: "Ученик",
  teacher: "Учитель",
  home: "Домашний",
  admin: "Администратор"
};

const OWNERSHIP_LABELS: Record<ProfileOwnershipKind, string> = {
  guest: "Локальный профиль",
  linked: "Привязан к аккаунту"
};

const SYNC_LABELS: Record<ProfileSyncState, string> = {
  local: "Только на этом устройстве",
  pending: "Ожидает синхронизации",
  synced: "Синхронизирован",
  error: "Ошибка синхронизации"
};

export const AVATAR_EMOJIS = [
  "👤",
  "👦",
  "👧",
  "👨",
  "👩",
  "🧑",
  "👴",
  "👵",
  "🎓",
  "🧠",
  "⚡",
  "🎯",
  "🏃",
  "🧩",
  "🚀",
  "🌟"
];

interface ProfileCardProps {
  user: User;
  isActive: boolean;
  isLocked?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canUpdateRole: boolean;
  lockTeacherRole?: boolean;
  ownershipKind?: ProfileOwnershipKind;
  syncState?: ProfileSyncState;
  onActivate: (user: User) => void;
  onRename: (user: User) => void;
  onDelete: (user: User) => void;
  onTrain?: (user: User) => void;
  onUnlock?: () => void;
  onUpdateRole: (user: User, role: AppRole) => void;
  avatar?: string;
  editableRoles?: AppRole[];
}

export function ProfileCard({
  user,
  isActive,
  isLocked = false,
  canEdit,
  canDelete,
  canActivate,
  canUpdateRole,
  lockTeacherRole = false,
  ownershipKind = user.ownershipKind ?? "guest",
  syncState = user.syncState ?? "local",
  onActivate,
  onRename,
  onDelete,
  onTrain,
  onUnlock,
  onUpdateRole,
  avatar = user.avatarEmoji ?? "👤",
  editableRoles = ["student", "home", "teacher", "admin"]
}: ProfileCardProps) {
  const role = user.role as AppRole;
  const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.student;
  const roleLabel = ROLE_LABELS[role] ?? ROLE_LABELS.student;
  const createdAt = new Date(user.createdAt).toLocaleDateString("ru-RU");
  const [draftRole, setDraftRole] = useState<AppRole>(role);

  useEffect(() => {
    setDraftRole(role);
  }, [role]);

  const saveRoleDisabled =
    !canUpdateRole ||
    isLocked ||
    draftRole === role ||
    (lockTeacherRole && draftRole !== "teacher");

  return (
    <article
      className={`profile-card${isActive ? " is-active" : ""}${isLocked ? " is-locked" : ""}`}
      data-testid={`profile-card-${user.id}`}
      style={{ "--role-color": roleColor } as CSSProperties}
    >
      <div className="profile-card-main">
        <div className="profile-card-avatar">
          <span className="avatar-emoji">{avatar}</span>
        </div>

        <div className="profile-card-info">
          <div className="profile-card-head">
            <div className="profile-card-title-block">
              <h3 className="profile-card-name">{user.name}</h3>
              <p className="profile-card-date">Создан: {createdAt}</p>
            </div>

            <div className="profile-card-badges">
              <span
                className="profile-card-role"
                style={{ backgroundColor: `${roleColor}18`, color: roleColor }}
              >
                {roleLabel}
              </span>
              <span className="profile-card-badge">{OWNERSHIP_LABELS[ownershipKind]}</span>
              <span className={`profile-card-badge is-sync-${syncState}`}>
                {SYNC_LABELS[syncState]}
              </span>
              {isLocked ? (
                <span className="profile-card-badge is-locked">Нужен вход в аккаунт</span>
              ) : null}
            </div>
          </div>

          <div className="profile-activity-summary">
            <span className="activity-item" title="Последняя активность">
              🕒 {formatLastActivity(user.lastActivity)}
            </span>
            <span className="activity-item" title="Количество тренировочных сессий">
              📊 {user.totalSessions ?? 0} сессий
            </span>
            <span className="activity-item" title="Общее время в тренажёрах">
              ⏱️ {formatTotalTime(user.totalTimeSec ?? 0)}
            </span>
          </div>

          {canUpdateRole ? (
            <div className="profile-role-editor">
              <select
                value={draftRole}
                onChange={(event) => setDraftRole(event.target.value as AppRole)}
                className="profile-role-select"
                data-testid={`profile-role-edit-${user.id}`}
                disabled={isLocked}
              >
                {editableRoles.map((item) => (
                  <option key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-profile btn-save-role"
                onClick={() => onUpdateRole(user, draftRole)}
                data-testid={`save-profile-role-${user.id}`}
                disabled={saveRoleDisabled}
              >
                Сохранить роль
              </button>
            </div>
          ) : null}

          {lockTeacherRole ? (
            <p className="status-line">
              Это последний профиль с ролью «Учитель». Смену роли и удаление нужно
              разблокировать, назначив другого учителя.
            </p>
          ) : null}
        </div>
      </div>

      <div className="profile-card-actions">
        {isLocked ? (
          <button
            type="button"
            className="btn-primary"
            onClick={() => onUnlock?.()}
            data-testid={`unlock-profile-${user.id}`}
          >
            Войти, чтобы открыть
          </button>
        ) : (
          <>
            {onTrain && isActive ? (
              <button
                type="button"
                className="btn-profile btn-train"
                onClick={() => onTrain(user)}
                data-testid={`train-profile-${user.id}`}
                title="Перейти к тренировкам"
              >
                Открыть тренировки
              </button>
            ) : null}

            {canActivate ? (
              <button
                type="button"
                className={`btn-profile${isActive ? " is-active" : ""}`}
                onClick={() => onActivate(user)}
                data-testid={`activate-profile-${user.id}`}
              >
                {isActive ? "Активный профиль" : "Сделать активным"}
              </button>
            ) : null}

            {canEdit ? (
              <>
                <button
                  type="button"
                  className="btn-ghost btn-profile-action"
                  onClick={() => onRename(user)}
                  data-testid={`rename-profile-${user.id}`}
                  aria-label="Переименовать профиль"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="btn-danger btn-profile-action"
                  onClick={() => onDelete(user)}
                  data-testid={`delete-profile-${user.id}`}
                  aria-label="Удалить профиль"
                  disabled={!canDelete}
                >
                  🗑️
                </button>
              </>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}
