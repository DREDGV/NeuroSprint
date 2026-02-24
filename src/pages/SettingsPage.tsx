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
  const [fixtureGroupsCount, setFixtureGroupsCount] = useState(2);
  const [fixtureStudentsPerGroup, setFixtureStudentsPerGroup] = useState(15);
  const [fixtureDays, setFixtureDays] = useState(14);

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
    const groupsCount = Math.max(1, Math.min(8, Math.round(fixtureGroupsCount)));
    const studentsPerGroup = Math.max(
      1,
      Math.min(40, Math.round(fixtureStudentsPerGroup))
    );
    const days = Math.max(3, Math.min(45, Math.round(fixtureDays)));

    const approved = window.confirm(
      `Сгенерировать демо-данные?\nГрупп: ${groupsCount}\nУчеников в группе: ${studentsPerGroup}\nДней: ${days}`
    );
    if (!approved) {
      return;
    }

    setFixtureBusy(true);
    setFixtureMessage(null);

    try {
      const summary = await generateDemoClassroomFixture({
        groupsCount,
        studentsPerGroup,
        days,
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
          Генерирует демо-набор для проверки групповой аналитики. Можно настроить
          размер класса и период.
        </p>
        <div className="fixture-grid">
          <label htmlFor="fixture-groups">Групп</label>
          <input
            id="fixture-groups"
            type="number"
            min={1}
            max={8}
            value={fixtureGroupsCount}
            onChange={(event) => setFixtureGroupsCount(Number(event.target.value))}
            data-testid="fixture-groups-input"
          />

          <label htmlFor="fixture-students">Учеников в группе</label>
          <input
            id="fixture-students"
            type="number"
            min={1}
            max={40}
            value={fixtureStudentsPerGroup}
            onChange={(event) => setFixtureStudentsPerGroup(Number(event.target.value))}
            data-testid="fixture-students-input"
          />

          <label htmlFor="fixture-days">Дней истории</label>
          <input
            id="fixture-days"
            type="number"
            min={3}
            max={45}
            value={fixtureDays}
            onChange={(event) => setFixtureDays(Number(event.target.value))}
            data-testid="fixture-days-input"
          />
        </div>
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
