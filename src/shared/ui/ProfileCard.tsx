import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { AppRole, User } from "../../shared/types/domain";
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
  "👨‍🎓",
  "👩‍🎓",
  "🦸",
  "🦹",
  "🧙",
  "🧚",
  "🧛"
];

interface ProfileCardProps {
  user: User;
  isActive: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canUpdateRole: boolean;
  lockTeacherRole?: boolean;
  onActivate: (user: User) => void;
  onRename: (user: User) => void;
  onDelete: (user: User) => void;
  onTrain?: (user: User) => void;
  onUpdateRole: (user: User, role: AppRole) => void;
  avatar?: string;
}

export function ProfileCard({
  user,
  isActive,
  canEdit,
  canDelete,
  canActivate,
  canUpdateRole,
  lockTeacherRole = false,
  onActivate,
  onRename,
  onDelete,
  onTrain,
  onUpdateRole,
  avatar = "👤"
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
    !canUpdateRole || draftRole === role || (lockTeacherRole && draftRole !== "teacher");

  return (
    <article
      className={`profile-card${isActive ? " is-active" : ""}`}
      data-testid={`profile-card-${user.id}`}
      style={{ "--role-color": roleColor } as CSSProperties}
    >
      <div className="profile-card-main">
        <div className="profile-card-avatar">
          <span className="avatar-emoji">{avatar}</span>
        </div>

        <div className="profile-card-info">
          <h3 className="profile-card-name">{user.name}</h3>

          <div className="profile-activity-summary">
            <span className="activity-item" title="Последняя активность">
              🕒 {formatLastActivity(user.lastActivity)}
            </span>
            <span className="activity-item" title="Всего тренировок">
              📊 {user.totalSessions ?? 0} сессий
            </span>
            <span className="activity-item" title="Общее время">
              ⏱️ {formatTotalTime(user.totalTimeSec ?? 0)}
            </span>
          </div>

          <p className="profile-card-date">Создан: {createdAt}</p>

          <div className="profile-role-editor">
            <select
              value={draftRole}
              onChange={(event) => setDraftRole(event.target.value as AppRole)}
              className="profile-role-select"
              data-testid={`profile-role-edit-${user.id}`}
              disabled={!canUpdateRole}
            >
              <option value="student">Ученик</option>
              <option value="teacher">Учитель</option>
              <option value="home">Домашний</option>
              <option value="admin">Администратор</option>
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

          {!canUpdateRole ? (
            <span
              className="profile-card-role"
              style={{ backgroundColor: `${roleColor}20`, color: roleColor }}
            >
              {roleLabel}
            </span>
          ) : null}

          {lockTeacherRole ? (
            <p className="status-line">Это последний учитель. Смена роли и удаление заблокированы.</p>
          ) : null}
        </div>
      </div>

      <div className="profile-card-actions">
        {onTrain && isActive ? (
          <button
            type="button"
            className="btn-profile btn-train"
            onClick={() => onTrain(user)}
            data-testid={`train-profile-${user.id}`}
            title="Перейти к тренировкам"
          >
            Тренировать
          </button>
        ) : null}

        {canActivate ? (
          <button
            type="button"
            className={`btn-profile${isActive ? " is-active" : ""}`}
            onClick={() => onActivate(user)}
            data-testid={`activate-profile-${user.id}`}
          >
            {isActive ? "Активен" : "Сделать активным"}
          </button>
        ) : null}

        {canEdit ? (
          <>
            <button
              type="button"
              className="btn-ghost btn-profile-action"
              onClick={() => onRename(user)}
              data-testid={`rename-profile-${user.id}`}
              aria-label="Переименовать"
            >
              ✏️
            </button>
            <button
              type="button"
              className="btn-danger btn-profile-action"
              onClick={() => onDelete(user)}
              data-testid={`delete-profile-${user.id}`}
              aria-label="Удалить"
              disabled={!canDelete}
            >
              🗑️
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}
