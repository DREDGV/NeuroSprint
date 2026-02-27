import { Link } from "react-router-dom";
import { TRAINING_MODULES } from "../shared/lib/training/presets";

const modulePrimaryRouteById: Record<string, string> = {
  schulte: "/training/schulte",
  sprint_math: "/training/sprint-math"
};

const modulePreSessionRouteById: Record<string, string> = {
  schulte: "/training/pre-session?module=schulte",
  sprint_math: "/training/pre-session?module=sprint_math"
};

export function TrainingHubPage() {
  return (
    <section className="panel" data-testid="training-hub-page">
      <h2>Тренировки</h2>
      <p>
        Основной путь: выберите модуль, настройте параметры и нажмите
        {" "}
        «Начать тренировку».
      </p>

      <div className="module-grid">
        {TRAINING_MODULES.map((module) => (
          <article
            key={module.id}
            className={module.status === "active" ? "module-card" : "module-card is-disabled"}
            data-testid={`training-module-${module.id}`}
          >
            <h3>{module.title}</h3>
            <p>{module.description}</p>
            {module.status === "active" ? (
              <>
                <Link
                  className="btn-primary"
                  to={modulePrimaryRouteById[module.id] ?? "/training"}
                  data-testid={`training-open-${module.id}`}
                >
                  Открыть модуль
                </Link>
                <Link
                  className="btn-ghost"
                  to={modulePreSessionRouteById[module.id] ?? "/training/pre-session"}
                  data-testid={`training-open-presession-${module.id}`}
                >
                  План дня (опция)
                </Link>
              </>
            ) : (
              <span className="coming-soon-badge">Скоро</span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
