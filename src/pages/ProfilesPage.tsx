import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { userRepository } from "../entities/user/userRepository";
import type { User } from "../shared/types/domain";

export function ProfilesPage() {
  const navigate = useNavigate();
  const { activeUserId, setActiveUserId } = useActiveUser();
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasProfiles = users.length > 0;
  const canCreate = name.trim().length >= 2;

  const loadUsers = useCallback(async () => {
    const items = await userRepository.list();
    setUsers(items);

    if (activeUserId && !items.some((item) => item.id === activeUserId)) {
      setActiveUserId(null);
    }
  }, [activeUserId, setActiveUserId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!canCreate) {
      setError("Имя должно быть не короче 2 символов.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const created = await userRepository.create(name.trim());
      setActiveUserId(created.id);
      setName("");
      await loadUsers();
    } catch {
      setError("Не удалось создать профиль.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(user: User) {
    const nextName = window.prompt("Новое имя профиля", user.name);
    if (!nextName || nextName.trim().length < 2) {
      return;
    }

    await userRepository.rename(user.id, nextName.trim());
    await loadUsers();
  }

  async function handleDelete(user: User) {
    const approved = window.confirm(`Удалить профиль "${user.name}"?`);
    if (!approved) {
      return;
    }
    await userRepository.remove(user.id);
    if (activeUserId === user.id) {
      setActiveUserId(null);
    }
    await loadUsers();
  }

  const activeUser = useMemo(
    () => users.find((item) => item.id === activeUserId) ?? null,
    [activeUserId, users]
  );

  return (
    <section className="panel" data-testid="profiles-page">
      <h2>Профили учеников</h2>
      <p>Создайте профиль и выберите активного пользователя для тренировки.</p>

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
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !canCreate}
          data-testid="create-profile-btn"
        >
          Создать профиль
        </button>
      </form>

      {error ? <p className="error-text">{error}</p> : null}

      {activeUser ? (
        <p className="status-line">
          Активный профиль: <strong>{activeUser.name}</strong>
        </p>
      ) : (
        <p className="status-line">Активный профиль не выбран.</p>
      )}

      <ul className="profiles-list">
        {users.map((user) => (
          <li key={user.id} className="profile-item">
            <div>
              <p className="profile-name">{user.name}</p>
              <p className="profile-date">
                Создан: {new Date(user.createdAt).toLocaleDateString("ru-RU")}
              </p>
            </div>
            <div className="action-row">
              <button
                type="button"
                className={
                  user.id === activeUserId ? "btn-secondary is-active" : "btn-secondary"
                }
                onClick={() => setActiveUserId(user.id)}
              >
                {user.id === activeUserId ? "Активен" : "Сделать активным"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void handleRename(user)}
              >
                Переименовать
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => void handleDelete(user)}
              >
                Удалить
              </button>
            </div>
          </li>
        ))}
      </ul>

      {hasProfiles ? (
        <div className="action-row">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/play/schulte/classic")}
            disabled={!activeUserId}
          >
            Перейти к тренировке
          </button>
        </div>
      ) : (
        <p>Пока нет профилей. Создайте первый профиль выше.</p>
      )}
    </section>
  );
}
