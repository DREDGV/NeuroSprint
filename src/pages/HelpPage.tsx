import { APP_VERSION } from "../shared/constants/appMeta";
import { RELEASE_HISTORY } from "../shared/constants/changelog";

function statusLabel(status: "stable" | "alpha" | "dev"): string {
  if (status === "stable") {
    return "stable";
  }
  if (status === "dev") {
    return "dev";
  }
  return "alpha";
}

export function HelpPage() {
  const latest = RELEASE_HISTORY[0];

  return (
    <section className="panel" data-testid="help-page">
      <h2>Справка</h2>
      <p>
        Текущая версия приложения: <strong>v{APP_VERSION}</strong>.
      </p>

      {latest ? (
        <section className="setup-block">
          <h3>Что нового в v{latest.version}</h3>
          <p className="status-line">{latest.title}</p>
          <ul>
            {latest.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="setup-block">
        <h3>Как быстро начать</h3>
        <ol>
          <li>Откройте раздел «Профили» и выберите активного пользователя.</li>
          <li>Перейдите в «Тренировки», выберите модуль и настройте режим.</li>
          <li>Проведите сессию и проверьте прогресс в «Статистике».</li>
        </ol>
      </section>

      <section className="setup-block">
        <h3>Активный пользователь</h3>
        <p>
          Имя активного пользователя отображается в верхней панели приложения,
          на главной странице и на экранах тренировки. Если имя неверное,
          переключите профиль в разделе «Профили».
        </p>
      </section>

      <section className="setup-block">
        <h3>История изменений</h3>
        <div className="release-list">
          {RELEASE_HISTORY.map((release) => (
            <article key={release.version} className="release-card">
              <div className="release-header">
                <p className="release-version">v{release.version}</p>
                <span className={`release-badge release-${release.status}`}>
                  {statusLabel(release.status)}
                </span>
              </div>
              <p className="release-date">{release.date}</p>
              <p className="release-title">{release.title}</p>
              <ul>
                {release.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
