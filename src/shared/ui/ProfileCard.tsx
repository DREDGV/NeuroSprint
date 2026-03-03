import { useState } from "react";
import type { AppRole, User } from "../../shared/types/domain";

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

// Набор аватарок для выбора
export const AVATAR_EMOJIS = [
  "👤", "👦", "👧", "👨", "👩", "🧑", "👴", "👵",
  "🎓", "👨‍🎓", "👩‍🎓", "🦸", "🦹", "🧙", "🧚", "🧛"
];

interface ProfileCardProps {
  user: User;
  isActive: boolean;
  canEdit: boolean;
  canActivate: boolean;
  canUpdateRole: boolean;
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
  canActivate,
  canUpdateRole,
  onActivate,
  onRename,
  onDelete,
  onTrain,
  onUpdateRole,
  avatar = "👤"
}: ProfileCardProps) {
  const roleColor = ROLE_COLORS[user.role as AppRole] || ROLE_COLORS.student;
  const roleLabel = ROLE_LABELS[user.role as AppRole] || ROLE_LABELS.student;
  const createdAt = new Date(user.createdAt).toLocaleDateString("ru-RU");
  const [draftRole, setDraftRole] = useState<AppRole>(user.role as AppRole);

  return (
    <article
      className={`profile-card${isActive ? " is-active" : ""}`}
      data-testid={`profile-card-${user.id}`}
      style={{ "--role-color": roleColor } as React.CSSProperties}
    >
      {/* Левая часть: аватарка + инфо */}
      <div className="profile-card-main">
        <div className="profile-card-avatar">
          <span className="avatar-emoji">{avatar}</span>
        </div>
        
        <div className="profile-card-info">
          <h3 className="profile-card-name">{user.name}</h3>
          <p className="profile-card-date">Создан: {createdAt}</p>
          
          {canUpdateRole ? (
            <div className="profile-role-editor">
              <select
                value={draftRole}
                onChange={(e) => setDraftRole(e.target.value as AppRole)}
                className="profile-role-select"
                data-testid={`role-select-${user.id}`}
              >
                <option value="student">Ученик</option>
                <option value="teacher">Учитель</option>
                <option value="home">Домашний</option>
                <option value="admin">Администратор</option>
              </select>
              {draftRole !== user.role && (
                <button
                  type="button"
                  className="btn-profile btn-save-role"
                  onClick={() => onUpdateRole(user, draftRole)}
                  data-testid={`save-role-${user.id}`}
                >
                  ✓ Сохранить
                </button>
              )}
            </div>
          ) : (
            <span
              className="profile-card-role"
              style={{ backgroundColor: roleColor + "20", color: roleColor }}
            >
              {roleLabel}
            </span>
          )}
        </div>
      </div>

      {/* Правая часть: действия */}
      <div className="profile-card-actions">
        {onTrain && isActive && (
          <button
            type="button"
            className="btn-profile btn-train"
            onClick={() => onTrain(user)}
            data-testid={`train-profile-${user.id}`}
            title="Перейти к тренировкам"
          >
            🏋️ Тренировать
          </button>
        )}
        
        {canActivate && (
          <button
            type="button"
            className={`btn-profile${isActive ? " is-active" : ""}`}
            onClick={() => onActivate(user)}
            data-testid={`activate-profile-${user.id}`}
          >
            {isActive ? "✓ Активен" : "Сделать активным"}
          </button>
        )}
        
        {canEdit && (
          <>
            <button
              type="button"
              className="btn-ghost btn-profile-action"
              onClick={() => onRename(user)}
              data-testid={`rename-profile-${user.id}`}
            >
              ✏️
            </button>
            <button
              type="button"
              className="btn-danger btn-profile-action"
              onClick={() => onDelete(user)}
              data-testid={`delete-profile-${user.id}`}
            >
              🗑️
            </button>
          </>
        )}
      </div>
    </article>
  );
}
