import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PATTERN_MODES,
  PATTERN_LEVELS,
  DEFAULT_PATTERN_SETUP,
  normalizePatternSetup,
  type PatternModeId,
  type PatternLevel
} from '../engine/patternConfig';
import { getPatternSetup, savePatternSetup, resetPatternSetup } from '../setupStorage';
import { InfoHint } from '../../shared/ui/InfoHint';

interface PatternSessionNavState {
  setup: ReturnType<typeof normalizePatternSetup>;
}

export function PatternRecognitionSetupPage() {
  const navigate = useNavigate();
  const [setup, setSetup] = useState(() => getPatternSetup());

  function startSession(): void {
    const normalized = normalizePatternSetup(setup);
    savePatternSetup(normalized);
    navigate('/training/pattern-recognition/session', {
      state: { setup: normalized } satisfies PatternSessionNavState
    });
  }

  function resetDefaults(): void {
    setSetup(resetPatternSetup());
  }

  return (
    <section className="panel" data-testid="pattern-setup-page">
      <h2>Pattern Recognition</h2>
      <p>Тренировка логического мышления: «Что будет следующим?»</p>

      <InfoHint title="Как играть" testId="pattern-setup-hint">
        <p>1. Смотрите на последовательность фигур вверху.</p>
        <p>2. Найдите закономерность (цвет, форма, размер).</p>
        <p>3. Выберите вариант, который продолжит паттерн.</p>
        <p>4. Сначала точность, потом скорость — это даёт лучший score.</p>
      </InfoHint>

      <section className="setup-block">
        <h3>Режим игры</h3>
        <div className="segmented-row">
          {PATTERN_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={setup.modeId === mode.id ? 'btn-secondary is-active' : 'btn-secondary'}
              onClick={() => setSetup((current) => ({ ...current, modeId: mode.id as PatternModeId }))}
              data-testid={`mode-${mode.id}`}
            >
              {mode.title}
            </button>
          ))}
        </div>
        <p className="status-line">
          {PATTERN_MODES.find(m => m.id === setup.modeId)?.description}
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
          {PATTERN_LEVELS.find(l => l.id === setup.level)?.description}
        </p>
      </section>

      {setup.modeId === 'pattern_timed' && (
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

      {setup.modeId === 'pattern_classic' && (
        <section className="setup-block">
          <h3>Количество вопросов</h3>
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

      <section className="setup-block">
        <h3>Типы элементов</h3>
        <div className="segmented-row">
          {(['color', 'shape', 'size'] as const).map((type) => {
            const isActive = setup.elementTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                className={isActive ? 'btn-secondary is-active' : 'btn-secondary'}
                onClick={() =>
                  setSetup((current) => {
                    const exists = current.elementTypes.includes(type);
                    return {
                      ...current,
                      elementTypes: exists
                        ? current.elementTypes.filter((t) => t !== type)
                        : [...current.elementTypes, type]
                    };
                  })
                }
                data-testid={`element-type-${type}`}
              >
                {type === 'color' && '🎨 Цвета'}
                {type === 'shape' && '◼️ Формы'}
                {type === 'size' && '📏 Размер'}
              </button>
            );
          })}
        </div>
        <p className="status-line">
          {setup.elementTypes.length === 0 
            ? 'Выберите хотя бы один тип' 
            : `Используется: ${setup.elementTypes.map(t => 
                t === 'color' ? 'цвет' : t === 'shape' ? 'форма' : 'размер'
              ).join(', ')}`}
        </p>
      </section>

      <section className="session-brief" data-testid="pattern-session-brief">
        <h3>Перед стартом</h3>
        <p>Режим: {PATTERN_MODES.find(m => m.id === setup.modeId)?.title}</p>
        <p>Уровень: {PATTERN_LEVELS.find(l => l.id === setup.level)?.title}</p>
        {setup.modeId === 'pattern_timed' && <p>Время: {setup.durationSec} сек</p>}
        {setup.modeId === 'pattern_classic' && <p>Вопросов: {setup.questionCount}</p>}
        <p>Элементы: {setup.elementTypes.map(t => 
          t === 'color' ? 'цвет' : t === 'shape' ? 'форма' : 'размер'
        ).join(', ')}</p>
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
