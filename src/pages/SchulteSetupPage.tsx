import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { preferenceRepository } from "../entities/preferences/preferenceRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  SCHULTE_MODES,
  getPresetSetup,
  withLevelDefaults
} from "../shared/lib/training/presets";
import {
  SCHULTE_THEME_OPTIONS,
  resolveSchulteTheme
} from "../shared/lib/training/themes";
import {
  getTrainingSetup,
  saveTrainingSetup
} from "../shared/lib/training/setupStorage";
import type {
  SchulteThemeConfig,
  TrainingModeId,
  TrainingPresetId,
  TrainingSetup,
  UserModeProfile
} from "../shared/types/domain";

const LEVEL_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

function isTrainingModeId(value: string | null): value is TrainingModeId {
  return value === "classic_plus" || value === "timed_plus" || value === "reverse";
}

export function SchulteSetupPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeUserId } = useActiveUser();
  const [modeId, setModeId] = useState<TrainingModeId>(() => {
    const requestedMode = searchParams.get("mode");
    return isTrainingModeId(requestedMode) ? requestedMode : "classic_plus";
  });
  const [setup, setSetup] = useState<TrainingSetup>(() => {
    const requestedMode = searchParams.get("mode");
    const initialMode = isTrainingModeId(requestedMode)
      ? requestedMode
      : "classic_plus";
    return getTrainingSetup(initialMode);
  });
  const [profile, setProfile] = useState<UserModeProfile | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (!isTrainingModeId(requestedMode) || requestedMode === modeId) {
      return;
    }
    setModeId(requestedMode);
  }, [modeId, searchParams]);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const [storedSetup, modeProfile, preference] = await Promise.all([
        Promise.resolve(getTrainingSetup(modeId)),
        trainingRepository.getUserModeProfile(activeUserId, "schulte", modeId),
        preferenceRepository.getOrCreate(activeUserId)
      ]);

      if (cancelled) {
        return;
      }

      const effectiveLevel =
        modeProfile.autoAdjust && modeProfile.manualLevel == null
          ? modeProfile.level
          : modeProfile.manualLevel ?? modeProfile.level;
      const hydrated = modeProfile.autoAdjust
        ? withLevelDefaults(storedSetup, effectiveLevel, modeId)
        : storedSetup;

      setProfile(modeProfile);
      setSetup({
        ...hydrated,
        visualThemeId: preference.schulteThemeId,
        customTheme: preference.schulteCustomTheme
      });
      setMessage(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, modeId]);

  const selectedMode = useMemo(
    () => SCHULTE_MODES.find((entry) => entry.id === modeId) ?? SCHULTE_MODES[0],
    [modeId]
  );

  const effectiveLevel = useMemo(() => {
    if (!profile) {
      return 1;
    }
    if (!profile.autoAdjust && profile.manualLevel != null) {
      return profile.manualLevel;
    }
    return profile.level;
  }, [profile]);

  const previewTheme = useMemo(
    () => resolveSchulteTheme(setup.visualThemeId, setup.customTheme),
    [setup.customTheme, setup.visualThemeId]
  );

  function applyPreset(presetId: TrainingPresetId) {
    const preset = getPresetSetup(presetId);
    const next = profile?.autoAdjust
      ? withLevelDefaults(preset, effectiveLevel, modeId)
      : preset;
    setSetup((current) => ({
      ...next,
      visualThemeId: current.visualThemeId,
      customTheme: current.customTheme
    }));
  }

  async function handleStart() {
    if (!activeUserId || !profile) {
      return;
    }

    const profileToSave: UserModeProfile = {
      ...profile,
      level:
        profile.autoAdjust || profile.manualLevel == null
          ? profile.level
          : profile.manualLevel
    };

    await Promise.all([
      trainingRepository.saveUserModeProfile(profileToSave),
      preferenceRepository.saveSchulteTheme(
        activeUserId,
        setup.visualThemeId,
        setup.customTheme
      )
    ]);
    saveTrainingSetup(modeId, setup);

    navigate(`/training/schulte/${modeId}`, {
      state: {
        setup,
        level:
          profile.autoAdjust || profile.manualLevel == null
            ? profile.level
            : profile.manualLevel,
        adaptiveSource: profile.autoAdjust ? "auto" : "manual"
      }
    });
  }

  function updateSetup(next: Partial<TrainingSetup>) {
    setSetup((current) => ({ ...current, ...next }));
  }

  function updateCustomTheme(next: Partial<SchulteThemeConfig>) {
    setSetup((current) => ({
      ...current,
      customTheme: {
        ...(current.customTheme ?? {}),
        ...next
      }
    }));
  }

  function handleModeChange(nextModeId: TrainingModeId) {
    setModeId(nextModeId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("mode", nextModeId);
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <section className="panel" data-testid="schulte-setup-page">
      <h2>Таблица Шульте</h2>
      <p>Выберите режим и настройте тренировку перед запуском.</p>

      <div className="segmented-row">
        {SCHULTE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={mode.id === modeId ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => handleModeChange(mode.id)}
            data-testid={`mode-${mode.id}`}
          >
            {mode.title}
          </button>
        ))}
      </div>

      <p className="status-line">{selectedMode.description}</p>

      <section className="setup-block">
        <h3>Пресеты</h3>
        <div className="segmented-row">
          <button
            type="button"
            className={setup.presetId === "easy" ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => applyPreset("easy")}
          >
            Легко
          </button>
          <button
            type="button"
            className={
              setup.presetId === "standard" ? "btn-secondary is-active" : "btn-secondary"
            }
            onClick={() => applyPreset("standard")}
          >
            Стандарт
          </button>
          <button
            type="button"
            className={setup.presetId === "intense" ? "btn-secondary is-active" : "btn-secondary"}
            onClick={() => applyPreset("intense")}
          >
            Интенсив
          </button>
        </div>
      </section>

      <section className="setup-block">
        <h3>Тема оформления</h3>
        <div className="segmented-row">
          {SCHULTE_THEME_OPTIONS.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={
                setup.visualThemeId === theme.id ? "btn-secondary is-active" : "btn-secondary"
              }
              onClick={() => updateSetup({ visualThemeId: theme.id })}
              data-testid={`theme-${theme.id}`}
            >
              {theme.label}
            </button>
          ))}
        </div>

        <div
          className="theme-preview"
          style={{
            background: previewTheme.boardBg,
            borderColor: previewTheme.highlightColor
          }}
        >
          <span style={{ color: previewTheme.numberColor }}>1</span>
          <span style={{ color: previewTheme.numberColor }}>2</span>
          <span style={{ color: previewTheme.numberColor }}>3</span>
        </div>
      </section>

      <div className="action-row">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setAdvancedOpen((current) => !current)}
          data-testid="toggle-advanced-btn"
        >
          {advancedOpen ? "Скрыть расширенные" : "Расширенные параметры"}
        </button>
      </div>

      {advancedOpen ? (
        <section className="setup-block">
          <h3>Расширенные параметры</h3>
          <div className="settings-form">
            <label htmlFor="grid-size">Размер сетки</label>
            <select
              id="grid-size"
              value={setup.gridSize}
              onChange={(event) =>
                updateSetup({ gridSize: Number(event.target.value) as 3 | 4 | 5 | 6 })
              }
            >
              <option value={3}>3x3</option>
              <option value={4}>4x4</option>
              <option value={5}>5x5</option>
              <option value={6}>6x6</option>
            </select>

            {modeId === "timed_plus" ? (
              <>
                <label htmlFor="time-limit">Лимит времени</label>
                <select
                  id="time-limit"
                  value={setup.timeLimitSec}
                  onChange={(event) =>
                    updateSetup({
                      timeLimitSec: Number(event.target.value) as 30 | 45 | 60 | 90
                    })
                  }
                >
                  <option value={30}>30 сек</option>
                  <option value={45}>45 сек</option>
                  <option value={60}>60 сек</option>
                  <option value={90}>90 сек</option>
                </select>

                <label htmlFor="spawn-strategy">Стратегия появления</label>
                <select
                  id="spawn-strategy"
                  value={setup.spawnStrategy}
                  onChange={(event) =>
                    updateSetup({
                      spawnStrategy: event.target.value as "same_cell" | "random_cell"
                    })
                  }
                >
                  <option value="same_cell">В той же клетке</option>
                  <option value="random_cell">Случайная клетка</option>
                </select>
              </>
            ) : null}

            <label htmlFor="error-penalty">Штраф ошибки</label>
            <input
              id="error-penalty"
              type="number"
              min={0}
              max={2}
              step={0.05}
              value={setup.errorPenalty}
              onChange={(event) =>
                updateSetup({ errorPenalty: Number(event.target.value) || 0 })
              }
            />

            <label htmlFor="hints-toggle">
              <input
                id="hints-toggle"
                type="checkbox"
                checked={setup.hintsEnabled}
                onChange={(event) => updateSetup({ hintsEnabled: event.target.checked })}
              />
              Показывать подсказки
            </label>
          </div>

          <h3>Цвета темы (advanced)</h3>
          <div className="settings-form">
            <label htmlFor="theme-board-bg">Фон поля</label>
            <input
              id="theme-board-bg"
              type="color"
              value={previewTheme.boardBg}
              onChange={(event) => updateCustomTheme({ boardBg: event.target.value })}
            />

            <label htmlFor="theme-cell-bg">Фон клетки</label>
            <input
              id="theme-cell-bg"
              type="color"
              value={previewTheme.cellBg}
              onChange={(event) => updateCustomTheme({ cellBg: event.target.value })}
            />

            <label htmlFor="theme-number-color">Цвет цифр</label>
            <input
              id="theme-number-color"
              type="color"
              value={previewTheme.numberColor}
              onChange={(event) => updateCustomTheme({ numberColor: event.target.value })}
            />

            <label htmlFor="theme-highlight-color">Цвет подсветки</label>
            <input
              id="theme-highlight-color"
              type="color"
              value={previewTheme.highlightColor}
              onChange={(event) => updateCustomTheme({ highlightColor: event.target.value })}
            />

            <label htmlFor="theme-success-color">Цвет верного клика</label>
            <input
              id="theme-success-color"
              type="color"
              value={previewTheme.successColor}
              onChange={(event) => updateCustomTheme({ successColor: event.target.value })}
            />

            <label htmlFor="theme-error-color">Цвет ошибки</label>
            <input
              id="theme-error-color"
              type="color"
              value={previewTheme.errorColor}
              onChange={(event) => updateCustomTheme({ errorColor: event.target.value })}
            />

            <button
              type="button"
              className="btn-ghost"
              onClick={() => updateSetup({ customTheme: null })}
            >
              Сбросить custom-цвета
            </button>
          </div>
        </section>
      ) : null}

      <section className="setup-block">
        <h3>Адаптация сложности</h3>
        <div className="settings-form">
          <label htmlFor="auto-adjust-toggle">
            <input
              id="auto-adjust-toggle"
              type="checkbox"
              checked={profile?.autoAdjust ?? true}
              onChange={(event) =>
                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        autoAdjust: event.target.checked,
                        manualLevel: event.target.checked
                          ? null
                          : current.manualLevel ?? current.level
                      }
                    : current
                )
              }
            />
            Автоматически менять сложность
          </label>

          {profile?.autoAdjust ? (
            <p className="status-line">Текущий автоуровень: {effectiveLevel}</p>
          ) : (
            <>
              <label htmlFor="manual-level">Ручной уровень</label>
              <select
                id="manual-level"
                value={profile?.manualLevel ?? effectiveLevel}
                onChange={(event) =>
                  setProfile((current) =>
                    current
                      ? { ...current, manualLevel: Number(event.target.value) }
                      : current
                  )
                }
              >
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </section>

      <section className="session-brief">
        <h3>Перед стартом</h3>
        <p>Режим: {selectedMode.title}</p>
        <p>Сетка: {setup.gridSize}x{setup.gridSize}</p>
        <p>Тема: {SCHULTE_THEME_OPTIONS.find((theme) => theme.id === setup.visualThemeId)?.label}</p>
        {modeId === "timed_plus" ? <p>Время: {setup.timeLimitSec} сек</p> : null}
        <p>Штраф ошибки: {setup.errorPenalty}</p>
        <p>Источник сложности: {profile?.autoAdjust ? "Авто" : "Ручной"}</p>
      </section>

      <details className="setup-block">
        <summary><strong>Как играть</strong></summary>
        <p>1. Нажмите «Начать тренировку».</p>
        <p>2. Ищите числа по порядку (или в обратном порядке для Reverse).</p>
        <p>3. Ошибки не блокируют игру, но снижают итоговый результат.</p>
      </details>

      <div className="action-row">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            applyPreset("standard");
            setMessage('Параметры сброшены к пресету "Стандарт".');
          }}
        >
          Сбросить к пресету
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => void handleStart()}
          data-testid="setup-start-btn"
        >
          Начать тренировку
        </button>
      </div>

      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
