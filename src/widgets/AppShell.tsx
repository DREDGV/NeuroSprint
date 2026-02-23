import type { PropsWithChildren } from "react";
import { APP_NAME, APP_VERSION } from "../shared/constants/appMeta";
import { MainNav } from "./MainNav";
import { PwaStatusBar } from "./PwaStatusBar";

export function AppShell({ children }: PropsWithChildren) {
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
      <PwaStatusBar />
      <MainNav />
      <main className="app-content">{children}</main>
    </div>
  );
}
