import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  initialDecisionIntervalMs,
  levelFromDecisionModeId,
  modeIdFromDecisionLevel,
  normalizeDecisionRushSetup,
  type DecisionRushDurationSec,
  type DecisionRushLevel,
  type DecisionRushSetup
} from "../features/decision-rush/engine";
import {
  getDecisionRushSetup,
  resetDecisionRushSetup,
  saveDecisionRushSetup
} from "../features/decision-rush/setupStorage";
import { InfoHint } from "../shared/ui/InfoHint";

interface DecisionRushSessionNavState {
  setup: DecisionRushSetup;
}

function levelLabel(level: DecisionRushLevel): string {
  if (level === "kids") {
    return "Легко";
  }
  if (level === "pro") {
    return "Эксперт";
  }
  return "Стандарт";
}

export function DecisionRushSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [setup, setSetup] = useState<DecisionRushSetup>(() => getDecisionRushSetup());

  useEffect(() => {
    const requestedLevel = levelFromDecisionModeId(searchParams.get("mode"));
    if (!requestedLevel || requestedLevel === setup.level) {
      return;
    }

    setSetup((current) =>
      normalizeDecisionRushSetup({
        ...current,
        level: requestedLevel
      })
    );
  }, [searchParams, setup.level]);

  function startSession(): void {
    const normalized = normalizeDecisionRushSetup(setup);
    saveDecisionRushSetup(normalized);
    navigate("/training/decision-rush/session", {
      state: { setup: normalized } satisfies DecisionRushSessionNavState
    });
  }

  function resetDefaults(): void {
    setSetup(resetDecisionRushSetup());
  }

  return (
    <section className="panel" data-testid="decision-setup-page">
      <h2>Быстрые решения</h2>
      <p className="session-intro-text">
        Скоростной тренажёр на переключение между правилами. Развивает гибкость мышления, точность решений и способность быстро адаптироваться к меняющимся условиям.
      </p>

      <InfoHint title="Как играть в Быстрые решения" testId="decision-setup-hint">
        <p><strong>1.</strong> Смотрите на правило вверху экрана.</p>
        <p><strong>2.</strong> Оценивайте текущий стимул (фигура/цвет/число).</p>
        <p><strong>3.</strong> Нажимайте «ДА», если правило выполняется, иначе «НЕТ».</p>
        <hr />
        <p><strong>Что тренирует:</strong></p>
        <ul>
          <li>Гибкость мышления (переключение между правилами)</li>
          <li>Точность решений в условиях времени</li>
          <li>Рабочую память (удержание правила)</li>
        </ul>
        <p><strong>Совет:</strong> Сначала точность, потом скорость. Мозг быстрее адаптируется к правилам при высокой концентрации в начале сессии.</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Настройки сессии</h3>
        <div className="settings-form">
          <label htmlFor="decision-level">Уровень</label>
          <select
            id="decision-level"
            value={setup.level}
            onChange={(event) =>
              setSetup((current) =>
                normalizeDecisionRushSetup({
                  ...current,
                  level: event.target.value as DecisionRushLevel
                })
              )
            }
            data-testid="decision-level-select"
          >
            <option value="kids">Легко (Kids)</option>
            <option value="standard">Стандарт</option>
            <option value="pro">Эксперт (Pro)</option>
          </select>

          <label htmlFor="decision-duration">Длительность</label>
          <select
            id="decision-duration"
            value={setup.durationSec}
            onChange={(event) =>
              setSetup((current) =>
                normalizeDecisionRushSetup({
                  ...current,
                  durationSec: Number(event.target.value) as DecisionRushDurationSec
                })
              )
            }
            data-testid="decision-duration-select"
          >
            <option value={45}>45 сек</option>
            <option value={60}>60 сек</option>
            <option value={90}>90 сек</option>
          </select>
        </div>
      </section>

      <section className="session-brief" data-testid="decision-session-brief">
        <h3>Перед стартом</h3>
        <p>Уровень: {levelLabel(setup.level)}</p>
        <p>Длительность: {setup.durationSec} сек</p>
        <p>Базовый темп: ~{initialDecisionIntervalMs(setup.level)} мс на шаг</p>
        <p>Режим: {modeIdFromDecisionLevel(setup.level)}</p>
        <p className="status-line">
          Если пока сложно, выберите уровень Kids и 90 секунд.
        </p>
      </section>

      <div className="action-row">
        <button type="button" className="btn-ghost" onClick={resetDefaults}>
          Сбросить к стандарту
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={startSession}
          data-testid="decision-start-btn"
        >
          Начать тренировку
        </button>
      </div>
    </section>
  );
}
