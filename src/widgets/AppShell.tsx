import { useEffect, useState, type PropsWithChildren } from "react";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { useAppRole } from "../app/useAppRole";
import { APP_NAME, APP_VERSION } from "../shared/constants/appMeta";
import { appRoleLabel, saveAppRole } from "../shared/lib/settings/appRole";
import type { AppRole } from "../shared/types/domain";
import { MainNav } from "./MainNav";
import { PwaStatusBar } from "./PwaStatusBar";

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
  const { activeUserName, activeUserRole } = useActiveUserDisplayName();
  const appRole = useAppRole();
  const [wordmarkMissing, setWordmarkMissing] = useState(false);

  useEffect(() => {
    if (!activeUserRole) {
      return;
    }
    saveAppRole(activeUserRole);
  }, [activeUserRole]);

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
              <h1 className="app-title">Тренажер скорости мышления</h1>
            )}
          </div>
        </div>
      </header>

      <div className="active-user-banner" data-testid="active-user-banner">
        <span>
          Активный пользователь: <strong>{activeUserName}</strong>
        </span>
        <span className="role-pill" data-testid="app-role-badge">
          <span className="role-pill-icon" aria-hidden="true">{roleIcon(appRole)}</span>
          {appRoleLabel(appRole)}
        </span>
      </div>

      <PwaStatusBar />
      <MainNav />
      <main className="app-content">{children}</main>
    </div>
  );
}
