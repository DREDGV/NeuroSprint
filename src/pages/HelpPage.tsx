import { Link } from "react-router-dom";
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

const CONTACT_EMAILS = ["dr-edgv@yandex.ru", "edgvaud@gmail.com"] as const;

export function HelpPage() {
  const latest = RELEASE_HISTORY[0];
  const visibleReleases = RELEASE_HISTORY.slice(0, 5);

  return (
    <section className="panel" data-testid="help-page">
      <h2>Справка</h2>
      <p>
        Текущая версия приложения: <strong>v{APP_VERSION}</strong>.
      </p>

      <section className="setup-block">
        <h3>Статус проекта</h3>
        <p>
          NeuroSprint находится в активной разработке. Основные сценарии уже доступны,
          но в проекте всё ещё возможны баги, недоделанные участки интерфейса и
          изменения поведения между dev-релизами.
        </p>
        <p className="status-line">
          Если заметили проблему, непонятный экран или хотите предложить улучшение, напишите на{" "}
          {CONTACT_EMAILS.map((email, index) => (
            <span key={email}>
              <a href={`mailto:${email}`}>{email}</a>
              {index < CONTACT_EMAILS.length - 1 ? ", " : ""}
            </span>
          ))}
          .
        </p>
        <p className="status-line">
          Отдельно собрать обратную связь можно через кнопку <strong>«Отзыв»</strong> и через{" "}
          <Link to="/ideas">доску идей</Link>.
        </p>
      </section>

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
          <li>Откройте «Профили и аккаунт» и выберите активный профиль.</li>
          <li>Если хотите переносить прогресс между устройствами, создайте аккаунт или войдите.</li>
          <li>Перейдите в «Тренажёры», выберите направление и запустите первую сессию.</li>
          <li>Смотрите динамику в разделе «Статистика».</li>
        </ol>
      </section>

      <section className="setup-block">
        <h3>Что есть в проекте сейчас</h3>
        <div className="release-list">
          <article className="release-card">
            <h4>Профили и аккаунт</h4>
            <p>
              Локальные профили, вход по email, импорт локальных профилей в аккаунт,
              синхронизация между устройствами и восстановление доступа.
            </p>
          </article>

          <article className="release-card">
            <h4>Тренажёры</h4>
            <p>
              Внимание, память, реакция, счёт и логика. Каталог упрощён для новых
              пользователей и помогает выбрать понятную точку старта.
            </p>
          </article>

          <article className="release-card">
            <h4>Статистика и прогресс</h4>
            <p>
              История сессий, streak, уровни, XP, достижения, карта навыков,
              daily challenge и рекомендации следующего шага.
            </p>
          </article>

          <article className="release-card">
            <h4>Отзывы и идеи</h4>
            <p>
              Встроенная форма отзыва, post-session feedback, публичная доска идей
              и базовый moderation workflow для будущего product-loop.
            </p>
          </article>

          <article className="release-card">
            <h4>Teacher-flow и alpha-разделы</h4>
            <p>
              Классы, групповая аналитика, элементы соревнований и foundation для ролей.
              Эти разделы ещё развиваются и могут меняться быстрее остального продукта.
            </p>
          </article>
        </div>
      </section>

      <section className="setup-block">
        <h3>Тренажёры</h3>
        <ul>
          <li><strong>Внимание:</strong> Таблица Шульте.</li>
          <li><strong>Память:</strong> Пары памяти, Пространственная память, Сетка памяти, N-Назад.</li>
          <li><strong>Реакция:</strong> Реакция.</li>
          <li><strong>Счёт:</strong> Математический спринт.</li>
          <li><strong>Логика:</strong> Быстрые решения, Распознавание паттернов.</li>
        </ul>
      </section>

      <section className="setup-block">
        <h3>Если что-то работает не так</h3>
        <ul>
          <li>Попробуйте обновить страницу и снова открыть нужный раздел.</li>
          <li>Проверьте, выбран ли активный профиль.</li>
          <li>Если проблема связана с аккаунтом, попробуйте повторный вход или восстановление пароля.</li>
          <li>Если ошибка повторяется, пришлите описание проблемы и скрин на один из e-mail выше.</li>
        </ul>
      </section>

      <section className="setup-block">
        <h3>История изменений</h3>
        <p className="status-line">
          В интерфейсе показываем только свежие релизы. Полная история изменений хранится в changelog проекта.
        </p>
        <div className="release-list">
          {visibleReleases.map((release) => (
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
