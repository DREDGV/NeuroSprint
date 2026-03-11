import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { TrainingHubPage } from "../../src/pages/TrainingHubPage";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";
import type { Session, TrainingModuleId, TrainingModeId } from "../../src/shared/types/domain";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    listByUser: vi.fn()
  }
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

function renderHub() {
  return render(
    <MemoryRouter>
      <ActiveUserProvider>
        <TrainingHubPage />
      </ActiveUserProvider>
    </MemoryRouter>
  );
}

function makeSession(
  id: string,
  moduleId: TrainingModuleId,
  modeId: TrainingModeId,
  timestamp: string,
  overrides: Partial<Session> = {}
): Session {
  const modeByModule: Record<TrainingModuleId, Session["mode"]> = {
    schulte: "classic",
    sprint_math: "sprint_math",
    reaction: "reaction",
    n_back: "n_back",
    memory_grid: "memory_grid",
    spatial_memory: "spatial_memory",
    decision_rush: "decision_rush",
    memory_match: "memory_match",
    pattern_recognition: "pattern_recognition"
  };

  return {
    id,
    userId: "u1",
    taskId: moduleId,
    moduleId,
    modeId,
    mode: modeByModule[moduleId],
    level: 1,
    presetId: "easy",
    adaptiveSource: "auto",
    timestamp,
    localDate: timestamp.slice(0, 10),
    durationMs: 45_000,
    score: 60,
    accuracy: 0.8,
    speed: 1,
    errors: 1,
    difficulty: {
      gridSize: 3,
      numbersCount: 9,
      mode: modeByModule[moduleId]
    },
    ...overrides
  };
}

describe("TrainingHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");
    mocks.sessionRepository.listByUser.mockResolvedValue([]);
  });

  it("renders skill tabs as the main navigation layer", () => {
    renderHub();

    expect(screen.getByTestId("training-hub-page")).toBeInTheDocument();
    expect(screen.getByText("Тренировки")).toBeInTheDocument();
    expect(screen.getByTestId("training-hub-today-card")).toBeInTheDocument();
    expect(screen.getByTestId("training-skill-system-strip")).toBeInTheDocument();
    expect(screen.getByTestId("training-skill-system-action")).toBeInTheDocument();
    expect(screen.getByTestId("training-skill-tabs")).toBeInTheDocument();
    expect(screen.getByTestId("training-skill-tab-attention")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("training-skill-tab-memory")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("training-skill-panel-attention")).toBeInTheDocument();
    expect(screen.getByTestId("training-featured-modules-attention")).toBeInTheDocument();
  });

  it("updates visible modules when the active skill changes", () => {
    renderHub();

    expect(screen.getByTestId("training-open-schulte")).toBeInTheDocument();
    expect(screen.queryByTestId("training-open-sprint_math")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("training-skill-tab-math"));

    expect(screen.getByTestId("training-skill-panel-math")).toBeInTheDocument();
    expect(screen.getByTestId("training-featured-modules-math")).toBeInTheDocument();
    expect(screen.getByTestId("training-skill-progress-math")).toBeInTheDocument();
    expect(screen.getByTestId("training-open-sprint_math")).toHaveAttribute("href", "/training/sprint-math");
    expect(screen.queryByTestId("training-open-schulte")).not.toBeInTheDocument();
    expect(screen.getByTestId("training-scenario-sprint_math")).toBeInTheDocument();
  });

  it("shows Spatial Memory alongside the main memory trainers", () => {
    renderHub();

    fireEvent.click(screen.getByTestId("training-skill-tab-memory"));

    expect(screen.getByTestId("training-skill-panel-memory")).toBeInTheDocument();
    expect(screen.getByTestId("training-featured-modules-memory")).toBeInTheDocument();
    expect(screen.getByTestId("training-open-memory_match")).toHaveAttribute("href", "/training/memory-match");
    expect(screen.getByTestId("training-plan-memory_match")).toHaveAttribute("href", "/training/pre-session?module=memory_match");
    expect(screen.getByTestId("training-open-spatial_memory")).toHaveAttribute("href", "/training/spatial-memory");
    expect(screen.getByTestId("training-plan-spatial_memory")).toHaveAttribute(
      "href",
      "/training/pre-session?module=spatial_memory"
    );
    expect(screen.getByTestId("training-scenario-memory_match")).toBeInTheDocument();
    expect(screen.queryByTestId("training-alpha-spatial-memory")).not.toBeInTheDocument();
  });

  it("keeps a separate experimental block for unfinished prototypes", () => {
    renderHub();

    expect(screen.getByTestId("training-alpha-trainers")).toBeInTheDocument();
    expect(screen.getByTestId("training-alpha-block-pattern")).toHaveAttribute("href", "/training/block-pattern");
    expect(screen.getByLabelText("Готовность Block Pattern Recall")).toHaveAttribute("aria-valuenow", "81");
    expect(screen.getByText("Сборка режима")).toBeInTheDocument();
    expect(screen.getAllByText("Готовность к переводу")).toHaveLength(1);
    expect(screen.getByTestId("training-alpha-block-pattern")).toHaveTextContent("71/100");
    expect(screen.getByTestId("training-alpha-block-pattern")).toHaveTextContent("Нужна доработка");
    expect(screen.queryByTestId("training-alpha-memory-match")).not.toBeInTheDocument();
    expect(screen.queryByTestId("training-alpha-spatial-memory")).not.toBeInTheDocument();
  });

  it("opens the current focus skill from the growth system when history exists", async () => {
    mocks.sessionRepository.listByUser.mockResolvedValue([
      makeSession("s1", "reaction", "reaction_signal", "2026-03-08T10:00:00.000Z", {
        score: 164,
        accuracy: 0.93,
        errors: 0
      }),
      makeSession("s2", "reaction", "reaction_pair", "2026-03-07T10:00:00.000Z", {
        score: 152,
        accuracy: 0.9,
        errors: 1
      })
    ]);

    renderHub();

    expect(await screen.findByTestId("training-skill-panel-memory")).toBeInTheDocument();
    expect(screen.getByTestId("training-hub-today-card")).toHaveTextContent("Фокус: Память");
    expect(screen.getByTestId("training-hub-guidance-start")).toHaveAttribute(
      "href",
      "/training/memory-match"
    );
  });
});







