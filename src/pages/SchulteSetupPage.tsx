import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { getSchulteLevelDefaults } from "../features/schulte/levelConfig";
import { preferenceRepository } from "../entities/preferences/preferenceRepository";
import { trainingRepository } from "../entities/training/trainingRepository";
import { SCHULTE_MODES, withLevelDefaults } from "../shared/lib/training/presets";
import {
  SCHULTE_THEME_OPTIONS,
  resolveSchulteTheme
} from "../shared/lib/training/themes";
import {
  getTrainingSetup,
  saveTrainingSetup
} from "../shared/lib/training/setupStorage";
import { InfoHint } from "../shared/ui/InfoHint";
import type {
  SchulteThemeConfig,
  TrainingModeId,
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
      const hydrated = withLevelDefaults(storedSetup, effectiveLevel, modeId);

      setProfile(modeProfile);
      setSetup({
        ...hydrated,
        visualThemeId: preference.schulteThemeId,
        customTheme: preference.schulteCustomTheme
      });
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

  const levelDefaults = useMemo(
    () => getSchulteLevelDefaults(effectiveLevel, modeId),
    [effectiveLevel, modeId]
  );

  const levelRows = useMemo(
    () =>
      LEVEL_OPTIONS.map((level) => ({
        level,
        profile: getSchulteLevelDefaults(level, modeId)
      })),
    [modeId]
  );

  async function handleStart() {
    if (!activeUserId || !profile) {
      return;
    }

    const resolvedLevel =
      profile.autoAdjust || profile.manualLevel == null
        ? profile.level
        : profile.manualLevel;
    const strictSetup = withLevelDefaults(setup, resolvedLevel, modeId);

    const profileToSave: UserModeProfile = {
      ...profile,
      level: resolvedLevel
    };

    await Promise.all([
      trainingRepository.saveUserModeProfile(profileToSave),
      preferenceRepository.saveSchulteTheme(
        activeUserId,
        strictSetup.visualThemeId,
        strictSetup.customTheme
      )
    ]);
    saveTrainingSetup(modeId, strictSetup);

    navigate(`/training/schulte/${modeId}`, {
      state: {
        setup: strictSetup,
        level: resolvedLevel,
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
      <p>Выберите режим и запускайте тренировку. Сложность определяется уровнем.</p>
      <InfoHint title="Как играть в Шульте" testId="schulte-setup-hint">
        <p>1. Выберите режим: Classic+, Timed+ или Reverse.</p>
        <p>2. Уровень автоматически подбирает сложность (или задается вручную).</p>
        <p>3. Сначала точность, потом скорость — это даёт лучший score.</p>
      </InfoHint>

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
        <h3>Адаптация сложности</h3>
        <div className="settings-form">
          <label htmlFor="auto-adjust-toggle">
            <input
              id="auto-adjust-toggle"
              type="checkbox"
              checked={profile?.autoAdjust ?? true}
              onChange={(event) =>
                setProfile((current) => {
                  if (!current) {
                    return current;
                  }

                  const nextManualLevel = event.target.checked
                    ? null
                    : current.manualLevel ?? current.level;
                  const nextLevel = event.target.checked
                    ? current.level
                    : nextManualLevel ?? current.level;

                  setSetup((setupCurrent) =>
                    withLevelDefaults(setupCurrent, nextLevel, modeId)
                  );

                  return {
                    ...current,
                    autoAdjust: event.target.checked,
                    manualLevel: nextManualLevel
                  };
                })
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
                  setProfile((current) => {
                    if (!current) {
                      return current;
                    }
                    const nextManualLevel = Number(event.target.value);
                    setSetup((setupCurrent) =>
                      withLevelDefaults(setupCurrent, nextManualLevel, modeId)
                    );
                    return { ...current, manualLevel: nextManualLevel };
                  })
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
        <p className="status-line">
          Текущий профиль уровня: {levelDefaults.gridSize}x{levelDefaults.gridSize},{" "}
          {modeId === "timed_plus" ? `${levelDefaults.timeLimitSec} сек, ` : ""}
          штраф {levelDefaults.errorPenalty}.
          {levelDefaults.shiftEnabled
            ? ` Shift: ${levelDefaults.shiftSwaps} перестановк(и) каждые ${levelDefaults.shiftIntervalSec} сек.`
            : " Shift отключён."}
        </p>
      </section>

      <details className="setup-block">
        <summary><strong>Карта уровней 1–10</strong></summary>
        {levelRows.map(({ level, profile: row }) => (
          <p
            key={level}
            className={level === effectiveLevel ? "status-line" : undefined}
          >
            {level}. {row.gridSize}x{row.gridSize};{" "}
            {modeId === "timed_plus" ? `${row.timeLimitSec} сек; ` : ""}
            штраф {row.errorPenalty}; подсказки {row.hintsEnabled ? "on" : "off"};{" "}
            {row.shiftEnabled
              ? `shift ${row.shiftSwaps}/${row.shiftIntervalSec}с`
              : "shift off"}
            {modeId === "timed_plus"
              ? row.timedBaseClear
                ? "; базовый timed: очистка клеток"
                : ""
              : ""}
          </p>
        ))}
      </details>

      <section className="setup-block">
        <h3>Дополнительные настройки</h3>
        <p className="status-line">Влияют на визуал, но не меняют сложность уровня.</p>
        <div className="action-row">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setAdvancedOpen((current) => !current)}
            data-testid="toggle-advanced-btn"
          >
            {advancedOpen ? "Скрыть визуальные настройки" : "Открыть визуальные настройки"}
          </button>
        </div>

        {advancedOpen ? (
          <>
            <h4>Тема оформления</h4>
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

            <details>
              <summary><strong>Кастомные цвета</strong></summary>
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
              </div>

              <div className="action-row">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => updateSetup({ customTheme: null })}
                >
                  Сбросить custom-цвета
                </button>
              </div>
            </details>
          </>
        ) : null}
      </section>

      <section className="session-brief">
        <h3>Перед стартом</h3>
        <p>Режим: {selectedMode.title}</p>
        <p>Уровень: {effectiveLevel}</p>
        <p>Сетка: {setup.gridSize}x{setup.gridSize}</p>
        {modeId === "timed_plus" ? <p>Время: {setup.timeLimitSec} сек</p> : null}
        <p>Штраф ошибки: {setup.errorPenalty}</p>
        {setup.shiftEnabled ? (
          <p>
            Динамика поля: {setup.shiftSwaps ?? 1} перестановк(и) каждые{" "}
            {setup.shiftIntervalSec ?? 0} сек.
          </p>
        ) : null}
        {setup.timedBaseClear && modeId === "timed_plus" ? (
          <p>Базовый Timed: клетки очищаются после верного клика.</p>
        ) : null}
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
          className="btn-primary"
          onClick={() => void handleStart()}
          data-testid="setup-start-btn"
        >
          Начать тренировку
        </button>
      </div>
    </section>
  );
}

