import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../app/useAuth";
import { AuthUnavailablePanel } from "../shared/ui/AuthUnavailablePanel";

export function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!auth.isConfigured) {
    return (
      <AuthUnavailablePanel
        title="Восстановление пароля скоро будет доступно"
        description="Сервис аккаунтов ещё не включён на этом окружении. Пока можно пользоваться локальными профилями на этом устройстве."
      />
    );
  }

  async function handleRequestReset(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    setError(null);

    try {
      await auth.requestPasswordReset(email.trim());
      setStatus(
        "Если аккаунт существует, письмо для сброса пароля уже отправлено на указанный email."
      );
    } catch (caught) {
      console.error("password reset request failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось отправить письмо для сброса.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    setError(null);

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
      await auth.updatePassword(password);
      setStatus("Пароль обновлён. Теперь можно войти с новым паролем.");
    } catch (caught) {
      console.error("password update failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось обновить пароль.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel auth-panel" data-testid="forgot-password-page">
      <div className="auth-panel-head">
        <div>
          <p className="auth-kicker">Восстановление доступа</p>
          <h2>{auth.isRecoveryMode ? "Задайте новый пароль" : "Сброс пароля"}</h2>
          <p>
            {auth.isRecoveryMode
              ? "Установите новый пароль для аккаунта NeuroSprint и вернитесь к своим профилям."
              : "Введите email аккаунта. Если он существует, мы отправим письмо со ссылкой для восстановления доступа."}
          </p>
        </div>
        <div className="auth-sidecard">
          <strong>Что важно</strong>
          <ul className="auth-benefits-list">
            <li>Сброс пароля не удаляет профили и тренировочный прогресс.</li>
            <li>После смены пароля связанные профили снова будут доступны после входа.</li>
            <li>Если письмо не приходит сразу, проверьте папку «Спам» и повторите попытку чуть позже.</li>
          </ul>
        </div>
      </div>

      {auth.isRecoveryMode ? (
        <form className="auth-form" onSubmit={handleUpdatePassword}>
          <label htmlFor="recovery-password">Новый пароль</label>
          <input
            id="recovery-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Минимум 8 символов"
            autoComplete="new-password"
            required
          />

          <label htmlFor="recovery-password-confirm">Повторите пароль</label>
          <input
            id="recovery-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Повторите пароль"
            autoComplete="new-password"
            required
          />

          <div className="auth-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Сохраняем..." : "Сохранить новый пароль"}
            </button>
            <Link className="btn-ghost" to="/auth/login">
              Вернуться ко входу
            </Link>
          </div>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleRequestReset}>
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />

          <div className="auth-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Отправляем..." : "Отправить письмо"}
            </button>
            <Link className="btn-ghost" to="/auth/login">
              Назад ко входу
            </Link>
          </div>
        </form>
      )}

      {status ? <p className="status-line success">{status}</p> : null}
      {error ? <p className="status-line error">{error}</p> : null}
    </section>
  );
}
