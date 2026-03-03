import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getMemoryGridSetup,
  resetMemoryGridSetup,
  saveMemoryGridSetup
} from "../features/memory-grid/setupStorage";
import {
  DIFFICULTY_PRESETS,
  normalizeMemoryGridSetup,
  type MemoryGridDifficulty,
  type MemoryGridLevel,
  type MemoryGridMode,
  type MemoryGridSetup,
  type MemoryGridSize
} from "../features/memory-grid/engine";
import { InfoHint } from "../shared/ui/InfoHint";

interface MemoryGridSessionNavState {
  setup: MemoryGridSetup;
}

function parseModeOverrides(
  modeParam: string | null
): Partial<Pick<MemoryGridSetup, "mode" | "difficulty" | "gridSize">> | null {
  if (!modeParam) {
    return null;
  }

  if (modeParam === "rush" || modeParam === "classic") {
    return { mode: modeParam };
  }

  if (!modeParam.startsWith("memory_grid_")) {
    return null;
  }

  const mode = modeParam.includes("_rush") ? "rush" : "classic";
  const difficulty = modeParam.includes("_kids")
    ? "kids"
    : modeParam.includes("_pro")
      ? "pro"
      : "standard";
  const gridSize = modeParam.includes("_4x4") ? 4 : difficulty === "pro" ? 4 : 3;

  return { mode, difficulty, gridSize };
}

function toggleFullScreen(): void {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {
      // Игнорируем ошибки если браузер не поддерживает
    });
  } else {
    document.exitFullscreen().catch(() => {
      // Игнорируем ошибки
    });
  }
}

export function MemoryGridSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [setup, setSetup] = useState<MemoryGridSetup>(() => getMemoryGridSetup());

  useEffect(() => {
    const overrides = parseModeOverrides(searchParams.get("mode"));
    if (!overrides) {
      return;
    }

    setSetup((current) => {
      const next = normalizeMemoryGridSetup({
        ...current,
        ...overrides
      });
      if (
        next.mode === current.mode &&
        next.difficulty === current.difficulty &&
        next.gridSize === current.gridSize &&
        next.startLevel === current.startLevel &&
        next.durationSec === current.durationSec
      ) {
        return current;
      }
      return next;
    });
  }, [searchParams]);

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
        <p><strong>1.</strong> Выберите режим сложности и размер сетки.</p>
        <p><strong>2.</strong> Смотрите на последовательность подсвеченных клеток.</p>
        <p><strong>3.</strong> После показа воспроизведите последовательность кликами.</p>
        <p><strong>4.</strong> Classic: ошибка = конец игры. Rush: 60 сек на максимум уровней.</p>
      </InfoHint>

      <div className="action-row" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className="btn-ghost"
          onClick={toggleFullScreen}
          data-testid="memory-grid-fullscreen-btn"
        >
          <span>⛶</span> Полноэкранный режим
        </button>
      </div>

      <section className="setup-block">
        <h3>Настройки сессии</h3>
        <div className="settings-form">
          <label htmlFor="memory-grid-difficulty">Режим сложности</label>
          <select
            id="memory-grid-difficulty"
            value={setup.difficulty}
            onChange={(event) => {
              const newDifficulty = event.target.value as MemoryGridDifficulty;
              const preset = DIFFICULTY_PRESETS[newDifficulty];
              setSetup((current) =>
                normalizeMemoryGridSetup({
                  ...current,
                  difficulty: newDifficulty,
                  gridSize: preset.gridSizes[0],
                  startLevel: preset.levelRange[0]
                })
              );
            }}
            data-testid="memory-grid-difficulty-select"
          >
            {Object.entries(DIFFICULTY_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.title} — {preset.recommended}
              </option>
            ))}
          </select>
          
          <p className="status-line" style={{ fontSize: '0.85rem', marginTop: '-8px' }}>
            {DIFFICULTY_PRESETS[setup.difficulty].description}
          </p>

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
            {DIFFICULTY_PRESETS[setup.difficulty].gridSizes.map((size) => (
              <option key={size} value={size}>
                {size} × {size} ({size * size} клеток)
              </option>
            ))}
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
            {Array.from(
              { length: DIFFICULTY_PRESETS[setup.difficulty].levelRange[1] - DIFFICULTY_PRESETS[setup.difficulty].levelRange[0] + 1 },
              (_, i) => i + DIFFICULTY_PRESETS[setup.difficulty].levelRange[0]
            ).map((level) => (
              <option key={level} value={level}>
                {level} ({level + 1} кл.
                {level <= 2 ? ' - очень легко' : level <= 4 ? ' - нормально' : level <= 6 ? ' - сложно' : ' - эксперт'})
              </option>
            ))}
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
