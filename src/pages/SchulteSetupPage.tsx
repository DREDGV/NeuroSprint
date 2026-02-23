import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { trainingRepository } from "../entities/training/trainingRepository";
import {
  SCHULTE_MODES,
  getPresetSetup,
  withLevelDefaults
} from "../shared/lib/training/presets";
import {
  getTrainingSetup,
  saveTrainingSetup
} from "../shared/lib/training/setupStorage";
import type {
  TrainingModeId,
  TrainingPresetId,
  TrainingSetup,
  UserModeProfile
} from "../shared/types/domain";

const LEVEL_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

export function SchulteSetupPage() {
  const navigate = useNavigate();
  const { activeUserId } = useActiveUser();
  const [modeId, setModeId] = useState<TrainingModeId>("classic_plus");
  const [setup, setSetup] = useState<TrainingSetup>(() =>
    getTrainingSetup("classic_plus")
  );
  const [profile, setProfile] = useState<UserModeProfile | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUserId) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const [storedSetup, modeProfile] = await Promise.all([
        Promise.resolve(getTrainingSetup(modeId)),
        trainingRepository.getUserModeProfile(activeUserId, "schulte", modeId)
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
      setSetup(hydrated);
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
      return 3;
    }
    if (!profile.autoAdjust && profile.manualLevel != null) {
      return profile.manualLevel;
    }
    return profile.level;
  }, [profile]);

  function applyPreset(presetId: TrainingPresetId) {
    const preset = getPresetSetup(presetId);
    const next = profile?.autoAdjust
      ? withLevelDefaults(preset, effectiveLevel, modeId)
      : preset;
    setSetup(next);
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

    await trainingRepository.saveUserModeProfile(profileToSave);
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
            onClick={() => setModeId(mode.id)}
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

      <div className="action-row">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setAdvancedOpen((current) => !current)}
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
                updateSetup({ gridSize: Number(event.target.value) as 4 | 5 | 6 })
              }
            >
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
              Показать подсказки
            </label>
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
        {modeId === "timed_plus" ? <p>Время: {setup.timeLimitSec} сек</p> : null}
        <p>Штраф ошибки: {setup.errorPenalty}</p>
        <p>Источник сложности: {profile?.autoAdjust ? "Авто" : "Ручной"}</p>
      </section>

      <div className="action-row">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            applyPreset("standard");
            setMessage("Параметры сброшены к пресету «Стандарт».");
          }}
        >
          Сбросить к пресету
        </button>
        <button type="button" className="btn-primary" onClick={() => void handleStart()}>
          Начать тренировку
        </button>
      </div>

      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}

