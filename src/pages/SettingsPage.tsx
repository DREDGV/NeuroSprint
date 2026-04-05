import { FormEvent, useEffect, useState } from "react";
import { db } from "../db/database";
import { useActiveUser } from "../app/ActiveUserContext";
import { useAuth } from "../app/useAuth";
import { useRoleAccess } from "../app/useRoleAccess";
import { accountSyncService } from "../entities/account/accountSyncService";
import { preferenceRepository } from "../entities/preferences/preferenceRepository";
import { groupRepository } from "../entities/group/groupRepository";
import { sessionRepository } from "../entities/session/sessionRepository";
import { isTeacherRole, isUserRoleGuardError, userRoleGuardMessage } from "../entities/user/userRole";
import { userRepository } from "../entities/user/userRepository";
import { guardAccess } from "../shared/lib/auth/permissions";
import { allowPrivilegedProfileRoles } from "../shared/lib/auth/profileRolePolicy";
import {
  DEFAULT_AUDIO_SETTINGS,
  getAudioSettings,
  saveAudioSettings
} from "../shared/lib/audio/audioSettings";
import { downloadTextFile, toCsv } from "../shared/lib/export/csv";
import { generateDemoClassroomFixture } from "../shared/lib/fixtures/classroomFixture";
import {
  DEFAULT_SETTINGS,
  getSettings,
  saveSettings
} from "../shared/lib/settings/settings";
import {
  FEATURE_FLAG_DEFINITIONS,
  clearFeatureFlagOverrides,
  getFeatureFlagOverride,
  setFeatureFlagOverride,
  useFeatureFlags
} from "../shared/lib/online/featureFlags";
import {
  getDevModeEnabled,
  setDevModeEnabled
} from "../shared/lib/settings/devMode";
import { getAppRole, saveAppRole } from "../shared/lib/settings/appRole";
import type {
  AppRole,
  AppSettings,
  AudioSettings,
  GroupMetric,
  TrainingModeId
} from "../shared/types/domain";

type TimeLimit = 30 | 45 | 60 | 90 | 120;
type BenchmarkPeriod = 30 | 90 | "all";

function benchmarkThresholdMs(period: BenchmarkPeriod): number {
  if (period === 30) {
    return 350;
  }
  if (period === 90) {
    return 700;
  }
  return 1_500;
}

