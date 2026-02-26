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
import type { AppRole, User } from "../shared/types/domain";

export function ProfilesPage() {
  const navigate = useNavigate();
  const access = useRoleAccess();
  const { activeUserId, setActiveUserId } = useActiveUser();
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("student");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole>>({});
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasProfiles = users.length > 0;
  const canCreate = name.trim().length >= 2;
  const teachersCount = useMemo(
    () => users.filter((user) => isTeacherRole(normalizeUserRole(user.role))).length,
    [users]
  );
  const recoveryMode = teachersCount === 0;
  const canAssignRoleOnCreate = access.profiles.updateRole || recoveryMode;
  const canUpdateProfileRoles = access.profiles.updateRole || recoveryMode;

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
      setActiveUserId(created.id);
      saveAppRole(normalizeUserRole(created.role));
      setName("");
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
    setStatus(`Активный профиль: ${user.name} (${appRoleLabel(normalizeUserRole(user.role))}).`);
  }

  async function handleSaveRole(user: User) {
    if (
      !guardAccess(
        canUpdateProfileRoles,
        setError,
        "В этой роли смена ролей профилей недоступна."
      )
    ) {
      return;
    }
    const nextRole = roleDrafts[user.id] ?? normalizeUserRole(user.role);
    try {
      await userRepository.updateRole(user.id, nextRole);
      if (activeUserId === user.id) {
        saveAppRole(nextRole);
      }
      await loadUsers();
      setStatus(`Роль профиля "${user.name}" изменена на «${appRoleLabel(nextRole)}».`);
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
          </select>
          {!canAssignRoleOnCreate ? (
            <p className="status-line" data-testid="profiles-create-role-note">
              В текущей роли можно создать только профиль «Ученик».
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

      {activeUser ? (
        <p className="status-line" data-testid="active-profile-status">
          Активный профиль: <strong>{activeUser.name}</strong> (
          {appRoleLabel(normalizeUserRole(activeUser.role))})
        </p>
      ) : (
        <p className="status-line" data-testid="active-profile-status">
          Активный профиль не выбран.
        </p>
      )}

      <ul className="profiles-list">
        {users.map((user) => {
          const currentRole = normalizeUserRole(user.role);
          const draftRole = roleDrafts[user.id] ?? currentRole;
          const isLastTeacher = isTeacherRole(currentRole) && teachersCount <= 1;
          const roleChangeBlocked = isLastTeacher && !isTeacherRole(draftRole);

          return (
            <li key={user.id} className="profile-item">
              <div>
                <p className="profile-name">{user.name}</p>
                <p className="profile-date">
                  Создан: {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </p>
                <span className="role-pill">{appRoleLabel(currentRole)}</span>
                <div className="profile-role-controls">
                  <select
                    value={draftRole}
                    onChange={(event) =>
                      setRoleDrafts((current) => ({
                        ...current,
                        [user.id]: event.target.value as AppRole
                      }))
                    }
                    data-testid={`profile-role-edit-${user.id}`}
                    disabled={!canUpdateProfileRoles}
                  >
                    <option value="student">Ученик</option>
                    <option value="teacher">Учитель</option>
                    <option value="home">Домашний</option>
                  </select>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => void handleSaveRole(user)}
                    disabled={
                      !canUpdateProfileRoles || draftRole === currentRole || roleChangeBlocked
                    }
                    data-testid={`save-profile-role-${user.id}`}
                  >
                    Сохранить роль
                  </button>
                </div>
                {!canUpdateProfileRoles ? (
                  <p className="profile-date">Смена роли доступна только для роли «Учитель».</p>
                ) : null}
                {isLastTeacher ? (
                  <p className="profile-date">
                    Это последний учитель. Сначала назначьте другого пользователя учителем.
                  </p>
                ) : null}
              </div>
              <div className="action-row">
                {access.profiles.activate ? (
                  <button
                    type="button"
                    className={
                      user.id === activeUserId ? "btn-secondary is-active" : "btn-secondary"
                    }
                    onClick={() => handleSetActive(user)}
                  >
                    {user.id === activeUserId ? "Активен" : "Сделать активным"}
                  </button>
                ) : null}
                {access.profiles.edit ? (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => void handleRename(user)}
                  >
                    Переименовать
                  </button>
                ) : null}
                {access.profiles.edit ? (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => void handleDelete(user)}
                    disabled={isLastTeacher}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

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
