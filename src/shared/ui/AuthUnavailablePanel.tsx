import { Link } from "react-router-dom";

interface AuthUnavailablePanelProps {
  title: string;
  description: string;
}

export function AuthUnavailablePanel({
  title,
  description
}: AuthUnavailablePanelProps) {
  return (
    <section className="panel auth-panel" data-testid="auth-unavailable-panel">
      <div className="auth-panel-head">
        <div>
          <p className="auth-kicker">Аккаунты NeuroSprint</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="auth-sidecard">
          <strong>Что уже работает</strong>
          <ul className="auth-benefits-list">
            <li>Локальные профили и тренировки на этом устройстве.</li>
            <li>Прогресс не пропадёт в браузере, пока вы не очистите локальные данные.</li>
            <li>Синхронизация между устройствами включится после финального подключения сервиса аккаунтов.</li>
          </ul>
        </div>
      </div>

      <div className="auth-actions">
        <Link className="btn-primary" to="/profiles">
          Открыть профили
        </Link>
        <Link className="btn-ghost" to="/">
          На главную
        </Link>
      </div>
    </section>
  );
}
