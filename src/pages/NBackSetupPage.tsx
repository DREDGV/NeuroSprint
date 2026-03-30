import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  levelFromModeId,
  modeIdFromNBackLevel,
  normalizeNBackSetup,
  type NBackDurationSec,
  type NBackGridSize,
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
    const modeParams = searchParams.get("mode");
    const config = levelFromModeId(modeParams);
    if (!config || (config.level === setup.level && config.gridSize === setup.gridSize)) {
      return;
    }

    setSetup((current) =>
      normalizeNBackSetup({
        ...current,
        level: config.level,
        gridSize: config.gridSize
      })
    );
  }, [searchParams, setup.level, setup.gridSize]);

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
      <h2>N-Back</h2>
      <p className="session-intro-text">
        Научно обоснованный тренажёр рабочей памяти. Запоминание позиций с задержкой развивает способность удерживать и обновлять информацию в уме.
      </p>

      <InfoHint title="Как играть в N-Back" testId="nback-setup-hint">
        <p><strong>1.</strong> Выберите уровень сложности (1-back, 2-back) и длительность.</p>
        <p><strong>2.</strong> На каждом шаге смотрите на подсвеченную клетку в сетке.</p>
        <p><strong>3.</strong> Нажимайте «Совпало», если позиция совпала с позицией N шагов назад.</p>
        <p><strong>4.</strong> Цвета клеток помогают запоминать позиции.</p>
        <hr />
        <p><strong>Что тренирует:</strong></p>
        <ul>
          <li>Рабочую память (удержание информации)</li>
          <li>Концентрацию и фокус внимания</li>
          <li>Способность обновлять информацию в уме</li>
        </ul>
        <p><strong>Совет:</strong> Начните с 1-back и короткой сессии (60 сек). Когда точность достигнет 80%+, переходите на 2-back.</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Настройки сессии</h3>
        <div className="settings-form">
          <label htmlFor="nback-level">Уровень сложности</label>
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
            <option value={1}>1-back (Начинающий)</option>
            <option value={2}>2-back (Средний)</option>
            <option value={3}>3-back (Продвинутый)</option>
          </select>

          <label htmlFor="nback-gridsize">Размер сетки</label>
          <select
            id="nback-gridsize"
            value={setup.gridSize}
            onChange={(event) =>
              setSetup((current) =>
                normalizeNBackSetup({
                  ...current,
                  gridSize: Number(event.target.value) as NBackGridSize
                })
              )
            }
            data-testid="nback-gridsize-select"
          >
            <option value={3}>3 × 3 (9 клеток)</option>
            <option value={4}>4 × 4 (16 клеток)</option>
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
            <option value={120}>120 сек</option>
          </select>

          <label htmlFor="nback-tutorial">Режим обучения</label>
          <select
            id="nback-tutorial"
            value={setup.tutorialMode ? "true" : "false"}
            onChange={(event) =>
              setSetup((current) =>
                normalizeNBackSetup({
                  ...current,
                  tutorialMode: event.target.value === "true"
                })
              )
            }
            data-testid="nback-tutorial-select"
          >
            <option value="false">Обычный режим</option>
            <option value="true">Обучение (с подсказками)</option>
          </select>
        </div>
      </section>

      <section className="session-brief" data-testid="nback-session-brief">
        <h3>Параметры перед стартом</h3>
        <p>Режим: <strong>{setup.level}-back</strong> на сетке <strong>{setup.gridSize}×{setup.gridSize}</strong></p>
        <p>Длительность: <strong>{setup.durationSec} сек</strong> ({Math.floor(setup.durationSec * 1000 / 1500)} шагов)</p>
        <p>Mode ID: {modeIdFromNBackLevel(setup.level, setup.gridSize)}</p>
        {setup.tutorialMode && <p className="status-line" style={{ color: '#1e7f71' }}>🎓 Режим обучения включён</p>}
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
