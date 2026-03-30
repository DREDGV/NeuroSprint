import { useEffect, useMemo, useState } from "react";
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

  const mode: MemoryGridMode = modeParam.includes("_rush") ? "rush" : "classic";
  const difficulty: MemoryGridDifficulty = modeParam.includes("_kids")
    ? "kids"
    : modeParam.includes("_pro")
      ? "pro"
      : "standard";
  const gridSize: MemoryGridSize = modeParam.includes("_4x4") ? 4 : 3;

  return { mode, difficulty, gridSize };
}

function availableLevels(difficulty: MemoryGridDifficulty): MemoryGridLevel[] {
  const [min, max] = DIFFICULTY_PRESETS[difficulty].levelRange;
  const levels: MemoryGridLevel[] = [];
  for (let level = min; level <= max; level += 1) {
    levels.push(level as MemoryGridLevel);
  }
  return levels;
}

function levelHint(level: number): string {
  if (level <= 2) {
    return "очень легко";
  }
  if (level <= 4) {
    return "базовый темп";
  }
  if (level <= 6) {
    return "повышенная сложность";
  }
  return "продвинутый";
}

function modeTitle(mode: MemoryGridMode): string {
  return mode === "classic" ? "Classic" : "Rush";
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
    setSetup((current) => normalizeMemoryGridSetup({ ...current, ...overrides }));
  }, [searchParams]);

  const preset = DIFFICULTY_PRESETS[setup.difficulty];
  const levels = useMemo(() => availableLevels(setup.difficulty), [setup.difficulty]);

  function startSession(): void {
    const normalized = normalizeMemoryGridSetup(setup);
    saveMemoryGridSetup(normalized);
    navigate("/training/memory-grid/session", {
      state: { setup: normalized } satisfies MemoryGridSessionNavState
    });
  }

  function applyMode(mode: MemoryGridMode): void {
    setSetup((current) => normalizeMemoryGridSetup({ ...current, mode }));
  }

  function applyDifficulty(difficulty: MemoryGridDifficulty): void {
    const nextPreset = DIFFICULTY_PRESETS[difficulty];
    setSetup((current) =>
      normalizeMemoryGridSetup({
        ...current,
        difficulty,
        gridSize: nextPreset.gridSizes[0],
        startLevel: nextPreset.levelRange[0]
      })
    );
  }

  function applyGridSize(gridSize: MemoryGridSize): void {
    setSetup((current) => normalizeMemoryGridSetup({ ...current, gridSize }));
  }

  function applyStartLevel(startLevel: MemoryGridLevel): void {
    setSetup((current) => normalizeMemoryGridSetup({ ...current, startLevel }));
  }

  function applyDuration(durationSec: 60 | 90 | 120): void {
    setSetup((current) => normalizeMemoryGridSetup({ ...current, durationSec }));
  }

  function resetDefaults(): void {
    setSetup(resetMemoryGridSetup());
  }

  return (
    <section className="panel" data-testid="memory-grid-setup-page">
      <h2>Сетка памяти</h2>
      <p className="session-intro-text">
        Запоминайте последовательность подсвеченных клеток и воспроизводите её в правильном порядке. Тренирует зрительную память, порядок воспроизведения и точность запоминания паттернов.
      </p>

      <InfoHint title="Как играть в Сетку памяти" testId="memory-grid-setup-hint">
        <p><strong>1.</strong> Выберите режим (Classic или Rush) и сложность.</p>
        <p><strong>2.</strong> Запомните порядок подсветки клеток.</p>
        <p><strong>3.</strong> Нажмите клетки в том же порядке.</p>
        <p><strong>4.</strong> Classic: ошибка завершает сессию. Rush: игра по таймеру, важно пройти больше уровней.</p>
        <hr />
        <p><strong>Что тренирует:</strong></p>
        <ul>
          <li>Зрительную память (запоминание паттернов)</li>
          <li>Порядок воспроизведения последовательности</li>
          <li>Концентрацию и скорость переключения</li>
        </ul>
        <p><strong>Совет:</strong> Используйте метод «группировки» — разбивайте последовательность на части по 2-3 клетки. Это упрощает запоминание длинных цепочек.</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Режим</h3>
        <div className="segmented-row">
          <button
            type="button"
            className={setup.mode === "classic" ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => applyMode("classic")}
            data-testid="memory-grid-mode-classic"
          >
            Classic
          </button>
          <button
            type="button"
            className={setup.mode === "rush" ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => applyMode("rush")}
            data-testid="memory-grid-mode-rush"
          >
            Rush
          </button>
        </div>
      </section>

      <section className="setup-block">
        <h3>Параметры сессии</h3>
        <div className="settings-form">
          <label htmlFor="memory-grid-difficulty">Сложность</label>
          <select
            id="memory-grid-difficulty"
            value={setup.difficulty}
            onChange={(event) => applyDifficulty(event.target.value as MemoryGridDifficulty)}
            data-testid="memory-grid-difficulty-select"
          >
            {Object.entries(DIFFICULTY_PRESETS).map(([key, value]) => (
              <option key={key} value={key}>
                {value.title} - {value.recommended}
              </option>
            ))}
          </select>
          <p className="status-line">{preset.description}</p>

          <label htmlFor="memory-grid-size">Сетка</label>
          <select
            id="memory-grid-size"
            value={setup.gridSize}
            onChange={(event) => applyGridSize(Number(event.target.value) as MemoryGridSize)}
            data-testid="memory-grid-size-select"
          >
            {preset.gridSizes.map((size) => (
              <option key={size} value={size}>
                {size}x{size} ({size * size} клеток)
              </option>
            ))}
          </select>

          <label htmlFor="memory-grid-level">Стартовый уровень</label>
          <select
            id="memory-grid-level"
            value={setup.startLevel}
            onChange={(event) => applyStartLevel(Number(event.target.value) as MemoryGridLevel)}
            data-testid="memory-grid-level-select"
          >
            {levels.map((level) => (
              <option key={level} value={level}>
                {level}: {level + 1} клеток ({levelHint(level)})
              </option>
            ))}
          </select>

          {setup.mode === "rush" ? (
            <>
              <label htmlFor="memory-grid-duration">Длительность</label>
              <select
                id="memory-grid-duration"
                value={setup.durationSec}
                onChange={(event) =>
                  applyDuration(Number(event.target.value) as 60 | 90 | 120)
                }
                data-testid="memory-grid-duration-select"
              >
                <option value={60}>60 сек</option>
                <option value={90}>90 сек</option>
                <option value={120}>120 сек</option>
              </select>
            </>
          ) : null}
        </div>
      </section>

      <section className="session-brief" data-testid="memory-grid-session-brief">
        <h3>Перед стартом</h3>
        <p>
          Режим: <strong>{modeTitle(setup.mode)}</strong>
        </p>
        <p>
          Сложность: <strong>{preset.title}</strong>
        </p>
        <p>
          Сетка: <strong>{setup.gridSize}x{setup.gridSize}</strong>
        </p>
        <p>
          Уровень старта: <strong>{setup.startLevel}</strong>
        </p>
        {setup.mode === "rush" ? (
          <p>
            Длительность: <strong>{setup.durationSec} сек</strong>
          </p>
        ) : null}
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