export function SettingsPage() {
  const { activeUserId, setActiveUserId } = useActiveUser();
  const auth = useAuth();
  const access = useRoleAccess();
  const featureFlags = useFeatureFlags();
  const initial = getSettings();
  const initialAudio = getAudioSettings();

  const [timedDefaultLimitSec, setTimedDefaultLimitSec] = useState<TimeLimit>(
    initial.timedDefaultLimitSec
  );
  const [timedErrorPenalty, setTimedErrorPenalty] = useState<number>(
    initial.timedErrorPenalty
  );
  const [dailyGoalSessions, setDailyGoalSessions] = useState<number>(
    initial.dailyGoalSessions
  );

  const [audioSettings, setAudioSettingsState] = useState<AudioSettings>(initialAudio);
  const [devModeEnabled, setDevModeState] = useState(getDevModeEnabled());
  const [appRole, setAppRole] = useState<AppRole>(getAppRole());
  const [activeUserRole, setActiveUserRole] = useState<AppRole | null>(null);
  const [teachersCount, setTeachersCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const [fixtureBusy, setFixtureBusy] = useState(false);
  const [fixtureMessage, setFixtureMessage] = useState<string | null>(null);
  const [fixtureGroupsCount, setFixtureGroupsCount] = useState(2);
  const [fixtureStudentsPerGroup, setFixtureStudentsPerGroup] = useState(15);
  const [fixtureDays, setFixtureDays] = useState(14);

  const [benchmarkBusy, setBenchmarkBusy] = useState(false);
  const [benchmarkReport, setBenchmarkReport] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeUserId) {
      setAppRole(getAppRole());
      setActiveUserRole(null);
      return;
    }

    let cancelled = false;
    void Promise.all([userRepository.getById(activeUserId), userRepository.list()]).then(
      ([user, users]) => {
        if (cancelled) {
          return;
        }
        if (user) {
          setAppRole(user.role);
        }
        setActiveUserRole(user?.role ?? null);
        setTeachersCount(users.filter((entry) => isTeacherRole(entry.role)).length);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  async function handleSubmit(event: FormEvent) {
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

    const nextAudio: AudioSettings = {
      ...audioSettings,
      volume: Math.max(0, Math.min(1, audioSettings.volume))
    };

    try {
      let hasChanges = false;

      if (access.settings.updateTraining) {
        saveSettings(nextSettings);
        hasChanges = true;
      }

      if (access.settings.updateAudio) {
        saveAudioSettings(nextAudio);
        hasChanges = true;
        if (activeUserId) {
          await preferenceRepository.saveAudioSettings(activeUserId, nextAudio);
        }
      }

      if (access.settings.devtools) {
        setDevModeEnabled(devModeEnabled);
        hasChanges = true;
      }

      if (access.settings.updateRole && activeUserId) {
        await userRepository.updateRole(activeUserId, appRole);
        setActiveUserRole(appRole);
        const users = await userRepository.list();
        setTeachersCount(users.filter((entry) => isTeacherRole(entry.role)).length);
        saveAppRole(appRole);
        hasChanges = true;
      }

      if (activeUserId && auth.account?.id) {
        void accountSyncService.syncLinkedProfile(activeUserId, auth.account.id).catch((error) => {
          console.error("settings sync failed", error);
        });
      }

      setMessage(hasChanges ? "Настройки сохранены." : "Для текущей роли доступен только просмотр.");
    } catch (caught) {
      console.error("settings save failed", caught);
      if (isUserRoleGuardError(caught) && activeUserRole) {
        setAppRole(activeUserRole);
      }
      setMessage(
        isUserRoleGuardError(caught)
          ? userRoleGuardMessage(caught)
          : "Не удалось сохранить часть настроек."
      );
    }
  }

  async function handleGenerateDemoFixture() {
    if (
      !guardAccess(
        access.settings.devtools,
        setFixtureMessage,
        "Demo-инструменты доступны только для роли «Учитель»."
      )
    ) {
      return;
    }

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
    } catch (caught) {
      console.error("demo fixture failed", caught);
      setFixtureMessage("Не удалось сгенерировать демо-данные.");
    } finally {
      setFixtureBusy(false);
    }
  }

  async function handleRunBenchmark() {
    if (
      !guardAccess(
        access.settings.devtools,
        setBenchmarkReport,
        "Benchmark доступен только для роли «Учитель»."
      )
    ) {
      return;
    }

    setBenchmarkBusy(true);
    setBenchmarkReport(null);

    const metric: GroupMetric = "score";
    const modeId: TrainingModeId = "classic_plus";
    const periods: BenchmarkPeriod[] = [30, 90, "all"];
    const nowMs =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? () => performance.now()
        : () => Date.now();

    try {
      const groups = await groupRepository.listGroups();
      const targetGroup = groups[0] ?? null;
      const lines: string[] = [];
      lines.push(`Режим: ${modeId}, метрика: ${metric}`);
      lines.push(`Группа для замера: ${targetGroup?.name ?? "нет групп"}`);

      let warnings = 0;
      for (const period of periods) {
        const thresholdMs = benchmarkThresholdMs(period);
        const groupStart = nowMs();
        const groupStats = targetGroup
          ? await groupRepository.aggregateGroupStats(targetGroup.id, modeId, period, metric)
          : null;
        const groupDuration = nowMs() - groupStart;

        const globalStart = nowMs();
        const globalStats = await sessionRepository.getModeMetricSnapshot(
          modeId,
          metric,
          period
        );
        const globalDuration = nowMs() - globalStart;

        const periodLabel = period === "all" ? "all" : `${period}d`;
        const isSlow = groupDuration > thresholdMs || globalDuration > thresholdMs;
        if (isSlow) {
          warnings += 1;
        }
        lines.push(
          `[${periodLabel}] group=${groupDuration.toFixed(1)}ms (${groupStats?.summary.sessionsTotal ?? 0} сессий), ` +
            `global=${globalDuration.toFixed(1)}ms (${globalStats.summary.sessionsTotal} сессий), ` +
            `порог<=${thresholdMs}ms, статус=${isSlow ? "ВНИМАНИЕ" : "OK"}`
        );
      }

      lines.push(
        warnings === 0
          ? "Итог: производительность в допустимом диапазоне."
          : `Итог: обнаружено ${warnings} период(ов) выше порога.`
      );
      setBenchmarkReport(lines.join("\n"));
    } catch (caught) {
      console.error("benchmark failed", caught);
      setBenchmarkReport("Не удалось выполнить замер агрегаций.");
    } finally {
      setBenchmarkBusy(false);
    }
  }

  async function handleExportCsv() {
    if (
      !guardAccess(
        access.settings.export,
        setExportMessage,
        "Экспорт доступен только для ролей «Учитель» и «Домашний»."
      )
    ) {
      return;
    }

    setExportBusy(true);
    setExportMessage(null);
    try {
      const [users, sessions, groups, members, preferences, modeProfiles] = await Promise.all([
        userRepository.list(),
        db.sessions.toArray(),
        db.classGroups.toArray(),
        db.groupMembers.toArray(),
        db.userPreferences.toArray(),
        db.userModeProfiles.toArray()
      ]);

      const stamp = new Date().toISOString().slice(0, 10);
      const usersCsv = toCsv(
        ["id", "name", "role", "createdAt"],
        users.map((entry) => [entry.id, entry.name, entry.role, entry.createdAt])
      );
      const sessionsCsv = toCsv(
        [
          "id",
          "userId",
          "moduleId",
          "modeId",
          "mode",
          "level",
          "timestamp",
          "localDate",
          "durationMs",
          "score",
          "accuracy",
          "speed",
          "errors",
          "correctCount",
          "effectiveCorrect"
        ],
        sessions.map((entry) => [
          entry.id,
          entry.userId,
          entry.moduleId,
          entry.modeId,
          entry.mode,
          entry.level,
          entry.timestamp,
          entry.localDate,
          entry.durationMs,
          entry.score,
          entry.accuracy,
          entry.speed,
          entry.errors,
          entry.correctCount ?? "",
          entry.effectiveCorrect ?? ""
        ])
      );
      const groupsCsv = toCsv(
        ["id", "name", "createdAt"],
        groups.map((entry) => [entry.id, entry.name, entry.createdAt])
      );
      const membersCsv = toCsv(
        ["id", "groupId", "userId", "joinedAt"],
        members.map((entry) => [entry.id, entry.groupId, entry.userId, entry.joinedAt])
      );
      const preferencesCsv = toCsv(
        [
          "id",
          "userId",
          "schulteThemeId",
          "schulteCustomTheme",
          "audioMuted",
          "audioVolume",
          "audioStartEnd",
          "audioClick",
          "audioCorrect",
          "audioError",
          "updatedAt"
        ],
        preferences.map((entry) => [
          entry.id,
          entry.userId,
          entry.schulteThemeId,
          JSON.stringify(entry.schulteCustomTheme ?? {}),
          entry.audioSettings.muted,
          entry.audioSettings.volume,
          entry.audioSettings.startEnd,
          entry.audioSettings.click,
          entry.audioSettings.correct,
          entry.audioSettings.error,
          entry.updatedAt
        ])
      );
      const modeProfilesCsv = toCsv(
        [
          "id",
          "userId",
          "moduleId",
          "modeId",
          "level",
          "autoAdjust",
          "manualLevel",
          "lastDecisionReason",
          "lastEvaluatedAt",
          "updatedAt"
        ],
        modeProfiles.map((entry) => [
          entry.id,
          entry.userId,
          entry.moduleId,
          entry.modeId,
          entry.level,
          entry.autoAdjust,
          entry.manualLevel ?? "",
          entry.lastDecisionReason ?? "",
          entry.lastEvaluatedAt ?? "",
          entry.updatedAt
        ])
      );

      downloadTextFile(`neurosprint_users_${stamp}.csv`, usersCsv, "text/csv;charset=utf-8");
      downloadTextFile(
        `neurosprint_sessions_${stamp}.csv`,
        sessionsCsv,
        "text/csv;charset=utf-8"
      );
      downloadTextFile(
        `neurosprint_class_groups_${stamp}.csv`,
        groupsCsv,
        "text/csv;charset=utf-8"
      );
      downloadTextFile(
        `neurosprint_group_members_${stamp}.csv`,
        membersCsv,
        "text/csv;charset=utf-8"
      );
      downloadTextFile(
        `neurosprint_user_preferences_${stamp}.csv`,
        preferencesCsv,
        "text/csv;charset=utf-8"
      );
      downloadTextFile(
        `neurosprint_user_mode_profiles_${stamp}.csv`,
        modeProfilesCsv,
        "text/csv;charset=utf-8"
      );
      setExportMessage("CSV экспортирован. Проверьте папку «Загрузки».");
    } catch (caught) {
      console.error("csv export failed", caught);
      setExportMessage("Не удалось экспортировать CSV.");
    } finally {
      setExportBusy(false);
    }
  }

  const isLastTeacherActive =
    activeUserId != null &&
    activeUserRole === "teacher" &&
    teachersCount <= 1;
  const hasFeatureOverrides = FEATURE_FLAG_DEFINITIONS.some(
    (definition) => getFeatureFlagOverride(definition.key) !== null
  );
  const allowPrivilegedRoles = allowPrivilegedProfileRoles();
  const accountSettingsHint = !auth.isConfigured
    ? "Сервис аккаунтов ещё подключается. Пока все настройки сохраняются только на этом устройстве."
    : auth.isAuthenticated
      ? auth.account?.email
        ? `Аккаунт ${auth.account.email} подключён. Настройки профилей аккаунта будут отправлены на синхронизацию после сохранения.`
        : "Аккаунт подключён. Настройки профилей аккаунта будут отправлены на синхронизацию после сохранения."
      : "Сейчас вы в гостевом режиме. Настройки и профили работают локально, пока вы не войдёте в аккаунт.";

  const canPersistSettings =
    access.settings.updateTraining ||
    access.settings.updateAudio ||
    access.settings.devtools ||
    access.settings.updateRole;

  if (!access.settings.view) {
    return (
      <section className="panel" data-testid="settings-page">
        <h2>Настройки</h2>
        <p className="status-line">Раздел настроек недоступен для текущей роли.</p>
      </section>
    );
  }

  return (
    <section className="panel" data-testid="settings-page">
      <h2>Настройки</h2>
      <p>Управляйте локальными параметрами устройства, звуком и поведением активного профиля.</p>

      <section className="settings-account-hint">
        <strong>Аккаунт и синхронизация</strong>
        <p>{accountSettingsHint}</p>
      </section>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label htmlFor="default-limit">Timed: лимит по умолчанию</label>
        <select
          id="default-limit"
          value={timedDefaultLimitSec}
          onChange={(event) =>
            setTimedDefaultLimitSec(Number(event.target.value) as TimeLimit)
          }
          disabled={!access.settings.updateTraining}
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
          disabled={!access.settings.updateTraining}
        />

        <label htmlFor="daily-goal">Цель на день (сессий)</label>
        <input
          id="daily-goal"
          type="number"
          min={1}
          max={20}
          value={dailyGoalSessions}
          onChange={(event) => setDailyGoalSessions(Number(event.target.value))}
          disabled={!access.settings.updateTraining}
        />

        {allowPrivilegedRoles ? (
          <>
            <h3>Роль активного профиля</h3>
            <label htmlFor="app-role-select">Роль для текущего активного пользователя</label>
            <select
              id="app-role-select"
              value={appRole}
              onChange={(event) => setAppRole(event.target.value as AppRole)}
              data-testid="app-role-select"
              disabled={!activeUserId || !access.settings.updateRole}
            >
              <option value="teacher">Учитель (полный режим)</option>
              <option value="student" disabled={isLastTeacherActive}>
                Ученик (упрощенный интерфейс)
              </option>
              <option value="home" disabled={isLastTeacherActive}>
                Домашний (свободный режим)
              </option>
            </select>
            <p className="status-line">
              {!access.settings.updateRole
                ? "Смена роли активного профиля доступна только для роли «Учитель»."
                : activeUserId
                  ? "Роль применяется после нажатия «Сохранить» и синхронизируется с интерфейсом."
                  : "Сначала выберите активный профиль на странице «Профили»."}
            </p>
            {isLastTeacherActive ? (
              <p className="status-line">
                Это последний учитель в системе. Назначьте другого пользователя учителем перед сменой роли.
              </p>
            ) : null}
          </>
        ) : null}

        <h3>Звук</h3>
        <label htmlFor="audio-muted">
          <input
            id="audio-muted"
            type="checkbox"
            checked={audioSettings.muted}
            onChange={(event) =>
              setAudioSettingsState((current) => ({ ...current, muted: event.target.checked }))
            }
            disabled={!access.settings.updateAudio}
          />
          Без звука (mute)
        </label>

        <label htmlFor="audio-volume">Громкость</label>
        <input
          id="audio-volume"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={audioSettings.volume}
          onChange={(event) =>
            setAudioSettingsState((current) => ({
              ...current,
              volume: Number(event.target.value)
            }))
          }
          disabled={!access.settings.updateAudio}
        />

        <label htmlFor="audio-start-end">
          <input
            id="audio-start-end"
            type="checkbox"
            checked={audioSettings.startEnd}
            onChange={(event) =>
              setAudioSettingsState((current) => ({
                ...current,
                startEnd: event.target.checked
              }))
            }
            disabled={!access.settings.updateAudio}
          />
          Сигналы старт/финиш
        </label>

        <label htmlFor="audio-click">
          <input
            id="audio-click"
            type="checkbox"
            checked={audioSettings.click}
            onChange={(event) =>
              setAudioSettingsState((current) => ({ ...current, click: event.target.checked }))
            }
            disabled={!access.settings.updateAudio}
          />
          Звук клика
        </label>

        <label htmlFor="audio-correct">
          <input
            id="audio-correct"
            type="checkbox"
            checked={audioSettings.correct}
            onChange={(event) =>
              setAudioSettingsState((current) => ({ ...current, correct: event.target.checked }))
            }
            disabled={!access.settings.updateAudio}
          />
          Звук верного ответа
        </label>

        <label htmlFor="audio-error">
          <input
            id="audio-error"
            type="checkbox"
            checked={audioSettings.error}
            onChange={(event) =>
              setAudioSettingsState((current) => ({ ...current, error: event.target.checked }))
            }
            disabled={!access.settings.updateAudio}
          />
          Звук ошибки
        </label>

        {access.settings.devtools ? (
          <>
            <h3>Режим разработчика</h3>
            <label htmlFor="dev-mode-toggle">
              <input
                id="dev-mode-toggle"
                type="checkbox"
                checked={devModeEnabled}
                onChange={(event) => setDevModeState(event.target.checked)}
                data-testid="dev-mode-toggle"
              />
              Показать инструменты demo/benchmark
            </label>
          </>
        ) : (
          <p className="status-line" data-testid="dev-mode-role-note">
            Режим разработчика доступен только для роли «Учитель».
          </p>
        )}

        <button
          type="submit"
          className="btn-primary"
          data-testid="save-settings-btn"
          disabled={!canPersistSettings}
        >
          Сохранить
        </button>

        <button
          type="button"
          className="btn-ghost"
          onClick={() => setAudioSettingsState(DEFAULT_AUDIO_SETTINGS)}
          disabled={!access.settings.updateAudio}
        >
          Сбросить звук к default
        </button>
      </form>

      {message ? <p className="status-line">{message}</p> : null}

      <section className="setup-block">
        <h3>Экспорт данных</h3>
        <p className="status-line">
          Экспортирует users/sessions/classes/preferences/mode-profiles в CSV файлы на устройство.
        </p>
        {access.settings.export ? (
          <div className="action-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleExportCsv()}
              disabled={exportBusy}
              data-testid="export-csv-btn"
            >
              {exportBusy ? "Экспорт..." : "Экспорт CSV"}
            </button>
          </div>
        ) : (
          <p className="status-line" data-testid="export-role-note">
            Экспорт доступен для ролей «Учитель» и «Домашний».
          </p>
        )}
        {exportMessage ? (
          <p className="status-line" data-testid="export-message">
            {exportMessage}
          </p>
        ) : null}
      </section>

      {access.settings.devtools && devModeEnabled ? (
        <section className="setup-block" data-testid="settings-feature-flags-block">
          <h3>Предпросмотр скрытых функций</h3>
          <p className="status-line">
            Эти переключатели работают только в текущем браузере. Они нужны для локальной
            разработки и проверки preview-сборок без показа функций на основном сайте.
          </p>

          {FEATURE_FLAG_DEFINITIONS.map((definition) => {
            const override = getFeatureFlagOverride(definition.key);
            const enabled = featureFlags[definition.key];

            return (
              <div key={definition.key} className="settings-feature-flag-row">
                <label htmlFor={`feature-flag-${definition.key}`}>
                  <input
                    id={`feature-flag-${definition.key}`}
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) =>
                      setFeatureFlagOverride(definition.key, event.target.checked)
                    }
                    data-testid={`feature-flag-toggle-${definition.key}`}
                  />
                  {definition.label}
                </label>
                <p className="status-line">{definition.description}</p>
                <p className="status-line">
                  Источник: {override === null ? "env / deployment config" : "локальный override"}
                </p>
                <div className="action-row">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setFeatureFlagOverride(definition.key, null)}
                    disabled={override === null}
                  >
                    Вернуть к env
                  </button>
                </div>
              </div>
            );
          })}

          <div className="action-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => clearFeatureFlagOverrides()}
              disabled={!hasFeatureOverrides}
              data-testid="feature-flags-reset-btn"
            >
              Сбросить все local overrides
            </button>
          </div>
        </section>
      ) : null}

      {access.settings.devtools && devModeEnabled ? (
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
          {fixtureMessage ? (
            <p className="status-line" data-testid="fixture-status-message">
              {fixtureMessage}
            </p>
          ) : null}

          <div className="action-row">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void handleRunBenchmark()}
              disabled={benchmarkBusy}
              data-testid="run-benchmark-btn"
            >
              {benchmarkBusy ? "Измерение..." : "Измерить агрегации (30/90/all)"}
            </button>
          </div>
          {benchmarkReport ? (
            <pre className="benchmark-report" data-testid="benchmark-report">
              {benchmarkReport}
            </pre>
          ) : null}
        </section>
      ) : access.settings.devtools ? (
        <p className="status-line" data-testid="dev-tools-hidden-note">
          Инструменты demo/benchmark скрыты. Включите режим разработчика, если они нужны.
        </p>
      ) : null}
    </section>
  );
}
