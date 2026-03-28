import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CONTENT_TYPES,
  getPatternDifficultySummary,
  normalizePatternSetup,
  PATTERN_LEVELS,
  PATTERN_MODES,
  type PatternContentType,
  type PatternLevel,
  type PatternModeId
} from "../features/pattern-recognition/engine/patternConfig";
import {
  getPatternSetup,
  resetPatternSetup,
  savePatternSetup
} from "../features/pattern-recognition/setupStorage";
import { InfoHint } from "../shared/ui/InfoHint";

interface PatternSessionNavState {
  setup: ReturnType<typeof normalizePatternSetup>;
}

export function PatternRecognitionSetupPage() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState(() => getPatternSetup());

  function startSession(): void {
    const normalized = normalizePatternSetup(setup);
    savePatternSetup(normalized);
    navigate("/training/pattern-recognition/session", {
      state: { setup: normalized } satisfies PatternSessionNavState
    });
  }

  function resetDefaults(): void {
    setSetup(resetPatternSetup());
  }

  return (
    <section className="panel pattern-setup-page" data-testid="pattern-setup-page">
      <h2>Pattern Recognition</h2>
      <p>Тренировка на чтение закономерностей: увидеть правило ряда и продолжить его без случайных догадок.</p>

      <InfoHint title="Как играть" testId="pattern-setup-hint">
        <p>1. Смотрите на ряд сверху и ищите правило: цикл, чередование, зеркало, прогрессию или числовой шаг.</p>
        <p>2. Сначала поймите ритм паттерна, а уже потом выбирайте ответ.</p>
        <p>3. В multi-gap режиме заполняйте пропуски по порядку, слева направо.</p>
        <p>4. В обучающем режиме используйте подсказки, а в рабочих режимах проверяйте себя без опоры.</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Режим</h3>
        <div className="segmented-row">
          {PATTERN_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={setup.modeId === mode.id ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() =>
                setSetup((current) => ({
                  ...current,
                  modeId: mode.id as PatternModeId
                }))
              }
              data-testid={`mode-${mode.id}`}
            >
              {mode.title}
            </button>
          ))}
        </div>
        <p className="status-line">
          {PATTERN_MODES.find((mode) => mode.id === setup.modeId)?.description}
        </p>
      </section>

      <section className="setup-block">
        <h3>Тип контента</h3>
        <div className="segmented-row">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={setup.contentType === type.id ? "btn-secondary is-active" : "btn-secondary"}
              onClick={() =>
                setSetup((current) => ({
                  ...current,
                  contentType: type.id as PatternContentType
                }))
              }
              data-testid={`content-type-${type.id}`}
            >
              <span>{type.icon}</span> {type.title}
            </button>
          ))}
        </div>
        <p className="status-line">
          {setup.contentType === "visual" && "Фигуры, цвет, форма и размер без числовой нагрузки."}
          {setup.contentType === "numeric" && "Числовые ряды, арифметика и чередование операций."}
          {setup.contentType === "mixed" && "Смешанный режим: визуальные и числовые паттерны в одной сессии."}
        </p>
      </section>

      <section className="setup-block">
        <h3>Уровень сложности</h3>
        <div className="settings-form">
          <label htmlFor="pattern-level">Уровень</label>
          <select
            id="pattern-level"
            value={setup.level}
            onChange={(event) =>
              setSetup((current) =>
                normalizePatternSetup({
                  ...current,
                  level: event.target.value as PatternLevel
                })
              )
            }
            data-testid="pattern-level-select"
          >
            {PATTERN_LEVELS.map((level) => (
              <option key={level.id} value={level.id}>
                {level.title}
              </option>
            ))}
          </select>
        </div>
        <p className="status-line">
          {PATTERN_LEVELS.find((level) => level.id === setup.level)?.description}
        </p>
      </section>

      {setup.modeId === "pattern_timed" && (
        <section className="setup-block">
          <h3>Длительность</h3>
          <div className="settings-form">
            <label htmlFor="pattern-duration">Время сессии</label>
            <select
              id="pattern-duration"
              value={setup.durationSec}
              onChange={(event) =>
                setSetup((current) =>
                  normalizePatternSetup({
                    ...current,
                    durationSec: Number(event.target.value) as 45 | 60 | 90
                  })
                )
              }
              data-testid="pattern-duration-select"
            >
              <option value={45}>45 сек</option>
              <option value={60}>60 сек</option>
              <option value={90}>90 сек</option>
            </select>
          </div>
        </section>
      )}

      {setup.modeId === "pattern_classic" && (
        <section className="setup-block">
          <h3>Длина серии</h3>
          <div className="settings-form">
            <label htmlFor="pattern-questions">Вопросов в сессии</label>
            <select
              id="pattern-questions"
              value={setup.questionCount}
              onChange={(event) =>
                setSetup((current) => ({
                  ...current,
                  questionCount: Number(event.target.value)
                }))
              }
              data-testid="pattern-questions-select"
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>
        </section>
      )}

      {setup.modeId === "pattern_multi" && (
        <section className="setup-block">
          <h3>Пропуски</h3>
          <div className="segmented-row">
            {[2, 3].map((gapCount) => (
              <button
                key={gapCount}
                type="button"
                className={(setup.gaps ?? 2) === gapCount ? "btn-secondary is-active" : "btn-secondary"}
                onClick={() => setSetup((current) => ({ ...current, gaps: gapCount }))}
                data-testid={`gaps-${gapCount}`}
              >
                {gapCount} пропуска
              </button>
            ))}
          </div>
          <p className="status-line">
            {setup.gaps ?? 2} пропуска в хвосте ряда. Слоты нужно заполнять строго по порядку.
          </p>
        </section>
      )}

      <section className="setup-block">
        <h3>Подсказки</h3>
        <div className="settings-form">
          <label htmlFor="show-hints">
            <input
              id="show-hints"
              type="checkbox"
              checked={setup.showHints || setup.modeId === "pattern_learning"}
              onChange={(event) =>
                setSetup((current) => ({
                  ...current,
                  showHints: event.target.checked
                }))
              }
              disabled={setup.modeId === "pattern_learning"}
            />
            Показывать тип паттерна во время сессии
          </label>
        </div>
        <p className="status-line">
          {setup.modeId === "pattern_learning" &&
            "В обучающем режиме подсказки включены всегда, чтобы внимание уходило в правило, а не в угадывание."}
          {setup.modeId !== "pattern_learning" &&
            (setup.showHints
              ? "Подсказки включены. Это мягче вводит новые семьи, но снижает чистоту контроля."
              : "Подсказки выключены. Это честный рабочий режим без внешней опоры.")}
        </p>
      </section>

      <section className="session-brief" data-testid="pattern-session-brief">
        <h3>Перед стартом</h3>
        <p>Режим: {PATTERN_MODES.find((mode) => mode.id === setup.modeId)?.title}</p>
        <p>Уровень: {PATTERN_LEVELS.find((level) => level.id === setup.level)?.title}</p>
        <p>
          Контент: {CONTENT_TYPES.find((type) => type.id === setup.contentType)?.icon}{" "}
          {CONTENT_TYPES.find((type) => type.id === setup.contentType)?.title}
        </p>
        {setup.modeId === "pattern_timed" && <p>Время: {setup.durationSec} сек</p>}
        {setup.modeId === "pattern_classic" && <p>Вопросов: {setup.questionCount}</p>}
        {setup.modeId === "pattern_multi" && <p>Пропусков: {setup.gaps ?? 2}</p>}
        <p>Подсказки: {setup.showHints || setup.modeId === "pattern_learning" ? "вкл" : "выкл"}</p>
        <p>Профиль сложности: {getPatternDifficultySummary(setup)}</p>
      </section>

      <div className="action-row">
        <button type="button" className="btn-ghost" onClick={resetDefaults}>
          Сбросить к стандарту
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={startSession}
          data-testid="pattern-start-btn"
        >
          Начать тренировку
        </button>
      </div>
    </section>
  );
}
