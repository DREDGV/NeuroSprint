import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getValidGridSizesForLevel,
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

const LEVEL_DESCRIPTIONS: Record<NBackLevel, { label: string; desc: string }> = {
  1: { label: "1-back", desc: "Сравнивайте текущую клетку с предыдущей. Идеально для начала." },
  2: { label: "2-back", desc: "Сравнивайте с клеткой 2 шага назад. Средняя сложность." },
  3: { label: "3-back", desc: "Сравнивайте с клеткой 3 шага назад. Только для опытных." }
};

const GRID_DESCRIPTIONS: Record<NBackGridSize, string> = {
  3: "3 × 3 — 9 клеток. Стандартный размер.",
  4: "4 × 4 — 16 клеток. Больше клеток — сложнее запоминать."
};

const DURATION_DESCRIPTIONS: Record<NBackDurationSec, string> = {
  60: "60 секунд — короткая разминка",
  90: "90 секунд — стандартная сессия",
  120: "120 секунд — полная тренировка"
};

const LEVEL_OPTIONS: Array<[NBackLevel, { label: string; desc: string }]> = Object.entries(
  LEVEL_DESCRIPTIONS
).map(([value, details]) => [Number(value) as NBackLevel, details]);

const DURATION_OPTIONS: Array<[NBackDurationSec, string]> = Object.entries(
  DURATION_DESCRIPTIONS
).map(([value, label]) => [Number(value) as NBackDurationSec, label]);

export function NBackSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [setup, setSetup] = useState<NBackSetup>(() => getNBackSetup());

  const validGridSizes = useMemo(
    () => getValidGridSizesForLevel(setup.level),
    [setup.level]
  );

  // Если текущий gridSize недопустим для выбранного уровня — сбрасываем
  useEffect(() => {
    if (!validGridSizes.includes(setup.gridSize)) {
      setSetup((current) =>
        normalizeNBackSetup({
          ...current,
          gridSize: validGridSizes[0]
        })
      );
    }
  }, [validGridSizes, setup.gridSize]);

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

  const totalSteps = Math.floor((setup.durationSec * 1000) / 1500);
  const targetSteps = Math.floor(totalSteps * 0.3);

  return (
    <section className="panel" data-testid="nback-setup-page">
      <h2>🧠 N-Назад</h2>
      <p className="session-intro-text">
        Научно обоснованный тренажёр рабочей памяти. На каждом шаге появляется подсветка клетки — 
        вам нужно нажать «Совпало», если эта же клетка светилась <strong>N шагов назад</strong>.
      </p>

      <InfoHint title="Как играть в N-Назад" testId="nback-setup-hint">
        <p><strong>Суть:</strong> Запомните, какие клетки подсвечивались, и сравните текущую с той, что была N шагов назад.</p>
        <p><strong>1.</strong> Выберите уровень: 1-back (сравнивать с предыдущей), 2-back (через одну), 3-back (через две).</p>
        <p><strong>2.</strong> Смотрите на сетку — клетки подсвечиваются по очереди.</p>
        <p><strong>3.</strong> Нажмите «Совпало» если текущая клетка совпадает с позицией N шагов назад.</p>
        <p><strong>4.</strong> Нажмите «Не совпало» если позиция другая.</p>
        <hr />
        <p><strong>Что тренирует:</strong></p>
        <ul>
          <li>🧠 Рабочую память — удержание нескольких позиций в уме</li>
          <li>🎯 Концентрацию — нельзя пропустить ни одного шага</li>
          <li>⚡ Скорость обновления — быстро переключаться между позициями</li>
        </ul>
        <p><strong>Совет:</strong> Начните с 1-back на 3×3 и 60 секунд. Когда точность будет 80%+, попробуйте 2-back. Режим обучения поможет освоиться.</p>
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
            {LEVEL_OPTIONS.map(([value, { label, desc }]) => (
              <option key={value} value={value}>
                {label} — {desc}
              </option>
            ))}
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
            disabled={validGridSizes.length === 1}
            data-testid="nback-gridsize-select"
          >
            {validGridSizes.map((size) => (
              <option key={size} value={size}>
                {GRID_DESCRIPTIONS[size]}
              </option>
            ))}
          </select>
          {validGridSizes.length === 1 && (
            <p className="status-line" style={{ color: "#e67e22", fontSize: "0.85rem" }}>
              ⚠️ Для 3-back доступен только размер 3×3 — иначе слишком сложно.
            </p>
          )}

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
            {DURATION_OPTIONS.map(([value, desc]) => (
              <option key={value} value={value}>
                {desc}
              </option>
            ))}
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
            <option value="true">🎓 Обучение — первые шаги с подсказками</option>
          </select>
        </div>
      </section>

      <section className="session-brief" data-testid="nback-session-brief">
        <h3>Параметры перед стартом</h3>
        <p>Режим: <strong>{LEVEL_DESCRIPTIONS[setup.level].label}</strong> на сетке <strong>{setup.gridSize}×{setup.gridSize}</strong></p>
        <p>Всего шагов: <strong>{totalSteps}</strong> (примерно <strong>{targetSteps}</strong> совпадений)</p>
        <p>Длительность: <strong>{DURATION_DESCRIPTIONS[setup.durationSec]}</strong></p>
        {setup.tutorialMode && (
          <p className="status-line" style={{ color: "#1e7f71" }}>
            🎓 Режим обучения: первые 5 шагов будут с подсказками
          </p>
        )}
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
