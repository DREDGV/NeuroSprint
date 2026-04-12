import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PatternRecognitionResultPage } from "../../src/pages/PatternRecognitionResultPage";
import type { PatternSessionMetrics, PatternSetup } from "../../src/shared/types/pattern";

const setup: PatternSetup = {
  modeId: "pattern_classic",
  level: "standard",
  durationSec: 60,
  questionCount: 12,
  elementTypes: ["color", "shape"],
  contentType: "visual",
  showHints: false
};

const metrics: PatternSessionMetrics = {
  totalQuestions: 12,
  correctCount: 10,
  errors: 2,
  accuracy: 10 / 12,
  durationMs: 52_000,
  avgReactionTimeMs: 1950,
  firstCorrectTimeMs: 1200,
  maxLevel: 2,
  avgLevel: 1.8,
  patternTypes: ["ABAB", "CYCLE", "MIRROR"],
  streakBest: 5,
  score: 148
};

function renderResult(state?: { metrics: PatternSessionMetrics; setup: PatternSetup }) {
  return render(
    <MemoryRouter
      initialEntries={[
        {
          pathname: "/training/pattern-recognition/result",
          state
        }
      ]}
    >
      <Routes>
        <Route path="/training/pattern-recognition/result" element={<PatternRecognitionResultPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PatternRecognitionResultPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a friendly fallback when opened without session state", () => {
    renderResult();

    expect(screen.getByTestId("pattern-result-page")).toBeInTheDocument();
    expect(screen.getByText("Сначала завершите раунд")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "К Распознаванию паттернов" })).toHaveAttribute(
      "href",
      "/training/pattern-recognition"
    );
  });

  it("renders the finished session with comparison and saves current result", () => {
    localStorage.setItem(
      "neurosprint:pattern:last",
      JSON.stringify({
        score: 130,
        accuracy: 0.75,
        durationMs: 58_000,
        avgReactionTimeMs: 2300,
        streakBest: 3,
        correctCount: 9,
        totalQuestions: 12,
        recordedAt: "2026-03-19T10:00:00.000Z"
      })
    );
    localStorage.setItem(
      "neurosprint:pattern:best",
      JSON.stringify({
        score: 140,
        accuracy: 0.8,
        durationMs: 55_000,
        avgReactionTimeMs: 2100,
        streakBest: 4,
        correctCount: 10,
        totalQuestions: 12,
        recordedAt: "2026-03-18T10:00:00.000Z"
      })
    );

    renderResult({ metrics, setup });

    expect(screen.getByTestId("pattern-result-page")).toBeInTheDocument();
    expect(screen.getByText("Хороший рабочий результат")).toBeInTheDocument();
    expect(screen.getByTestId("pattern-result-comparison")).toHaveTextContent(
      "Лучше прошлого раза на 18"
    );
    expect(screen.getByTestId("pattern-result-best")).toHaveTextContent("148");
    expect(screen.getByTestId("pattern-stats-link")).toHaveAttribute("href", "/stats");

    const storedLast = localStorage.getItem("neurosprint:pattern:last");
    const storedBest = localStorage.getItem("neurosprint:pattern:best");
    expect(storedLast).toContain("\"score\":148");
    expect(storedBest).toContain("\"score\":148");
  });
});
