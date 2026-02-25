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
const TrainingHubPage = lazy(() =>
  import("../pages/TrainingHubPage").then((module) => ({
    default: module.TrainingHubPage
  }))
);
const ClassesPage = lazy(() =>
  import("../pages/ClassesPage").then((module) => ({
    default: module.ClassesPage
  }))
);
const SchulteSetupPage = lazy(() =>
  import("../pages/SchulteSetupPage").then((module) => ({
    default: module.SchulteSetupPage
  }))
);
const SprintMathSetupPage = lazy(() =>
  import("../pages/SprintMathSetupPage").then((module) => ({
    default: module.SprintMathSetupPage
  }))
);
const SprintMathSessionPage = lazy(() =>
  import("../pages/SprintMathSessionPage").then((module) => ({
    default: module.SprintMathSessionPage
  }))
);
const SchulteSessionPage = lazy(() =>
  import("../pages/SchulteSessionPage").then((module) => ({
    default: module.SchulteSessionPage
  }))
);
const StatsPage = lazy(() =>
  import("../pages/StatsPage").then((module) => ({ default: module.StatsPage }))
);
const StatsIndividualPage = lazy(() =>
  import("../pages/StatsIndividualPage").then((module) => ({
    default: module.StatsIndividualPage
  }))
);
const StatsGroupPage = lazy(() =>
  import("../pages/StatsGroupPage").then((module) => ({
    default: module.StatsGroupPage
  }))
);
const HelpPage = lazy(() =>
  import("../pages/HelpPage").then((module) => ({
    default: module.HelpPage
  }))
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
                path="/training"
                element={
                  <RequireActiveUser>
                    <TrainingHubPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/classes"
                element={
                  <RequireActiveUser>
                    <ClassesPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/classes/:classId"
                element={
                  <RequireActiveUser>
                    <ClassesPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/schulte"
                element={
                  <RequireActiveUser>
                    <SchulteSetupPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/schulte/:mode"
                element={
                  <RequireActiveUser>
                    <SchulteSessionPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/sprint-math"
                element={
                  <RequireActiveUser>
                    <SprintMathSetupPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/sprint-math/session"
                element={
                  <RequireActiveUser>
                    <SprintMathSessionPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/play/schulte/classic"
                element={<Navigate to="/training/schulte/classic_plus" replace />}
              />
              <Route
                path="/play/schulte/timed"
                element={<Navigate to="/training/schulte/timed_plus" replace />}
              />
              <Route
                path="/stats"
                element={
                  <RequireActiveUser>
                    <StatsPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/stats/individual"
                element={
                  <RequireActiveUser>
                    <StatsIndividualPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/stats/group"
                element={
                  <RequireActiveUser>
                    <StatsGroupPage />
                  </RequireActiveUser>
                }
              />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AppShell>
      </ActiveUserProvider>
    </BrowserRouter>
  );
}
