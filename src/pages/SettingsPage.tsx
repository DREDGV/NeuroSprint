import { FormEvent, useState } from "react";
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings
} from "../shared/lib/settings/settings";
import type { AppSettings } from "../shared/types/domain";

type TimeLimit = 30 | 45 | 60 | 90;

export function SettingsPage() {
  const initial = getSettings();
  const [timedDefaultLimitSec, setTimedDefaultLimitSec] = useState<TimeLimit>(
    initial.timedDefaultLimitSec
  );
  const [timedErrorPenalty, setTimedErrorPenalty] = useState<number>(
    initial.timedErrorPenalty
  );
  const [dailyGoalSessions, setDailyGoalSessions] = useState<number>(
    initial.dailyGoalSessions
  );
  const [message, setMessage] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextSettings: AppSettings = {
      timedDefaultLimitSec,
      timedErrorPenalty:
        Number.isFinite(timedErrorPenalty) && timedErrorPenalty >= 0
          ? timedErrorPenalty
          : DEFAULT_SETTINGS.timedErrorPenalty,
      dailyGoalSessions:
        Number.isFinite(dailyGoalSessions) && dailyGoalSessions >= 1
          ? Math.round(dailyGoalSessions)
          : DEFAULT_SETTINGS.dailyGoalSessions
    };
    saveSettings(nextSettings);
    setMessage("Настройки сохранены.");
  }

  return (
    <section className="panel" data-testid="settings-page">
      <h2>Настройки</h2>
      <p>Настройки применяются локально на этом устройстве.</p>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label htmlFor="default-limit">Timed: лимит по умолчанию</label>
        <select
          id="default-limit"
          value={timedDefaultLimitSec}
          onChange={(event) =>
            setTimedDefaultLimitSec(Number(event.target.value) as TimeLimit)
          }
        >
          <option value={30}>30 секунд</option>
          <option value={45}>45 секунд</option>
          <option value={60}>60 секунд</option>
          <option value={90}>90 секунд</option>
        </select>

        <label htmlFor="error-penalty">Штраф за ошибку (Timed)</label>
        <input
          id="error-penalty"
          type="number"
          min={0}
          step={0.1}
          value={timedErrorPenalty}
          onChange={(event) => setTimedErrorPenalty(Number(event.target.value))}
        />

        <label htmlFor="daily-goal">Цель на день (сессий)</label>
        <input
          id="daily-goal"
          type="number"
          min={1}
          max={20}
          value={dailyGoalSessions}
          onChange={(event) => setDailyGoalSessions(Number(event.target.value))}
        />

        <button type="submit" className="btn-primary">
          Сохранить
        </button>
      </form>

      {message ? <p className="status-line">{message}</p> : null}
    </section>
  );
}
