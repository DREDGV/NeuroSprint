import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { useRoleAccess } from "../app/useRoleAccess";
import { userRepository } from "../entities/user/userRepository";
import {
  isTeacherRole,
  isUserRoleGuardError,
  normalizeUserRole,
  userRoleGuardMessage
} from "../entities/user/userRole";
import { guardAccess } from "../shared/lib/auth/permissions";
import { appRoleLabel, saveAppRole } from "../shared/lib/settings/appRole";
import {
  trackProfileActivated,
  trackProfileCreated
} from "../shared/lib/analytics/siteAnalytics";
import type { AppRole, User } from "../shared/types/domain";
import { ProfileCard, AVATAR_EMOJIS } from "../shared/ui/ProfileCard";
import { AvatarSelector } from "../shared/ui/AvatarSelector";

export function ProfilesPage() {
  const navigate = useNavigate();
  const access = useRoleAccess();
  const { activeUserId, setActiveUserId } = useActiveUser();
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("student");
  const [newAvatar, setNewAvatar] = useState("👤");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole>>({});
  const [avatarDrafts, setAvatarDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [sortOrder, setSortOrder] = useState<"name" | "date" | "activity">("date");

  // Загрузка аватарок из localStorage
  const getUserAvatar = useCallback((userId: string) => {
    try {
      const saved = localStorage.getItem(`ns.avatar.${userId}`);
      return saved || avatarDrafts[userId] || "👤";
    } catch {
      return avatarDrafts[userId] || "👤";
    }
  }, [avatarDrafts]);

  const hasProfiles = users.length > 0;
  const canCreate = name.trim().length >= 2;
  const teachersCount = useMemo(
    () => users.filter((user) => isTeacherRole(normalizeUserRole(user.role))).length,
    [users]
  );
  const recoveryMode = teachersCount === 0;
  const isFirstProfile = users.length === 0;
  const canAssignRoleOnCreate = access.profiles.updateRole || recoveryMode || isFirstProfile;
  const canUpdateProfileRoles = access.profiles.updateRole || recoveryMode || isFirstProfile;
  
  // Проверка: может ли текущий пользователь редактировать конкретный профиль
  const canEditUser = useCallback((user: User) => {
    // Учитель и Домашний могут редактировать все профили
    if (access.profiles.edit) return true;
    // Ученик может редактировать только свой собственный профиль
    if (access.profiles.activate && user.id === activeUserId) return true;
    return false;
  }, [access.profiles.edit, access.profiles.activate, activeUserId]);

  const isProtectedLastTeacher = useCallback(
    (user: User) => isTeacherRole(normalizeUserRole(user.role)) && teachersCount === 1,
    [teachersCount]
  );

  const loadUsers = useCallback(async () => {
    const items = await userRepository.list();
    setUsers(items);
    setRoleDrafts((current) => {
      const next: Record<string, AppRole> = {};
      items.forEach((item) => {
        next[item.id] = current[item.id] ?? normalizeUserRole(item.role);
      });
      return next;
    });

    if (activeUserId && !items.some((item) => item.id === activeUserId)) {
      setActiveUserId(null);
    }
  }, [activeUserId, setActiveUserId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (
      !guardAccess(
        access.profiles.create,
        setError,
        "В этой роли создание профилей недоступно."
      )
    ) {
      return;
    }
    if (!canCreate) {
      setError("Имя должно быть не короче 2 символов.");
      return;
    }

    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const roleForCreate = canAssignRoleOnCreate ? newRole : "student";
      const created = await userRepository.create(name.trim(), roleForCreate);
      
      // Сохраняем аватарку
      localStorage.setItem(`ns.avatar.${created.id}`, newAvatar);
      
      setActiveUserId(created.id);
      saveAppRole(normalizeUserRole(created.role));
      trackProfileCreated(normalizeUserRole(created.role));
      setName("");
      setNewAvatar("👤");
      setNewRole("student");
      await loadUsers();
      setStatus(`Профиль "${created.name}" создан с ролью «${appRoleLabel(created.role)}».`);
    } catch (caught) {
      console.error("profile create failed", caught);
      setError("Не удалось создать профиль.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(user: User) {
    if (
      !guardAccess(
        access.profiles.edit,
        setError,
        "В этой роли редактирование профилей недоступно."
      )
    ) {
      return;
    }
    const nextName = window.prompt("Новое имя профиля", user.name);
    if (!nextName || nextName.trim().length < 2) {
      return;
    }

    try {
      await userRepository.rename(user.id, nextName.trim());
      await loadUsers();
      setStatus("Имя профиля обновлено.");
    } catch (caught) {
      console.error("profile rename failed", caught);
      setError("Не удалось переименовать профиль.");
    }
  }

  async function handleDelete(user: User) {
    if (
      !guardAccess(access.profiles.edit, setError, "В этой роли удаление профилей недоступно.")
    ) {
      return;
    }
    if (isProtectedLastTeacher(user)) {
      setError("Нельзя удалить последнего учителя.");
      return;
    }
    const approved = window.confirm(`Удалить профиль "${user.name}"?`);
    if (!approved) {
      return;
    }

    try {
      await userRepository.remove(user.id);
      if (activeUserId === user.id) {
        setActiveUserId(null);
      }
      await loadUsers();
      setStatus(`Профиль "${user.name}" удален.`);
    } catch (caught) {
      console.error("profile delete failed", caught);
      setError(
        isUserRoleGuardError(caught)
          ? userRoleGuardMessage(caught)
          : "Не удалось удалить профиль."
      );
    }
  }

  function handleSetActive(user: User) {
    if (
      !guardAccess(
        access.profiles.activate,
        setError,
        "В этой роли выбор активного профиля недоступен."
      )
    ) {
      return;
    }
    setActiveUserId(user.id);
    saveAppRole(normalizeUserRole(user.role));
    trackProfileActivated(normalizeUserRole(user.role));
    setStatus(`Активный профиль: ${user.name} (${appRoleLabel(normalizeUserRole(user.role))}).`);
  }

  function handleTrain(user: User) {
    if (user.id !== activeUserId) {
      handleSetActive(user);
    }
    navigate("/training");
  }

  async function handleSaveRole(user: User, newRole: AppRole) {
    if (
      !guardAccess(
        canUpdateProfileRoles,
        setError,
        "В этой роли смена ролей профилей недоступна."
      )
    ) {
      return;
    }
    if (isProtectedLastTeacher(user) && newRole !== "teacher") {
      setError("Нельзя понизить роль последнего учителя.");
      return;
    }
    try {
      await userRepository.updateRole(user.id, newRole);
      if (activeUserId === user.id) {
        saveAppRole(newRole);
      }
      await loadUsers();
      setStatus(`Роль профиля "${user.name}" изменена на «${appRoleLabel(newRole)}».`);
    } catch (caught) {
      console.error("profile role update failed", caught);
      setError(
        isUserRoleGuardError(caught)
          ? userRoleGuardMessage(caught)
          : "Не удалось обновить роль профиля."
      );
    }
  }

  const activeUser = useMemo(
    () => users.find((item) => item.id === activeUserId) ?? null,
    [activeUserId, users]
  );

  // Фильтрация и сортировка профилей
  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    // Фильтр по поиску
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((user) =>
        user.name.toLowerCase().includes(query) ||
        appRoleLabel(normalizeUserRole(user.role)).toLowerCase().includes(query)
      );
    }
    
    // Фильтр по роли
    if (roleFilter !== "all") {
      result = result.filter((user) => normalizeUserRole(user.role) === roleFilter);
    }
    
    // Сортировка
    result.sort((a, b) => {
      if (sortOrder === "name") {
        return a.name.localeCompare(b.name, "ru-RU");
      }
      if (sortOrder === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // activity — сортировка по последней активности (пока по createdAt)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return result;
  }, [users, searchQuery, roleFilter, sortOrder]);

  if (!access.profiles.view) {
    return (
      <section className="panel" data-testid="profiles-page">
        <h2>Профили пользователей</h2>
        <p className="status-line">Раздел профилей недоступен для текущей роли.</p>
      </section>
    );
  }

  return (
    <section className="panel" data-testid="profiles-page">
      <h2>Профили пользователей</h2>
      <p>Создайте профиль, назначьте роль и выберите активного пользователя для тренировки.</p>
      {recoveryMode ? (
        <p className="status-line" data-testid="profiles-recovery-mode-note">
          В системе нет роли «Учитель». Назначьте хотя бы одного пользователя учителем, чтобы
          восстановить полный доступ к управлению.
        </p>
      ) : null}

      {access.profiles.create ? (
        <form className="inline-form" onSubmit={handleCreate}>
          <label htmlFor="profile-name">Имя</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Миша"
            maxLength={32}
            data-testid="profile-name-input"
          />
          
          <label htmlFor="profile-avatar">Аватарка</label>
          <AvatarSelector
            selectedAvatar={newAvatar}
            onSelect={setNewAvatar}
          />
          
          <label htmlFor="profile-role">Роль профиля</label>
          <select
            id="profile-role"
            value={canAssignRoleOnCreate ? newRole : "student"}
            onChange={(event) => setNewRole(event.target.value as AppRole)}
            data-testid="profile-role-select"
            disabled={!canAssignRoleOnCreate}
          >
            <option value="student">Ученик</option>
            <option value="teacher" disabled={!canAssignRoleOnCreate}>
              Учитель
            </option>
            <option value="home" disabled={!canAssignRoleOnCreate}>
              Домашний
            </option>
            <option value="admin" disabled={!canAssignRoleOnCreate}>
              Администратор
            </option>
          </select>
          {!canAssignRoleOnCreate ? (
            <p className="status-line" data-testid="profiles-create-role-note">
              В текущей роли можно создать только профиль «Ученик».
            </p>
          ) : isFirstProfile ? (
            <p className="status-line" style={{ color: '#10b981' }}>
              🔥 Первый профиль! Выберите роль «Учитель» или «Администратор» для полного доступа.
            </p>
          ) : recoveryMode ? (
            <p className="status-line" style={{ color: '#f59e0b' }}>
              ⚠️ В системе нет учителей. Создайте профиль с ролью «Учитель» для восстановления доступа.
            </p>
          ) : null}
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !canCreate}
            data-testid="create-profile-btn"
          >
            Создать профиль
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="error-text" data-testid="profiles-error">
          {error}
        </p>
      ) : null}

      {/* Активный профиль */}
      {activeUser ? (
        <div className="active-profile-banner" data-testid="active-profile-banner">
          <span className="banner-icon">✅</span>
          <span data-testid="active-profile-status">
            Активный профиль: <strong>{activeUser.name}</strong> ({appRoleLabel(normalizeUserRole(activeUser.role))})
          </span>
        </div>
      ) : (
        <p className="status-line" data-testid="active-profile-status">
          ⚠️ Активный профиль не выбран.
        </p>
      )}

      {/* Панель управления: поиск + фильтры + сортировка */}
      <section className="profiles-control-panel">
        {/* Поиск */}
        <div className="profiles-search-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="🔍 Поиск по имени или роли..."
            className="profiles-search-input"
            data-testid="profile-search-input"
          />
        </div>
        
        {/* Фильтры по ролям */}
        <div className="profiles-filters-row">
          <span className="filter-label">Фильтр:</span>
          <div className="profiles-role-filters" data-testid="role-filter">
            <button
              type="button"
              className={`filter-chip${roleFilter === "all" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("all")}
              title="Все профили"
            >
              Все <span className="chip-count">{users.length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip${roleFilter === "admin" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("admin")}
              title="Администраторы"
            >
              👑 <span className="chip-count">{users.filter(u => normalizeUserRole(u.role) === "admin").length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip${roleFilter === "teacher" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("teacher")}
              title="Учителя"
            >
              🍎 <span className="chip-count">{users.filter(u => normalizeUserRole(u.role) === "teacher").length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip${roleFilter === "student" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("student")}
              title="Ученики"
            >
              🎓 <span className="chip-count">{users.filter(u => normalizeUserRole(u.role) === "student").length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip${roleFilter === "home" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("home")}
              title="Домашние"
            >
              🏠 <span className="chip-count">{users.filter(u => normalizeUserRole(u.role) === "home").length}</span>
            </button>
          </div>
        </div>
        
        {/* Сортировка */}
        <div className="profiles-sort-row">
          <span className="filter-label">Сортировка:</span>
          <div className="profiles-sort-buttons" data-testid="sort-order">
            <button
              type="button"
              className={`sort-btn${sortOrder === "name" ? " is-active" : ""}`}
              onClick={() => setSortOrder("name")}
              title="По алфавиту"
            >
              🔤 Имя
            </button>
            <button
              type="button"
              className={`sort-btn${sortOrder === "date" ? " is-active" : ""}`}
              onClick={() => setSortOrder("date")}
              title="По дате создания"
            >
              📅 Дата
            </button>
            <button
              type="button"
              className={`sort-btn${sortOrder === "activity" ? " is-active" : ""}`}
              onClick={() => setSortOrder("activity")}
              title="По последней активности"
            >
              ⏰ Активность
            </button>
          </div>
        </div>
        
        {/* Статистика */}
        {(searchQuery || roleFilter !== "all") && (
          <div className="profiles-stats-row">
            <span className="stats-info">
              📊 Найдено: <strong>{filteredUsers.length}</strong> из <strong>{users.length}</strong>
              {roleFilter !== "all" && <span className="stats-filter">(роль: {appRoleLabel(roleFilter)})</span>}
            </span>
            <button
              type="button"
              className="btn-ghost btn-clear-filters"
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
              }}
            >
              ✕ Сбросить фильтры
            </button>
          </div>
        )}
      </section>

      {/* Новые карточки профилей */}
      <div className="profiles-grid" data-testid="profiles-list">
        {filteredUsers.map((user) => (
          <ProfileCard
            key={user.id}
            user={user}
            isActive={user.id === activeUserId}
            canEdit={canEditUser(user)}
            canDelete={canEditUser(user) && !isProtectedLastTeacher(user)}
            canUpdateRole={canUpdateProfileRoles}
            lockTeacherRole={isProtectedLastTeacher(user)}
            canActivate={access.profiles.activate}
            onActivate={handleSetActive}
            onRename={handleRename}
            onDelete={handleDelete}
            onTrain={handleTrain}
            onUpdateRole={handleSaveRole}
            avatar={getUserAvatar(user.id)}
          />
        ))}
      </div>

      {hasProfiles ? (
        <div className="action-row">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/training")}
            disabled={!activeUserId}
          >
            Перейти к тренировке
          </button>
        </div>
      ) : (
        <p>Пока нет профилей. Создайте первый профиль выше.</p>
      )}

      {status ? <p className="status-line">{status}</p> : null}
    </section>
  );
}
