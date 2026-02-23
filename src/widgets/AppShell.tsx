import type { PropsWithChildren } from "react";
import { MainNav } from "./MainNav";
import { PwaStatusBar } from "./PwaStatusBar";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">NeuroSprint</p>
          <h1 className="app-title">Тренажер скорости мышления</h1>
        </div>
      </header>
      <PwaStatusBar />
      <MainNav />
      <main className="app-content">{children}</main>
    </div>
  );
}
