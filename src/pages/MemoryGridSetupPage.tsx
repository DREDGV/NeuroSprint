import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getMemoryGridSetup,
  resetMemoryGridSetup,
  saveMemoryGridSetup
} from "../features/memory-grid/setupStorage";
import {
  normalizeMemoryGridSetup,
  type MemoryGridLevel,
  type MemoryGridMode,
  type MemoryGridSetup,
  type MemoryGridSize
} from "../features/memory-grid/engine";
import { InfoHint } from "../shared/ui/InfoHint";

interface MemoryGridSessionNavState {
  setup: MemoryGridSetup;
}

export function MemoryGridSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [setup, setSetup] = useState<MemoryGridSetup>(() => getMemoryGridSetup());

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam === "rush" && setup.mode !== "rush") {
      setSetup((current) => normalizeMemoryGridSetup({ ...current, mode: "rush" }));
    } else if (modeParam === "classic" && setup.mode !== "classic") {
      setSetup((current) => normalizeMemoryGridSetup({ ...current, mode: "classic" }));
    }
  }, [searchParams, setup.mode]);

  function startSession(): void {
    const normalized = normalizeMemoryGridSetup(setup);
    saveMemoryGridSetup(normalized);
    navigate("/training/memory-grid/session", {
      state: { setup: normalized } satisfies MemoryGridSessionNavState
    });
  }

  function resetDefaults(): void {
    setSetup(resetMemoryGridSetup());
  }

  return (
    <section className="panel" data-testid="memory-grid-setup-page">
      <h2>Memory Grid Rush</h2>
      <p>
        Тренировка рабочей памяти: запоминайте последовательность подсвеченных клеток
        и воспроизводите её в правильном порядке.
      </p>

      <InfoHint title="Как играть" testId="memory-grid-setup-hint">
        <p><strong>1.</strong> Выберите режим и размер сетки.</p>
        <p><strong>2.</strong> Смотрите на последовательность подсвеченных клеток.</p>
        <p><strong>3.</strong> После показа воспроизведите последовательность кликами.</p>
        <p><strong>4.</strong> Classic: ошибка = конец игры. Rush: 60 сек на максимум уровней.</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Настройки сессии</h3>
        <div className="settings-form">
          <label htmlFor="memory-grid-mode">Режим</label>
          <select
            id="memory-grid-mode"
            value={setup.mode}
            onChange={(event) =>
              setSetup((current) =>
                normalizeMemoryGridSetup({
                  ...current,
                  mode: event.target.value as MemoryGridMode
                })
              )
            }
            data-testid="memory-grid-mode-select"
          >
            <option value="classic">Classic (ошибка = конец)</option>
            <option value="rush">Rush (60 секунд)</option>
          </select>

          <label htmlFor="memory-grid-size">Размер сетки</label>
          <select
            id="memory-grid-size"
            value={setup.gridSize}
            onChange={(event) =>
              setSetup((current) =>
                normalizeMemoryGridSetup({
                  ...current,
                  gridSize: Number(event.target.value) as MemoryGridSize
                })
              )
            }
            data-testid="memory-grid-size-select"
          >
            <option value={3}>3 × 3 (9 клеток)</option>
            <option value={4}>4 × 4 (16 клеток)</option>
          </select>

          <label htmlFor="memory-grid-level">Начальный уровень</label>
          <select
            id="memory-grid-level"
            value={setup.startLevel}
            onChange={(event) =>
              setSetup((current) =>
                normalizeMemoryGridSetup({
                  ...current,
                  startLevel: Number(event.target.value) as MemoryGridLevel
                })
              )
            }
            data-testid="memory-grid-level-select"
          >
            <option value={1}>1 (2 клетки - очень легко)</option>
            <option value={2}>2 (3 клетки - легко)</option>
            <option value={3}>3 (4 клетки - нормально)</option>
            <option value={4}>4 (5 клеток - средне)</option>
            <option value={5}>5 (6 клеток - сложно)</option>
            <option value={6}>6 (7 клеток - очень сложно)</option>
            <option value={7}>7 (8 клеток - эксперт)</option>
          </select>

          {setup.mode === "rush" && (
            <>
              <label htmlFor="memory-grid-duration">Длительность</label>
              <select
                id="memory-grid-duration"
                value={setup.durationSec}
                onChange={(event) =>
                  setSetup((current) =>
                    normalizeMemoryGridSetup({
                      ...current,
                      durationSec: Number(event.target.value) as 60 | 90 | 120
                    })
                  )
                }
                data-testid="memory-grid-duration-select"
              >
                <option value={60}>60 сек</option>
                <option value={90}>90 сек</option>
                <option value={120}>120 сек</option>
              </select>
            </>
          )}
        </div>
      </section>

      <section className="session-brief" data-testid="memory-grid-session-brief">
        <h3>Параметры перед стартом</h3>
        <p>Режим: <strong>{setup.mode === "classic" ? "Classic" : "Rush"}</strong></p>
        <p>Сетка: <strong>{setup.gridSize}×{setup.gridSize}</strong></p>
        <p>Начальный уровень: <strong>{setup.startLevel} ({setup.startLevel + 1} кл.)</strong></p>
        {setup.mode === "rush" && <p>Длительность: <strong>{setup.durationSec} сек</strong></p>}
      </section>

      <div className="action-row">
        <button type="button" className="btn-ghost" onClick={resetDefaults}>
          Сбросить к стандарту
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={startSession}
          data-testid="memory-grid-start-btn"
        >
          Начать тренировку
        </button>
      </div>
    </section>
  );
}
