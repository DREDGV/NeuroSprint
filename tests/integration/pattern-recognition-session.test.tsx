import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActiveUserProvider } from "../../src/app/ActiveUserContext";
import { PatternRecognitionSessionPage } from "../../src/pages/PatternRecognitionSessionPage";
import { ACTIVE_USER_KEY } from "../../src/shared/constants/storage";
import type { PatternQuestion, PatternSetup } from "../../src/shared/types/pattern";

const mocks = vi.hoisted(() => ({
  sessionRepository: {
    save: vi.fn()
  },
  generatePatternQuestions: vi.fn(),
  generatePatternQuestion: vi.fn()
}));

vi.mock("../../src/entities/session/sessionRepository", () => ({
  sessionRepository: mocks.sessionRepository
}));

vi.mock("../../src/features/pattern-recognition/engine/patternGenerator", async () => {
  const actual = await vi.importActual<typeof import("../../src/features/pattern-recognition/engine/patternGenerator")>(
    "../../src/features/pattern-recognition/engine/patternGenerator"
  );

  return {
    ...actual,
    generatePatternQuestions: mocks.generatePatternQuestions,
    generatePatternQuestion: mocks.generatePatternQuestion
  };
});

const setup: PatternSetup = {
  modeId: "pattern_multi",
  level: "standard",
  durationSec: 60,
  questionCount: 1,
  elementTypes: ["color", "shape"],
  contentType: "numeric",
  showHints: false,
  gaps: 3
};

const question: PatternQuestion = {
  id: "pattern-q1",
  patternType: "MATH_ARITHMETIC",
  sequence: [4, 8, 8],
  options: [12, 16, 20],
  correctIndex: [0, 0, 1],
  level: "standard",
  contentType: "numeric",
  hint: "Продолжите числовой ритм.",
  explanation: "Сначала два одинаковых шага, потом новый ответ.",
  mathRule: "+4",
  sequenceLength: 3,
  answersNeeded: 3,
  gaps: 3,
  userAnswers: []
};

function renderSession(withState = true) {
  return render(
    <MemoryRouter
      initialEntries={
        withState
          ? [
              {
                pathname: "/training/pattern-recognition/session",
                state: { setup }
              }
            ]
          : ["/training/pattern-recognition/session"]
      }
    >
      <ActiveUserProvider>
        <Routes>
          <Route
            path="/training/pattern-recognition/session"
            element={<PatternRecognitionSessionPage />}
          />
          <Route
            path="/training/pattern-recognition/result"
            element={<div data-testid="pattern-result-route">done</div>}
          />
        </Routes>
      </ActiveUserProvider>
    </MemoryRouter>
  );
}

describe("PatternRecognitionSessionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(ACTIVE_USER_KEY, "u1");
    mocks.sessionRepository.save.mockResolvedValue(undefined);
    mocks.generatePatternQuestions.mockReturnValue([question]);
    mocks.generatePatternQuestion.mockReturnValue(question);
  });

  it("supports ordered multi-gap selection with repeated options and saves the session", async () => {
    renderSession();

    expect(screen.getByTestId("pattern-session-page")).toBeInTheDocument();
    expect(screen.getByTestId("pattern-confirm-selection")).toBeDisabled();

    fireEvent.click(screen.getByTestId("pattern-option-0"));
    fireEvent.click(screen.getByTestId("pattern-option-0"));
    fireEvent.click(screen.getByTestId("pattern-option-1"));

    expect(screen.getByTestId("pattern-option-count-0")).toHaveTextContent("x2");
    expect(screen.getByTestId("pattern-confirm-selection")).toBeEnabled();

    fireEvent.click(screen.getByTestId("pattern-gap-2"));

    expect(screen.getByTestId("pattern-confirm-selection")).toBeDisabled();

    fireEvent.click(screen.getByTestId("pattern-option-1"));
    fireEvent.click(screen.getByTestId("pattern-confirm-selection"));

    await waitFor(
      () => {
        expect(mocks.sessionRepository.save).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("pattern-result-route")).toBeInTheDocument();
      },
      { timeout: 2_500 }
    );

    const savedSession = mocks.sessionRepository.save.mock.calls[0]?.[0];
    expect(savedSession.modeId).toBe("pattern_multi");
    expect(savedSession.correctCount).toBe(1);
    expect(savedSession.errors).toBe(0);
    expect(savedSession.accuracy).toBe(1);
  });

  it("opens directly by URL using the last saved setup", () => {
    localStorage.setItem("neurosprint:pattern-recognition:setup", JSON.stringify(setup));

    renderSession(false);

    expect(screen.getByTestId("pattern-session-page")).toBeInTheDocument();
    expect(screen.getByTestId("pattern-selection-panel")).toBeInTheDocument();
  });
});
