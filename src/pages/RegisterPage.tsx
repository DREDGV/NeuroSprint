import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/useAuth";
import { userRepository } from "../entities/user/userRepository";
import { appRoleLabel } from "../shared/lib/settings/appRole";
import type { User } from "../shared/types/domain";
import { AuthUnavailablePanel } from "../shared/ui/AuthUnavailablePanel";

export function RegisterPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [localProfiles, setLocalProfiles] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    void userRepository.list().then((profiles) => {
      if (!cancelled) {
        setLocalProfiles(profiles);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const importableProfiles = useMemo(
    () => localProfiles.filter((profile) => profile.ownershipKind === "guest"),
    [localProfiles]
  );

  if (!auth.isConfigured) {
    return (
      <AuthUnavailablePanel
        title="Регистрация скоро будет доступна"
        description="Сервис аккаунтов ещё не включён на этом окружении. Пока можно пользоваться локальными профилями и тренироваться без регистрации."
      />
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      setLoading(false);
      return;
    }

    try {
      await auth.register({
        email: email.trim(),
        password,
        displayName: displayName.trim() || undefined
      });
      setStatus("Аккаунт создан. Теперь можно привязать локальные профили и продолжить работу на других устройствах.");
      navigate("/profiles", { replace: true });
    } catch (caught) {
      console.error("register failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось создать аккаунт.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel" data-testid="register-page">
      <div className="auth-panel-head">
        <div>
          <p className="auth-kicker">Публичный доступ</p>
          <h2>Создать аккаунт</h2>
          <p>
            Аккаунт нужен, чтобы синхронизировать прогресс, восстановить профили на новом
            устройстве и безопасно вернуть доступ к тренировочным данным.
          </p>
        </div>
        <div className="auth-sidecard">
          <strong>Что будет после регистрации</strong>
          <ul className="auth-benefits-list">
            <li>Вы попадёте в центр профилей, а не потеряетесь в тренажёрах.</li>
            <li>Сайт предложит импортировать локальные профили с этого устройства.</li>
            <li>Новые профили будут создаваться уже внутри аккаунта.</li>
          </ul>
        </div>
      </div>

      {importableProfiles.length > 0 ? (
        <section className="auth-local-summary">
          <div>
            <strong>Готово к импорту после регистрации</strong>
            <p>
              На устройстве найдено локальных профилей: {importableProfiles.length}. Их
              можно будет привязать к аккаунту сразу после входа.
            </p>
          </div>
          <div className="auth-local-profile-list">
            {importableProfiles.slice(0, 4).map((profile) => (
              <span key={profile.id} className="auth-local-profile-chip">
                {profile.avatarEmoji ?? "👤"} {profile.name} · {appRoleLabel(profile.role)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="register-name">Имя</label>
        <input
          id="register-name"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Как вас показывать в аккаунте"
          autoComplete="name"
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label htmlFor="register-password">Пароль</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Минимум 8 символов"
          autoComplete="new-password"
          required
        />

        <label htmlFor="register-password-confirm">Повторите пароль</label>
        <input
          id="register-password-confirm"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Повторите пароль"
          autoComplete="new-password"
          required
        />

        <div className="auth-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Создаём..." : "Создать аккаунт"}
          </button>
          <Link className="btn-ghost" to="/auth/login">
            Уже есть аккаунт
          </Link>
          <Link className="btn-ghost" to="/profiles">
            Продолжить локально
          </Link>
        </div>
      </form>

      {status ? <p className="status-line success">{status}</p> : null}
      {error ? <p className="status-line error">{error}</p> : null}
    </section>
  );
}
