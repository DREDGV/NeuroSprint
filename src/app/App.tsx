import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ActiveUserProvider } from "./ActiveUserContext";
import { RequireActiveUser } from "./RequireActiveUser";
import { RequirePermission } from "./RequirePermission";
import { AppShell } from "../widgets/AppShell";
import { useFeatureFlag } from "../shared/lib/online/featureFlags";

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
const PreSessionPage = lazy(() =>
  import("../pages/PreSessionPage").then((module) => ({
    default: module.PreSessionPage
  }))
);
const ClassesPage = lazy(() =>
  import("../pages/ClassesPage").then((module) => ({
    default: module.ClassesPage
  }))
);
const CompetitionsPage = lazy(() =>
  import("../pages/CompetitionsPage").then((module) => ({
    default: module.CompetitionsPage
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
const ReactionPage = lazy(() =>
  import("../pages/ReactionPage").then((module) => ({
    default: module.ReactionPage
  }))
);
const NBackSetupPage = lazy(() =>
  import("../pages/NBackSetupPage").then((module) => ({
    default: module.NBackSetupPage
  }))
);
const NBackSessionPage = lazy(() =>
  import("../pages/NBackSessionPage").then((module) => ({
    default: module.NBackSessionPage
  }))
);
const MemoryGridSetupPage = lazy(() =>
  import("../pages/MemoryGridSetupPage").then((module) => ({
    default: module.MemoryGridSetupPage
  }))
);
const MemoryGridSessionPage = lazy(() =>
  import("../pages/MemoryGridSessionPage").then((module) => ({
    default: module.MemoryGridSessionPage
  }))
);
const DecisionRushSetupPage = lazy(() =>
  import("../pages/DecisionRushSetupPage").then((module) => ({
    default: module.DecisionRushSetupPage
  }))
);
const DecisionRushSessionPage = lazy(() =>
  import("../pages/DecisionRushSessionPage").then((module) => ({
    default: module.DecisionRushSessionPage
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
const PatternRecognitionSetupPage = lazy(() =>
  import("../pages/PatternRecognitionSetupPage").then((module) => ({
    default: module.PatternRecognitionSetupPage
  }))
);
const PatternRecognitionSessionPage = lazy(() =>
  import("../pages/PatternRecognitionSessionPage").then((module) => ({
    default: module.PatternRecognitionSessionPage
  }))
);
const PatternRecognitionResultPage = lazy(() =>
  import("../pages/PatternRecognitionResultPage").then((module) => ({
    default: module.PatternRecognitionResultPage
  }))
);
const MemoryMatchPage = lazy(() =>
  import("../pages/MemoryMatchPage").then((module) => ({
    default: module.MemoryMatchPage
  }))
);
const SpatialMemoryPage = lazy(() =>
  import("../pages/SpatialMemoryPage").then((module) => ({
    default: module.SpatialMemoryPage
  }))
);
const BlockPatternRecallPage = lazy(() =>
  import("../pages/BlockPatternRecallPage").then((module) => ({
    default: module.BlockPatternRecallPage
  }))
);

export function App() {
  const classesEnabled = useFeatureFlag("classes_ui");
  const competitionsEnabled = useFeatureFlag("competitions_ui");
  const groupStatsEnabled = useFeatureFlag("group_stats_ui");

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
                path="/training/pre-session"
                element={
                  <RequireActiveUser>
                    <PreSessionPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/classes"
                element={
                  classesEnabled ? (
                    <RequireActiveUser>
                      <RequirePermission permission="classes:view" sectionTitle="Классы">
                        <ClassesPage />
                      </RequirePermission>
                    </RequireActiveUser>
                  ) : (
                    <Navigate to="/training" replace />
                  )
                }
              />
              <Route
                path="/classes/:classId"
                element={
                  classesEnabled ? (
                    <RequireActiveUser>
                      <RequirePermission permission="classes:view" sectionTitle="Классы">
                        <ClassesPage />
                      </RequirePermission>
                    </RequireActiveUser>
                  ) : (
                    <Navigate to="/training" replace />
                  )
                }
              />
              <Route
                path="/competitions"
                element={
                  competitionsEnabled ? (
                    <RequireActiveUser>
                      <RequirePermission permission="classes:manage" sectionTitle="Соревнования">
                        <CompetitionsPage />
                      </RequirePermission>
                    </RequireActiveUser>
                  ) : (
                    <Navigate to="/training" replace />
                  )
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
                path="/training/reaction"
                element={
                  <RequireActiveUser>
                    <ReactionPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/nback"
                element={
                  <RequireActiveUser>
                    <NBackSetupPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/nback/session"
                element={
                  <RequireActiveUser>
                    <NBackSessionPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/memory-grid"
                element={
                  <RequireActiveUser>
                    <MemoryGridSetupPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/memory-grid/session"
                element={
                  <RequireActiveUser>
                    <MemoryGridSessionPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/decision-rush"
                element={
                  <RequireActiveUser>
                    <DecisionRushSetupPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/decision-rush/session"
                element={
                  <RequireActiveUser>
                    <DecisionRushSessionPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/pattern-recognition"
                element={
                  <RequireActiveUser>
                    <PatternRecognitionSetupPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/pattern-recognition/session"
                element={
                  <RequireActiveUser>
                    <PatternRecognitionSessionPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/pattern-recognition/result"
                element={
                  <RequireActiveUser>
                    <PatternRecognitionResultPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/memory-match"
                element={
                  <RequireActiveUser>
                    <MemoryMatchPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/spatial-memory"
                element={
                  <RequireActiveUser>
                    <SpatialMemoryPage />
                  </RequireActiveUser>
                }
              />
              <Route
                path="/training/block-pattern"
                element={
                  <RequireActiveUser>
                    <BlockPatternRecallPage />
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
                  groupStatsEnabled ? (
                    <RequireActiveUser>
                      <RequirePermission
                        permission="stats:group:view"
                        sectionTitle="Групповая статистика"
                      >
                        <StatsGroupPage />
                      </RequirePermission>
                    </RequireActiveUser>
                  ) : (
                    <Navigate to="/stats" replace />
                  )
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
