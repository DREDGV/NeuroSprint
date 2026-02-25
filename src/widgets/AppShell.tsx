import { useEffect, type PropsWithChildren } from "react";
import { useActiveUserDisplayName } from "../app/useActiveUserDisplayName";
import { useAppRole } from "../app/useAppRole";
import { APP_NAME, APP_VERSION } from "../shared/constants/appMeta";
import { appRoleLabel, saveAppRole } from "../shared/lib/settings/appRole";
import { MainNav } from "./MainNav";
import { PwaStatusBar } from "./PwaStatusBar";

export function AppShell({ children }: PropsWithChildren) {
  const { activeUserName, activeUserRole } = useActiveUserDisplayName();
  const appRole = useAppRole();

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
          <div className="brand-mark" aria-hidden="true">
            NS
          </div>
          <div>
            <p className="eyebrow">
              {APP_NAME} <span className="app-version">v{APP_VERSION}</span>
            </p>
            <h1 className="app-title">Тренажер скорости мышления</h1>
          </div>
        </div>
      </header>
      <div className="active-user-banner" data-testid="active-user-banner">
        <span>
          Активный пользователь: <strong>{activeUserName}</strong>
        </span>
        <span className="role-pill" data-testid="app-role-badge">
          Роль: {appRoleLabel(appRole)}
        </span>
      </div>
      <PwaStatusBar />
      <MainNav role={appRole} />
      <main className="app-content">{children}</main>
    </div>
  );
}
