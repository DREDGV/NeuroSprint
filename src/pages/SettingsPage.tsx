import { FormEvent, useState } from "react";
import { useActiveUser } from "../app/ActiveUserContext";
import { generateDemoClassroomFixture } from "../shared/lib/fixtures/classroomFixture";
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings
} from "../shared/lib/settings/settings";
import type { AppSettings } from "../shared/types/domain";

type TimeLimit = 30 | 45 | 60 | 90;

export function SettingsPage() {
  const { setActiveUserId } = useActiveUser();
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

  const [fixtureBusy, setFixtureBusy] = useState(false);
  const [fixtureMessage, setFixtureMessage] = useState<string | null>(null);

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

  async function handleGenerateDemoFixture() {
    setFixtureBusy(true);
    setFixtureMessage(null);

    try {
      const summary = await generateDemoClassroomFixture({
        groupsCount: 2,
        studentsPerGroup: 15,
        days: 14,
        replaceExistingDemoData: true
      });

      if (summary.activeUserId) {
        setActiveUserId(summary.activeUserId);
      }

      setFixtureMessage(
        `Демо-данные созданы: ${summary.groupsCreated} групп, ${summary.usersCreated} учеников, ${summary.sessionsCreated} сессий.`
      );
    } catch {
      setFixtureMessage("Не удалось сгенерировать демо-данные.");
    } finally {
      setFixtureBusy(false);
    }
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

      <section className="setup-block" data-testid="settings-fixture-block">
        <h3>Тестовые данные для класса</h3>
        <p>
          Генерирует демо-набор для проверки групповой аналитики: 2 группы, 30 учеников
          и история тренировок за 14 дней.
        </p>
        <div className="action-row">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleGenerateDemoFixture()}
            disabled={fixtureBusy}
            data-testid="generate-demo-fixture-btn"
          >
            {fixtureBusy ? "Генерация..." : "Сгенерировать демо-класс (30+)"}
          </button>
        </div>
        {fixtureMessage ? <p className="status-line">{fixtureMessage}</p> : null}
      </section>
    </section>
  );
}
