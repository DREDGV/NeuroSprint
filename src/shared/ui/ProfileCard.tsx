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
  onActivate: (user: User) => void;
  onRename: (user: User) => void;
  onDelete: (user: User) => void;
  avatar?: string;
}

export function ProfileCard({
  user,
  isActive,
  canEdit,
  canActivate,
  onActivate,
  onRename,
  onDelete,
  avatar = "👤"
}: ProfileCardProps) {
  const roleColor = ROLE_COLORS[user.role as AppRole] || ROLE_COLORS.student;
  const roleLabel = ROLE_LABELS[user.role as AppRole] || ROLE_LABELS.student;
  const createdAt = new Date(user.createdAt).toLocaleDateString("ru-RU");

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
          <span
            className="profile-card-role"
            style={{ backgroundColor: roleColor + "20", color: roleColor }}
          >
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Правая часть: действия */}
      <div className="profile-card-actions">
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
