import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
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
      <h2>Decision Rush</h2>
      <p>
        Тренировка скорости мышления и самоконтроля: быстро принимайте решения
        по правилам «ДА/НЕТ» при смене условий.
      </p>

      <InfoHint title="Как играть" testId="decision-setup-hint">
        <p>1. Выберите уровень и длительность сессии.</p>
        <p>2. Читайте правило в верхней части экрана.</p>
        <p>3. Нажимайте «ДА» или «НЕТ» как можно быстрее и точнее.</p>
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
            <option value="kids">Kids</option>
            <option value="standard">Standard</option>
            <option value="pro">Pro</option>
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
        <h3>Параметры перед стартом</h3>
        <p>Уровень: {setup.level}</p>
        <p>Длительность: {setup.durationSec} сек</p>
        <p>Mode ID: {modeIdFromDecisionLevel(setup.level)}</p>
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
