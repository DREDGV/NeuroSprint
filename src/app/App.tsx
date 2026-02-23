import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ActiveUserProvider } from "./ActiveUserContext";
import { RequireActiveUser } from "./RequireActiveUser";
import { AppShell } from "../widgets/AppShell";

const HomePage = lazy(() =>
  import("../pages/HomePage").then((module) => ({ default: module.HomePage }))
);
const ProfilesPage = lazy(() =>
  import("../pages/ProfilesPage").then((module) => ({
    default: module.ProfilesPage
  }))
);
const SchulteClassicPage = lazy(() =>
  import("../pages/SchulteClassicPage").then((module) => ({
    default: module.SchulteClassicPage
  }))
);
const SchulteTimedPage = lazy(() =>
  import("../pages/SchulteTimedPage").then((module) => ({
    default: module.SchulteTimedPage
  }))
);
const StatsPage = lazy(() =>
  import("../pages/StatsPage").then((module) => ({ default: module.StatsPage }))
);
const SettingsPage = lazy(() =>
  import("../pages/SettingsPage").then((module) => ({
    default: module.SettingsPage
  }))
);

export function App() {
  return (
    <BrowserRouter>
      <ActiveUserProvider>
        <AppShell>
          <Suspense fallback={<p className="status-line">Загрузка...</p>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/profiles" element={<ProfilesPage />} />
              <Route
                path="/play/schulte/classic"
                element={
                  <RequireActiveUser>
                    <SchulteClassicPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/play/schulte/timed"
                element={
                  <RequireActiveUser>
                    <SchulteTimedPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/stats"
                element={
                  <RequireActiveUser>
                    <StatsPage />
                  </RequireActiveUser>
                }
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppShell>
      </ActiveUserProvider>
    </BrowserRouter>
  );
}
