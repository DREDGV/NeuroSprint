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
        <h3>Тренажёры</h3>
        <div className="release-list">
          <article className="release-card">
            <h4>🧩 Pattern Recognition</h4>
            <p>Тренировка на чтение закономерностей: найдите правило ряда и продолжите его.</p>
            <ul>
              <li><strong>Режимы:</strong> Классический, На время, Прогрессивный, Обучающий, Мульти-ответ, Выживание</li>
              <li><strong>Контент:</strong> Визуальные фигуры, Числовые ряды, Микс</li>
              <li><strong>Новые паттерны:</strong> Fibonacci, Geometric, Prime, Squares</li>
              <li><strong>Подсказки:</strong> 💡 правило + пример, 🏆 ответ (3 на сессию)</li>
            </ul>
          </article>

          <article className="release-card">
            <h4>🔢 Таблица Шульте</h4>
            <p>Поиск чисел в таблице по порядку на скорость.</p>
            <ul>
              <li><strong>Режимы:</strong> Classic+, Timed+, Reverse</li>
              <li><strong>Сетки:</strong> 3×3, 4×4, 5×5, 6×6</li>
              <li><strong>Адаптивная сложность:</strong> Kids, Standard, Pro</li>
            </ul>
          </article>

          <article className="release-card">
            <h4>🧠 Memory Grid</h4>
            <p>Запоминание позиций на сетке и воспроизведение.</p>
            <ul>
              <li><strong>Режимы:</strong> Classic, Rush, Kids, Pro</li>
              <li><strong>Сетки:</strong> 3×3, 4×4, 5×5</li>
            </ul>
          </article>

          <article className="release-card">
            <h4>🎯 Spatial Memory</h4>
            <p>Запоминание пространственных паттернов и позиций.</p>
            <ul>
              <li><strong>Режимы:</strong> Classic, Timed</li>
              <li><strong>Сетки:</strong> 4×4, 5×5, 6×6</li>
            </ul>
          </article>

          <article className="release-card">
            <h4>⚡ Reaction</h4>
            <p>Тренировка скорости реакции и переключения внимания.</p>
            <ul>
              <li><strong>Режимы:</strong> Сигнал, Цвет и слово, Пара</li>
            </ul>
          </article>

          <article className="release-card">
            <h4>➗ Sprint Math</h4>
            <p>Устный счёт на скорость и точность.</p>
            <ul>
              <li><strong>Режимы:</strong> Add/Sub, Mixed, All</li>
            </ul>
          </article>

          <article className="release-card">
            <h4>🔢 N-Back Lite</h4>
            <p>Рабочая память: запоминание последовательности стимулов.</p>
            <ul>
              <li><strong>Режимы:</strong> 1-back, 2-back, 3-back</li>
              <li><strong>Время:</strong> 60 сек, 90 сек</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="setup-block">
        <h3>Классы и соревнования</h3>
        <div className="release-list">
          <article className="release-card">
            <h4>👥 Управление классами</h4>
            <p>Создавайте классы, добавляйте учеников и отслеживайте прогресс группы.</p>
            <ul>
              <li><strong>Создание класса:</strong> Раздел «Классы» → «Создать класс»</li>
              <li><strong>Добавление учеников:</strong> Выберите класс → «Добавить ученика»</li>
              <li><strong>Статистика класса:</strong> Сравнение результатов, распределение уровней</li>
            </ul>
          </article>

          <article className="release-card">
            <h4>🏆 Соревнования (в разработке)</h4>
            <p>Онлайн-соревнования между учениками в реальном времени.</p>
            <ul>
              <li><strong>PvP дуэли:</strong> 1 на 1 в выбранном тренажёре</li>
              <li><strong>Командные челленджи:</strong> Класс против класса</li>
              <li><strong>Турниры:</strong> Еженедельные лидерборды</li>
              <li><strong>Сезонные ивенты:</strong> Весенний кубок, Зимний марафон</li>
            </ul>
            <p className="status-line">Ожидайте в будущих версиях!</p>
          </article>
        </div>
      </section>

      <section className="setup-block">
        <h3>Система прогресса</h3>
        <ul>
          <li><strong>XP:</strong> 4–10 XP за сессию в зависимости от точности и сложности</li>
          <li><strong>Уровни:</strong> Повышение каждые 100+ XP, множитель до 2x за серии</li>
          <li><strong>Достижения:</strong> 24 бейджа за серии дней, количество сессий, навыки</li>
          <li><strong>Навыки:</strong> 5 осей (Attention, Memory, Reaction, Math, Logic) с процентами</li>
        </ul>
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
