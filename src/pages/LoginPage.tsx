import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/useAuth";
import { userRepository } from "../entities/user/userRepository";
import { appRoleLabel } from "../shared/lib/settings/appRole";
import { consumeAuthReturnPath, setAuthReturnPath } from "../shared/lib/auth/authReturnPath";
import type { User } from "../shared/types/domain";
import { AuthUnavailablePanel } from "../shared/ui/AuthUnavailablePanel";

export function LoginPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  useEffect(() => {
    if (auth.isRecoveryMode) {
      navigate("/auth/forgot-password", { replace: true });
    }
  }, [auth.isRecoveryMode, navigate]);

  const linkedProfilesCount = useMemo(
    () => localProfiles.filter((profile) => profile.ownershipKind === "linked").length,
    [localProfiles]
  );

  if (!auth.isConfigured) {
    return (
      <AuthUnavailablePanel
        title="Вход скоро будет доступен"
        description="Сервис аккаунтов ещё не включён на этом окружении. Пока используйте локальные профили во вкладке «Профили»."
      />
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      await auth.login(email.trim(), password);
      navigate(consumeAuthReturnPath(), { replace: true });
    } catch (caught) {
      console.error("login failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось выполнить вход.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel" data-testid="login-page">
      <div className="auth-panel-head">
        <div>
          <p className="auth-kicker">Аккаунт NeuroSprint</p>
          <h2>Вход в аккаунт</h2>
          <p>
            Войдите, чтобы открыть связанные профили, подтянуть прогресс с другого устройства
            и вернуть доступ к истории тренировок.
          </p>
        </div>
        <div className="auth-sidecard">
          <strong>Что даёт вход</strong>
          <ul className="auth-benefits-list">
            <li>Синхронизацию профилей и результатов между устройствами.</li>
            <li>Возврат к связанным профилям после выхода или смены устройства.</li>
            <li>Безопасное восстановление доступа через email.</li>
          </ul>
        </div>
      </div>

      {localProfiles.length > 0 ? (
        <section className="auth-local-summary">
          <div>
            <strong>На этом устройстве уже есть профили</strong>
            <p>
              Найдено профилей: {localProfiles.length}. Уже связанных с аккаунтом:{" "}
              {linkedProfilesCount}.
            </p>
          </div>
          <div className="auth-local-profile-list">
            {localProfiles.slice(0, 4).map((profile) => (
              <span key={profile.id} className="auth-local-profile-chip">
                {profile.avatarEmoji ?? "👤"} {profile.name} · {appRoleLabel(profile.role)}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <label htmlFor="login-password">Пароль</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Минимум 8 символов"
          autoComplete="current-password"
          required
        />

        <div className="auth-actions">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </button>
          <Link className="btn-ghost" to="/auth/forgot-password">
            Забыли пароль?
          </Link>
          <Link
            className="btn-ghost"
            to="/profiles"
            onClick={() => setAuthReturnPath("/profiles")}
          >
            Продолжить локально
          </Link>
        </div>
      </form>

      <div className="auth-footer-links">
        <span>Нет аккаунта?</span>
        <Link to="/auth/register">Создать аккаунт</Link>
      </div>

      {status ? <p className="status-line success">{status}</p> : null}
      {error ? <p className="status-line error">{error}</p> : null}
    </section>
  );
}
