import { Link } from "react-router-dom";
import { TRAINING_MODULES } from "../shared/lib/training/presets";

export function TrainingHubPage() {
  return (
    <section className="panel" data-testid="training-hub-page">
      <h2>Тренировки</h2>
      <p>Выберите модуль и режим. Настройки можно изменить перед запуском.</p>

      <div className="module-grid">
        {TRAINING_MODULES.map((module) => (
          <article
            key={module.id}
            className={module.status === "active" ? "module-card" : "module-card is-disabled"}
          >
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            {module.status === "active" ? (
              <Link className="btn-primary" to="/training/schulte">
                Открыть модуль
              </Link>
            ) : (
              <span className="coming-soon-badge">Скоро</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

