import { NavLink } from "react-router-dom";
import { useEffect, useState, type PropsWithChildren } from "react";
import { NotificationBell } from "../features/notifications/components/NotificationBell";
import { useActiveUser } from "../app/ActiveUserContext";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { useAppRole } from "../app/useAppRole";
import { useAuth } from "../app/useAuth";
import { APP_NAME, APP_VERSION } from "../shared/constants/appMeta";
import { useFeatureFlags } from "../shared/lib/online/featureFlags";
import { appRoleLabel, saveAppRole } from "../shared/lib/settings/appRole";
import type { AppRole } from "../shared/types/domain";
import { MainNav } from "./MainNav";
import { PwaStatusBar } from "./PwaStatusBar";
import { FeedbackModal } from "../shared/ui/FeedbackModal";

function roleIcon(role: AppRole): string {
  if (role === "admin") {
    return "🛡";
  }
  if (role === "teacher") {
    return "🎓";
  }
  if (role === "student") {
    return "👦";
  }
  return "🏠";
}

export function AppShell({ children }: PropsWithChildren) {
  const { activeUserName, activeUserRole, activeUserLocked } = useActiveUserDisplayName();
  const { activeUserId } = useActiveUser();
  const auth = useAuth();
  const appRole = useAppRole();
  const featureFlags = useFeatureFlags();
  const [wordmarkMissing, setWordmarkMissing] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    if (!activeUserRole) {
      return;
    }
    saveAppRole(activeUserRole);
  }, [activeUserRole]);

  const accountLabel = !auth.isConfigured
    ? "Облачный аккаунт пока не настроен"
    : auth.isAuthenticated
      ? auth.account?.email ?? "Аккаунт подключён"
      : "Гостевой режим";

  const accountToneClass = !auth.isConfigured
    ? "is-warning"
    : auth.isAuthenticated
      ? "is-connected"
      : "is-guest";

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-row">
          <div className="brand-main">
            <p className="eyebrow">
              {wordmarkMissing ? APP_NAME : "Версия"} <span className="app-version">v{APP_VERSION}</span>
            </p>
            {!wordmarkMissing ? (
              <img
                className="brand-wordmark-image"
                src="/neurosprint-logo.png"
                alt={`${APP_NAME} логотип`}
                onError={() => setWordmarkMissing(true)}
              />
            ) : (
              <h1 className="app-title">Тренажёр скорости мышления</h1>
            )}
          </div>
        </div>

        {featureFlags.classes_ui || featureFlags.competitions_ui ? (
          <div className="header-notification-bell">
            <NotificationBell userId={activeUserId} />
          </div>
        ) : null}
      </header>

      <div className="active-user-banner" data-testid="active-user-banner">
        <div className="active-user-banner-copy">
          <div className="active-user-banner-main">
            <span>
              Активный профиль: <strong>{activeUserName}</strong>
            </span>
            {!activeUserLocked && activeUserRole ? (
              <span className="role-pill" data-testid="app-role-badge">
                <span className="role-pill-icon" aria-hidden="true">
                  {roleIcon(appRole)}
                </span>
                {appRoleLabel(appRole)}
              </span>
            ) : (
              <span className="role-pill is-warning" data-testid="app-role-badge">
                {activeUserId ? "Нужен вход" : "Профиль не выбран"}
              </span>
            )}
          </div>

          <div className="active-user-banner-account-row">
            <span className={`account-banner-pill ${accountToneClass}`}>
              {accountLabel}
            </span>
            {auth.syncInProgress ? (
              <span className="account-banner-pill is-syncing">Синхронизация…</span>
            ) : null}
            {auth.syncError && auth.isConfigured ? (
              <span className="account-banner-pill is-warning">Проверьте обновление данных</span>
            ) : null}
          </div>
        </div>

        <div className="active-user-banner-actions">
          <NavLink to="/profiles" className="header-action-link">
            Профили и аккаунт
          </NavLink>
          <button
            type="button"
            className="header-action-link feedback-trigger-btn"
            onClick={() => setFeedbackOpen(true)}
            title="Отправить отзыв"
          >
            Отзыв
          </button>
          <NavLink to="/ideas" className="header-action-link" title="Доска идей">
            Идеи
          </NavLink>
          <NavLink
            to="/help"
            className="help-button"
            title="Справка"
            aria-label="Справка"
          >
            ?
          </NavLink>
        </div>
      </div>

      <PwaStatusBar />
      <MainNav />
      <main className="app-content">{children}</main>

      {feedbackOpen && (
        <FeedbackModal
          onClose={() => setFeedbackOpen(false)}
          surface="global_form"
        />
      )}
    </div>
  );
}
