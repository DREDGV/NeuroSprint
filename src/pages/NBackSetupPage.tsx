import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  levelFromModeId,
  modeIdFromNBackLevel,
  normalizeNBackSetup,
  type NBackDurationSec,
  type NBackLevel,
  type NBackSetup
} from "../features/nback/engine";
import {
  getNBackSetup,
  resetNBackSetup,
  saveNBackSetup
} from "../features/nback/setupStorage";
import { InfoHint } from "../shared/ui/InfoHint";

interface NBackSessionNavState {
  setup: NBackSetup;
}

export function NBackSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [setup, setSetup] = useState<NBackSetup>(() => getNBackSetup());

  useEffect(() => {
    const requestedLevel = levelFromModeId(searchParams.get("mode"));
    if (!requestedLevel || requestedLevel === setup.level) {
      return;
    }

    setSetup((current) =>
      normalizeNBackSetup({
        ...current,
        level: requestedLevel
      })
    );
  }, [searchParams, setup.level]);

  function startSession(): void {
    const normalized = normalizeNBackSetup(setup);
    saveNBackSetup(normalized);
    navigate("/training/nback/session", {
      state: { setup: normalized } satisfies NBackSessionNavState
    });
  }

  function resetDefaults(): void {
    setSetup(resetNBackSetup());
  }

  return (
    <section className="panel" data-testid="nback-setup-page">
      <h2>N-Back Lite</h2>
      <p>
        Тренировка рабочей памяти: запоминайте позицию подсвеченной клетки и
        отмечайте совпадения.
      </p>

      <InfoHint title="Как играть" testId="nback-setup-hint">
        <p>1. Выберите уровень 1-back или 2-back и длительность 60/90 секунд.</p>
        <p>2. На каждом шаге смотрите на подсвеченную клетку в сетке 3x3.</p>
        <p>3. Жмите «Совпало», если позиция совпала с N шагов назад, иначе «Не совпало».</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Настройки сессии</h3>
        <div className="settings-form">
          <label htmlFor="nback-level">Уровень</label>
          <select
            id="nback-level"
            value={setup.level}
            onChange={(event) =>
              setSetup((current) =>
                normalizeNBackSetup({
                  ...current,
                  level: Number(event.target.value) as NBackLevel
                })
              )
            }
            data-testid="nback-level-select"
          >
            <option value={1}>1-back</option>
            <option value={2}>2-back</option>
          </select>

          <label htmlFor="nback-duration">Длительность</label>
          <select
            id="nback-duration"
            value={setup.durationSec}
            onChange={(event) =>
              setSetup((current) =>
                normalizeNBackSetup({
                  ...current,
                  durationSec: Number(event.target.value) as NBackDurationSec
                })
              )
            }
            data-testid="nback-duration-select"
          >
            <option value={60}>60 сек</option>
            <option value={90}>90 сек</option>
          </select>
        </div>
      </section>

      <section className="session-brief" data-testid="nback-session-brief">
        <h3>Параметры перед стартом</h3>
        <p>Режим: {setup.level}-back</p>
        <p>Длительность: {setup.durationSec} сек</p>
        <p>Mode ID: {modeIdFromNBackLevel(setup.level)}</p>
      </section>

      <div className="action-row">
        <button type="button" className="btn-ghost" onClick={resetDefaults}>
          Сбросить к стандарту
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={startSession}
          data-testid="nback-start-btn"
        >
          Начать тренировку
        </button>
      </div>
    </section>
  );
}
