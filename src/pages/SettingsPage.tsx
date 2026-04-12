import { FormEvent, useEffect, useState, useMemo } from "react";
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
type SettingsSection = "general" | "audio" | "profile" | "export" | "devtools";

function benchmarkThresholdMs(period: BenchmarkPeriod): number {
  if (period === 30) return 350;
  if (period === 90) return 700;
  return 1_500;
}

// Компонент Toggle Switch
function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
  icon
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label: string;
  icon?: string;
}) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-info">
        {icon && <span className="settings-toggle-icon">{icon}</span>}
        <span className="settings-toggle-label">{label}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          width: "48px",
          height: "26px",
          borderRadius: "13px",
          background: checked ? "#10b981" : "#d1d5db",
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          position: "relative",
          transition: "background 0.2s ease",
          flexShrink: 0
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: checked ? "24px" : "3px",
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            transition: "left 0.2s ease"
          }}
        />
      </button>
    </div>
  );
}

// Компонент Section Card
function SectionCard({
  icon,
  title,
  description,
  children,
  accentColor
}: {
  icon: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div
      className="settings-section-card"
      style={{
        borderLeft: accentColor ? `4px solid ${accentColor}` : "4px solid #e5e7eb",
        padding: "24px",
        background: "#fff",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
      }}
    >
      <div className="settings-section-header" style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "24px" }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>
            {title}
          </h3>
        </div>
      </div>
      {description && (
        <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      <div className="settings-section-content">{children}</div>
    </div>
  );
}

// Компонент Info Banner
function InfoBanner({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
        border: "1px solid #93c5fd",
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
        marginBottom: "24px"
      }}
    >
      <span style={{ fontSize: "24px", flexShrink: 0 }}>{icon}</span>
      <div>
        <strong style={{ fontSize: "14px", color: "#1e40af", display: "block", marginBottom: "4px" }}>
          {title}
        </strong>
        <p style={{ margin: 0, fontSize: "14px", color: "#1e40af", lineHeight: 1.5 }}>{children}</p>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { activeUserId, setActiveUserId } = useActiveUser();
  const auth = useAuth();
  const access = useRoleAccess();
  const featureFlags = useFeatureFlags();
  const initial = getSettings();
  const initialAudio = getAudioSettings();

  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  const [timedDefaultLimitSec, setTimedDefaultLimitSec] = useState<TimeLimit>(initial.timedDefaultLimitSec);
  const [timedErrorPenalty, setTimedErrorPenalty] = useState<number>(initial.timedErrorPenalty);
  const [dailyGoalSessions, setDailyGoalSessions] = useState<number>(initial.dailyGoalSessions);
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

  const audioTestContext = useMemo(() => {
    return typeof window !== "undefined" ? new AudioContext() : null;
  }, []);

  useEffect(() => {
    if (!activeUserId) {
      setAppRole(getAppRole());
      setActiveUserRole(null);
      return;
    }

    let cancelled = false;
    void Promise.all([userRepository.getById(activeUserId), userRepository.list()]).then(([user, users]) => {
      if (cancelled) return;
      if (user) setAppRole(user.role);
      setActiveUserRole(user?.role ?? null);
      setTeachersCount(users.filter((entry) => isTeacherRole(entry.role)).length);
    });

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const nextSettings: AppSettings = {
      timedDefaultLimitSec,
      timedErrorPenalty: Number.isFinite(timedErrorPenalty) && timedErrorPenalty >= 0 ? timedErrorPenalty : DEFAULT_SETTINGS.timedErrorPenalty,
      dailyGoalSessions: Number.isFinite(dailyGoalSessions) && dailyGoalSessions >= 1 ? Math.round(dailyGoalSessions) : DEFAULT_SETTINGS.dailyGoalSessions
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

      setMessage(hasChanges ? "✅ Настройки сохранены." : "Для текущей роли доступен только просмотр.");
    } catch (caught) {
      console.error("settings save failed", caught);
      if (isUserRoleGuardError(caught) && activeUserRole) {
        setAppRole(activeUserRole);
      }
      setMessage(
        isUserRoleGuardError(caught) ? userRoleGuardMessage(caught) : "❌ Не удалось сохранить часть настроек."
      );
    }
  }

  async function handleGenerateDemoFixture() {
    if (!guardAccess(access.settings.devtools, setFixtureMessage, "Demo-инструменты доступны только для роли «Учитель».")) {
      return;
    }

    const groupsCount = Math.max(1, Math.min(8, Math.round(fixtureGroupsCount)));
    const studentsPerGroup = Math.max(1, Math.min(40, Math.round(fixtureStudentsPerGroup)));
    const days = Math.max(3, Math.min(45, Math.round(fixtureDays)));

    const approved = window.confirm(`Сгенерировать демо-данные?\nГрупп: ${groupsCount}\nУчеников в группе: ${studentsPerGroup}\nДней: ${days}`);
    if (!approved) return;

    setFixtureBusy(true);
    setFixtureMessage(null);

    try {
      const summary = await generateDemoClassroomFixture({
        groupsCount,
        studentsPerGroup,
        days,
        replaceExistingDemoData: true
      });

      if (summary.activeUserId) setActiveUserId(summary.activeUserId);
      setFixtureMessage(`✅ Демо-данные созданы: ${summary.groupsCreated} групп, ${summary.usersCreated} учеников, ${summary.sessionsCreated} сессий.`);
    } catch (caught) {
      console.error("demo fixture failed", caught);
      setFixtureMessage("❌ Не удалось сгенерировать демо-данные.");
    } finally {
      setFixtureBusy(false);
    }
  }

  async function handleRunBenchmark() {
    if (!guardAccess(access.settings.devtools, setBenchmarkReport, "Benchmark доступен только для роли «Учитель».")) {
      return;
    }

    setBenchmarkBusy(true);
    setBenchmarkReport(null);

    const metric: GroupMetric = "score";
    const modeId: TrainingModeId = "classic_plus";
    const periods: BenchmarkPeriod[] = [30, 90, "all"];
    const nowMs = typeof performance !== "undefined" && typeof performance.now === "function" ? () => performance.now() : () => Date.now();

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
        const groupStats = targetGroup ? await groupRepository.aggregateGroupStats(targetGroup.id, modeId, period, metric) : null;
        const groupDuration = nowMs() - groupStart;

        const globalStart = nowMs();
        const globalStats = await sessionRepository.getModeMetricSnapshot(modeId, metric, period);
        const globalDuration = nowMs() - globalStart;

        const periodLabel = period === "all" ? "all" : `${period}d`;
        const isSlow = groupDuration > thresholdMs || globalDuration > thresholdMs;
        if (isSlow) warnings += 1;
        lines.push(`[${periodLabel}] group=${groupDuration.toFixed(1)}ms (${groupStats?.summary.sessionsTotal ?? 0} сессий), global=${globalDuration.toFixed(1)}ms (${globalStats.summary.sessionsTotal} сессий), порог<=${thresholdMs}ms, статус=${isSlow ? "⚠️ ВНИМАНИЕ" : "✅ OK"}`);
      }

      lines.push(warnings === 0 ? "✅ Итог: производительность в допустимом диапазоне." : `⚠️ Итог: обнаружено ${warnings} период(ов) выше порога.`);
      setBenchmarkReport(lines.join("\n"));
    } catch (caught) {
      console.error("benchmark failed", caught);
      setBenchmarkReport("❌ Не удалось выполнить замер агрегаций.");
    } finally {
      setBenchmarkBusy(false);
    }
  }

  async function handleExportCsv() {
    if (!guardAccess(access.settings.export, setExportMessage, "Экспорт доступен только для ролей «Учитель» и «Домашний».")) {
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
      const usersCsv = toCsv(["id", "name", "role", "createdAt"], users.map((entry) => [entry.id, entry.name, entry.role, entry.createdAt]));
      const sessionsCsv = toCsv(["id", "userId", "moduleId", "modeId", "mode", "level", "timestamp", "localDate", "durationMs", "score", "accuracy", "speed", "errors", "correctCount", "effectiveCorrect"], sessions.map((entry) => [entry.id, entry.userId, entry.moduleId, entry.modeId, entry.mode, entry.level, entry.timestamp, entry.localDate, entry.durationMs, entry.score, entry.accuracy, entry.speed, entry.errors, entry.correctCount ?? "", entry.effectiveCorrect ?? ""]));
      const groupsCsv = toCsv(["id", "name", "createdAt"], groups.map((entry) => [entry.id, entry.name, entry.createdAt]));
      const membersCsv = toCsv(["id", "groupId", "userId", "joinedAt"], members.map((entry) => [entry.id, entry.groupId, entry.userId, entry.joinedAt]));
      const preferencesCsv = toCsv(["id", "userId", "schulteThemeId", "schulteCustomTheme", "audioMuted", "audioVolume", "audioStartEnd", "audioClick", "audioCorrect", "audioError", "updatedAt"], preferences.map((entry) => [entry.id, entry.userId, entry.schulteThemeId, JSON.stringify(entry.schulteCustomTheme ?? {}), entry.audioSettings.muted, entry.audioSettings.volume, entry.audioSettings.startEnd, entry.audioSettings.click, entry.audioSettings.correct, entry.audioSettings.error, entry.updatedAt]));
      const modeProfilesCsv = toCsv(["id", "userId", "moduleId", "modeId", "level", "autoAdjust", "manualLevel", "lastDecisionReason", "lastEvaluatedAt", "updatedAt"], modeProfiles.map((entry) => [entry.id, entry.userId, entry.moduleId, entry.modeId, entry.level, entry.autoAdjust, entry.manualLevel ?? "", entry.lastDecisionReason ?? "", entry.lastEvaluatedAt ?? "", entry.updatedAt]));

      downloadTextFile(`neurosprint_users_${stamp}.csv`, usersCsv, "text/csv;charset=utf-8");
      downloadTextFile(`neurosprint_sessions_${stamp}.csv`, sessionsCsv, "text/csv;charset=utf-8");
      downloadTextFile(`neurosprint_class_groups_${stamp}.csv`, groupsCsv, "text/csv;charset=utf-8");
      downloadTextFile(`neurosprint_group_members_${stamp}.csv`, membersCsv, "text/csv;charset=utf-8");
      downloadTextFile(`neurosprint_user_preferences_${stamp}.csv`, preferencesCsv, "text/csv;charset=utf-8");
      downloadTextFile(`neurosprint_user_mode_profiles_${stamp}.csv`, modeProfilesCsv, "text/csv;charset=utf-8");
      setExportMessage("✅ CSV экспортирован. Проверьте папку «Загрузки».");
    } catch (caught) {
      console.error("csv export failed", caught);
      setExportMessage("❌ Не удалось экспортировать CSV.");
    } finally {
      setExportBusy(false);
    }
  }

  const isLastTeacherActive = activeUserId != null && activeUserRole === "teacher" && teachersCount <= 1;
  const hasFeatureOverrides = FEATURE_FLAG_DEFINITIONS.some((definition) => getFeatureFlagOverride(definition.key) !== null);
  const allowPrivilegedRoles = allowPrivilegedProfileRoles();

  const accountSettingsHint = !auth.isConfigured
    ? "Сервис аккаунтов ещё подключается. Пока все настройки сохраняются только на этом устройстве."
    : auth.isAuthenticated
      ? auth.account?.email
        ? `Аккаунт ${auth.account.email} подключён. Настройки профилей аккаунта будут отправлены на синхронизацию после сохранения.`
        : "Аккаунт подключён. Настройки профилей аккаунта будут отправлены на синхронизацию после сохранения."
      : "Сейчас вы в гостевом режиме. Настройки и профили работают локально, пока вы не войдёте в аккаунт.";

  const canPersistSettings = access.settings.updateTraining || access.settings.updateAudio || access.settings.devtools || access.settings.updateRole;

  const sections: { id: SettingsSection; icon: string; title: string; show: boolean }[] = [
    { id: "general", icon: "⚙️", title: "Основные", show: true },
    { id: "audio", icon: "🔊", title: "Звук", show: access.settings.view },
    { id: "profile", icon: "👤", title: "Профиль", show: allowPrivilegedRoles },
    { id: "export", icon: "📊", title: "Экспорт", show: access.settings.view },
    { id: "devtools", icon: "🛠️", title: "Инструменты", show: access.settings.devtools }
  ];

  const visibleSections = sections.filter((s) => s.show);

  if (!access.settings.view) {
    return (
      <section className="panel" data-testid="settings-page">
        <h2>⚙️ Настройки</h2>
        <p className="status-line">Раздел настроек недоступен для текущей роли.</p>
      </section>
    );
  }

  return (
    <section className="settings-page-wrapper" data-testid="settings-page">
      {/* Header */}
      <header className="settings-page-header">
        <div className="settings-page-title-row">
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#111827" }}>⚙️ Настройки</h2>
        </div>
        <p style={{ margin: "8px 0 0", fontSize: "15px", color: "#6b7280" }}>
          Управляйте параметрами тренажёров, звуком и поведением профиля
        </p>
      </header>

      <div className="settings-page-layout">
        {/* Sidebar Navigation */}
        <aside className="settings-sidebar">
          <nav className="settings-nav">
            {visibleSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`settings-nav-item ${activeSection === section.id ? "is-active" : ""}`}
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  border: "none",
                  background: activeSection === section.id ? "#f0fdf4" : "transparent",
                  color: activeSection === section.id ? "#059669" : "#6b7280",
                  fontWeight: activeSection === section.id ? 600 : 400,
                  fontSize: "14px",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "all 0.2s ease"
                }}
              >
                <span style={{ fontSize: "18px" }}>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="settings-main-content">
          {/* Account Info Banner */}
          <InfoBanner icon="🔗" title="Аккаунт и синхронизация">
            {accountSettingsHint}
          </InfoBanner>

          {/* Status Messages */}
          {message && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                background: message.includes("❌") ? "#fee2e2" : "#f0fdf4",
                border: message.includes("❌") ? "1px solid #f87171" : "1px solid #86efac",
                marginBottom: "20px",
                fontSize: "14px",
                color: message.includes("❌") ? "#991b1b" : "#166534"
              }}
            >
              {message}
            </div>
          )}

          <form className="settings-form" onSubmit={handleSubmit}>
            {/* General Settings Section */}
            {activeSection === "general" && (
              <SectionCard icon="⚙️" title="Основные настройки" description="Параметры тренажёров и цели">
                <div className="settings-field-group">
                  <label htmlFor="default-limit" className="settings-field-label">
                    <span className="settings-field-title">Лимит по умолчанию (Timed)</span>
                    <span className="settings-field-desc">Время для режима «На время»</span>
                  </label>
                  <select
                    id="default-limit"
                    value={timedDefaultLimitSec}
                    onChange={(event) => setTimedDefaultLimitSec(Number(event.target.value) as TimeLimit)}
                    disabled={!access.settings.updateTraining}
                    className="settings-select"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      fontSize: "14px",
                      width: "100%",
                      maxWidth: "240px",
                      background: "#fff",
                      cursor: access.settings.updateTraining ? "pointer" : "not-allowed",
                      opacity: access.settings.updateTraining ? 1 : 0.6
                    }}
                  >
                    <option value={30}>30 секунд</option>
                    <option value={45}>45 секунд</option>
                    <option value={60}>60 секунд</option>
                    <option value={90}>90 секунд</option>
                  </select>
                </div>

                <div className="settings-field-group">
                  <label htmlFor="error-penalty" className="settings-field-label">
                    <span className="settings-field-title">Штраф за ошибку (Timed)</span>
                    <span className="settings-field-desc">Сколько секунд добавляется за ошибку</span>
                  </label>
                  <input
                    id="error-penalty"
                    type="number"
                    min={0}
                    step={0.1}
                    value={timedErrorPenalty}
                    onChange={(event) => setTimedErrorPenalty(Number(event.target.value))}
                    disabled={!access.settings.updateTraining}
                    className="settings-input"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      fontSize: "14px",
                      width: "100%",
                      maxWidth: "160px"
                    }}
                  />
                </div>

                <div className="settings-field-group">
                  <label htmlFor="daily-goal" className="settings-field-label">
                    <span className="settings-field-title">Цель на день</span>
                    <span className="settings-field-desc">Количество сессий в день</span>
                  </label>
                  <input
                    id="daily-goal"
                    type="number"
                    min={1}
                    max={20}
                    value={dailyGoalSessions}
                    onChange={(event) => setDailyGoalSessions(Number(event.target.value))}
                    disabled={!access.settings.updateTraining}
                    className="settings-input"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      fontSize: "14px",
                      width: "100%",
                      maxWidth: "160px"
                    }}
                  />
                </div>

                {access.settings.devtools && (
                  <ToggleSwitch
                    checked={devModeEnabled}
                    onChange={setDevModeState}
                    label="Режим разработчика"
                    icon="🔧"
                  />
                )}

                <div className="settings-actions" style={{ marginTop: "20px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!canPersistSettings}
                    style={{
                      padding: "12px 24px",
                      borderRadius: "10px",
                      background: canPersistSettings ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#d1d5db",
                      border: "none",
                      color: canPersistSettings ? "#fff" : "#9ca3af",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: canPersistSettings ? "pointer" : "not-allowed"
                    }}
                  >
                    💾 Сохранить
                  </button>
                </div>
              </SectionCard>
            )}

            {/* Audio Settings Section */}
            {activeSection === "audio" && (
              <SectionCard icon="🔊" title="Настройки звука" description="Управление звуковыми эффектами" accentColor="#3b82f6">
                <ToggleSwitch
                  checked={audioSettings.muted}
                  onChange={(value) => setAudioSettingsState((current) => ({ ...current, muted: value }))}
                  disabled={!access.settings.updateAudio}
                  label="Без звука (mute)"
                  icon="🔇"
                />

                <div className="settings-field-group" style={{ marginTop: "16px" }}>
                  <label className="settings-field-label">
                    <span className="settings-field-title">Громкость</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "16px" }}>🔈</span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={audioSettings.volume}
                      onChange={(event) => setAudioSettingsState((current) => ({ ...current, volume: Number(event.target.value) }))}
                      disabled={!access.settings.updateAudio}
                      style={{
                        flex: 1,
                        maxWidth: "300px",
                        height: "6px",
                        borderRadius: "3px",
                        background: `linear-gradient(to right, #3b82f6 ${audioSettings.volume * 100}%, #e5e7eb ${audioSettings.volume * 100}%)`,
                        cursor: access.settings.updateAudio ? "pointer" : "not-allowed",
                        opacity: access.settings.updateAudio ? 1 : 0.5
                      }}
                    />
                    <span style={{ fontSize: "16px" }}>🔊</span>
                    <span style={{ fontSize: "13px", color: "#6b7280", minWidth: "36px" }}>
                      {Math.round(audioSettings.volume * 100)}%
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <ToggleSwitch
                    checked={audioSettings.startEnd}
                    onChange={(value) => setAudioSettingsState((current) => ({ ...current, startEnd: value }))}
                    disabled={!access.settings.updateAudio}
                    label="Сигналы старт/финиш"
                    icon="🎬"
                  />
                  <ToggleSwitch
                    checked={audioSettings.click}
                    onChange={(value) => setAudioSettingsState((current) => ({ ...current, click: value }))}
                    disabled={!access.settings.updateAudio}
                    label="Звук клика"
                    icon="👆"
                  />
                  <ToggleSwitch
                    checked={audioSettings.correct}
                    onChange={(value) => setAudioSettingsState((current) => ({ ...current, correct: value }))}
                    disabled={!access.settings.updateAudio}
                    label="Звук верного ответа"
                    icon="✅"
                  />
                  <ToggleSwitch
                    checked={audioSettings.error}
                    onChange={(value) => setAudioSettingsState((current) => ({ ...current, error: value }))}
                    disabled={!access.settings.updateAudio}
                    label="Звук ошибки"
                    icon="❌"
                  />
                </div>

                <div className="settings-actions" style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setAudioSettingsState(DEFAULT_AUDIO_SETTINGS)}
                    disabled={!access.settings.updateAudio}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      background: "#fff",
                      color: "#6b7280",
                      fontWeight: 500,
                      fontSize: "14px",
                      cursor: access.settings.updateAudio ? "pointer" : "not-allowed",
                      opacity: access.settings.updateAudio ? 1 : 0.5
                    }}
                  >
                    ↩️ Сбросить
                  </button>
                </div>
              </SectionCard>
            )}

            {/* Profile Settings Section */}
            {activeSection === "profile" && (
              <SectionCard icon="👤" title="Профиль и роль" description="Настройки роли активного пользователя" accentColor="#8b5cf6">
                <label htmlFor="app-role-select" className="settings-field-label">
                  <span className="settings-field-title">Роль активного пользователя</span>
                  <span className="settings-field-desc">
                    {!access.settings.updateRole
                      ? "Смена роли доступна только для роли «Учитель»."
                      : activeUserId
                        ? "Роль применяется после нажатия «Сохранить»."
                        : "Сначала выберите активный профиль на странице «Профили»."}
                  </span>
                </label>
                <select
                  id="app-role-select"
                  value={appRole}
                  onChange={(event) => setAppRole(event.target.value as AppRole)}
                  data-testid="app-role-select"
                  disabled={!activeUserId || !access.settings.updateRole}
                  className="settings-select"
                  style={{
                    padding: "10px 14px",
                    borderRadius: "10px",
                    border: "2px solid #e5e7eb",
                    fontSize: "14px",
                    width: "100%",
                    maxWidth: "300px",
                    background: "#fff"
                  }}
                >
                  <option value="teacher">👨‍🏫 Учитель (полный режим)</option>
                  <option value="student" disabled={isLastTeacherActive}>🎓 Ученик (упрощенный интерфейс)</option>
                  <option value="home" disabled={isLastTeacherActive}>🏠 Домашний (свободный режим)</option>
                </select>

                {isLastTeacherActive && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: "#fef3c7",
                      border: "1px solid #fbbf24",
                      fontSize: "13px",
                      color: "#92400e"
                    }}
                  >
                    ⚠️ Это последний учитель в системе. Назначьте другого пользователя учителем перед сменой роли.
                  </div>
                )}

                <div className="settings-actions" style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!canPersistSettings}
                    style={{
                      padding: "12px 24px",
                      borderRadius: "10px",
                      background: canPersistSettings ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" : "#d1d5db",
                      border: "none",
                      color: canPersistSettings ? "#fff" : "#9ca3af",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: canPersistSettings ? "pointer" : "not-allowed"
                    }}
                  >
                    💾 Сохранить
                  </button>
                </div>
              </SectionCard>
            )}

            {/* Export Section */}
            {activeSection === "export" && (
              <SectionCard icon="📊" title="Экспорт данных" description="Выгрузка данных в CSV файлы" accentColor="#f59e0b">
                <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
                  Экспортирует users, sessions, groups, preferences и mode-profiles в CSV файлы на устройство.
                </p>

                {access.settings.export ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleExportCsv()}
                    disabled={exportBusy}
                    data-testid="export-csv-btn"
                    style={{
                      padding: "12px 24px",
                      borderRadius: "10px",
                      border: "2px solid #f59e0b",
                      background: exportBusy ? "#d1d5db" : "#fff",
                      color: exportBusy ? "#9ca3af" : "#f59e0b",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: exportBusy ? "not-allowed" : "pointer"
                    }}
                  >
                    {exportBusy ? "⏳ Экспорт..." : "📥 Экспорт CSV"}
                  </button>
                ) : (
                  <p className="status-line" data-testid="export-role-note">
                    Экспорт доступен для ролей «Учитель» и «Домашний».
                  </p>
                )}

                {exportMessage && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px 16px",
                      borderRadius: "10px",
                      background: exportMessage.includes("❌") ? "#fee2e2" : "#f0fdf4",
                      border: exportMessage.includes("❌") ? "1px solid #f87171" : "1px solid #86efac",
                      fontSize: "14px",
                      color: exportMessage.includes("❌") ? "#991b1b" : "#166534"
                    }}
                  >
                    {exportMessage}
                  </div>
                )}
              </SectionCard>
            )}

            {/* Dev Tools Section */}
            {activeSection === "devtools" && access.settings.devtools && (
              <>
                <SectionCard icon="🧪" title="Тестовые данные" description="Генерация демо-данных для тестирования" accentColor="#ef4444">
                  <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6b7280", lineHeight: 1.5 }}>
                    Генерирует демо-набор для проверки групповой аналитики.
                  </p>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px", marginBottom: "16px" }}>
                    <div>
                      <label htmlFor="fixture-groups" className="settings-field-label">
                        <span className="settings-field-title">Групп</span>
                      </label>
                      <input
                        id="fixture-groups"
                        type="number"
                        min={1}
                        max={8}
                        value={fixtureGroupsCount}
                        onChange={(event) => setFixtureGroupsCount(Number(event.target.value))}
                        data-testid="fixture-groups-input"
                        className="settings-input"
                        style={{ padding: "10px 14px", borderRadius: "10px", border: "2px solid #e5e7eb", fontSize: "14px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label htmlFor="fixture-students" className="settings-field-label">
                        <span className="settings-field-title">Учеников в группе</span>
                      </label>
                      <input
                        id="fixture-students"
                        type="number"
                        min={1}
                        max={40}
                        value={fixtureStudentsPerGroup}
                        onChange={(event) => setFixtureStudentsPerGroup(Number(event.target.value))}
                        data-testid="fixture-students-input"
                        className="settings-input"
                        style={{ padding: "10px 14px", borderRadius: "10px", border: "2px solid #e5e7eb", fontSize: "14px", width: "100%" }}
                      />
                    </div>
                    <div>
                      <label htmlFor="fixture-days" className="settings-field-label">
                        <span className="settings-field-title">Дней истории</span>
                      </label>
                      <input
                        id="fixture-days"
                        type="number"
                        min={3}
                        max={45}
                        value={fixtureDays}
                        onChange={(event) => setFixtureDays(Number(event.target.value))}
                        data-testid="fixture-days-input"
                        className="settings-input"
                        style={{ padding: "10px 14px", borderRadius: "10px", border: "2px solid #e5e7eb", fontSize: "14px", width: "100%" }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => void handleGenerateDemoFixture()}
                    disabled={fixtureBusy}
                    data-testid="generate-demo-fixture-btn"
                    style={{
                      padding: "12px 24px",
                      borderRadius: "10px",
                      border: "2px solid #ef4444",
                      background: fixtureBusy ? "#d1d5db" : "#fff",
                      color: fixtureBusy ? "#9ca3af" : "#ef4444",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: fixtureBusy ? "not-allowed" : "pointer"
                    }}
                  >
                    {fixtureBusy ? "⏳ Генерация..." : "🧪 Сгенерировать демо-класс"}
                  </button>

                  {fixtureMessage && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px 16px",
                        borderRadius: "10px",
                        background: fixtureMessage.includes("❌") ? "#fee2e2" : "#f0fdf4",
                        border: fixtureMessage.includes("❌") ? "1px solid #f87171" : "1px solid #86efac",
                        fontSize: "14px",
                        color: fixtureMessage.includes("❌") ? "#991b1b" : "#166534"
                      }}
                    >
                      {fixtureMessage}
                    </div>
                  )}

                  <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
                    <h4 style={{ margin: "0 0 12px", fontSize: "16px", color: "#111827" }}>⚡ Benchmark производительности</h4>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => void handleRunBenchmark()}
                      disabled={benchmarkBusy}
                      data-testid="run-benchmark-btn"
                      style={{
                        padding: "10px 20px",
                        borderRadius: "10px",
                        border: "2px solid #e5e7eb",
                        background: "#fff",
                        color: "#6b7280",
                        fontWeight: 500,
                        fontSize: "14px",
                        cursor: benchmarkBusy ? "not-allowed" : "pointer",
                        opacity: benchmarkBusy ? 0.5 : 1
                      }}
                    >
                      {benchmarkBusy ? "⏳ Измерение..." : "📊 Измерить агрегации"}
                    </button>

                    {benchmarkReport && (
                      <pre
                        style={{
                          marginTop: "12px",
                          padding: "16px",
                          borderRadius: "10px",
                          background: "#f9fafb",
                          border: "1px solid #e5e7eb",
                          fontSize: "13px",
                          lineHeight: 1.6,
                          overflow: "auto",
                          whiteSpace: "pre-wrap"
                        }}
                        data-testid="benchmark-report"
                      >
                        {benchmarkReport}
                      </pre>
                    )}
                  </div>
                </SectionCard>

                {/* Feature Flags */}
                <SectionCard icon="🚩" title="Предпросмотр функций" description="Локальные переключатели для разработки" accentColor="#6b7280">
                  {FEATURE_FLAG_DEFINITIONS.map((definition) => {
                    const override = getFeatureFlagOverride(definition.key);
                    const enabled = featureFlags[definition.key];

                    return (
                      <div key={definition.key} style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #e5e7eb" }}>
                        <ToggleSwitch
                          checked={enabled}
                          onChange={(value) => setFeatureFlagOverride(definition.key, value)}
                          label={definition.label}
                        />
                        <p style={{ margin: "8px 0 4px", fontSize: "13px", color: "#6b7280" }}>{definition.description}</p>
                        <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>
                          Источник: {override === null ? "env / deployment config" : "локальный override"}
                        </p>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setFeatureFlagOverride(definition.key, null)}
                          disabled={override === null}
                          style={{
                            marginTop: "8px",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                            background: "#fff",
                            color: "#6b7280",
                            fontSize: "12px",
                            cursor: override === null ? "not-allowed" : "pointer",
                            opacity: override === null ? 0.5 : 1
                          }}
                        >
                          Вернуть к env
                        </button>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => clearFeatureFlagOverrides()}
                    disabled={!hasFeatureOverrides}
                    data-testid="feature-flags-reset-btn"
                    style={{
                      marginTop: "12px",
                      padding: "10px 20px",
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      background: "#fff",
                      color: "#6b7280",
                      fontWeight: 500,
                      fontSize: "14px",
                      cursor: !hasFeatureOverrides ? "not-allowed" : "pointer",
                      opacity: !hasFeatureOverrides ? 0.5 : 1
                    }}
                  >
                    ↩️ Сбросить все overrides
                  </button>
                </SectionCard>
              </>
            )}
          </form>
        </main>
      </div>
    </section>
  );
}
