import { describe, expect, it } from "vitest";
import { buildModeMetricSnapshot } from "../../src/entities/session/sessionRepository";
import type { Session } from "../../src/shared/types/domain";

const base = {
  taskId: "schulte" as const,
  moduleId: "schulte" as const,
  mode: "classic" as const,
  modeId: "classic_plus" as const,
  level: 2,
  presetId: "standard" as const,
  adaptiveSource: "auto" as const,
  difficulty: {
    gridSize: 5 as const,
    numbersCount: 25,
    mode: "classic" as const
  }
};

function makeSession(
  id: string,
  userId: string,
  score: number,
  accuracy: number,
  speed: number
): Session {
  return {
    id,
    userId,
    timestamp: "2026-02-24T10:00:00.000Z",
    localDate: "2026-02-24",
    durationMs: 30_000,
    score,
    accuracy,
    speed,
    errors: 1,
    ...base
  };
}

describe("buildModeMetricSnapshot", () => {
  it("returns empty summary for empty input", () => {
    const snapshot = buildModeMetricSnapshot([], "score");
    expect(snapshot.summary.avg).toBeNull();
    expect(snapshot.summary.usersTotal).toBe(0);
    expect(snapshot.byUser).toHaveLength(0);
  });

  it("builds score summary and per-user averages", () => {
    const snapshot = buildModeMetricSnapshot(
      [
        makeSession("1", "u1", 10, 0.8, 11),
        makeSession("2", "u1", 14, 0.9, 15),
        makeSession("3", "u2", 20, 0.95, 22)
      ],
      "score"
    );

    expect(snapshot.summary.avg).toBeCloseTo(14.6666, 3);
    expect(snapshot.summary.best).toBe(20);
    expect(snapshot.summary.worst).toBe(10);
    expect(snapshot.summary.sessionsTotal).toBe(3);
    expect(snapshot.summary.usersTotal).toBe(2);
    expect(snapshot.byUser[0].userId).toBe("u2");
    expect(snapshot.byUser[0].value).toBeCloseTo(20, 6);
    expect(snapshot.byUser[1].userId).toBe("u1");
    expect(snapshot.byUser[1].value).toBeCloseTo(12, 6);
  });

  it("converts accuracy to percentage scale", () => {
    const snapshot = buildModeMetricSnapshot(
      [makeSession("1", "u1", 10, 0.8, 11), makeSession("2", "u2", 12, 0.9, 13)],
      "accuracy"
    );
    expect(snapshot.summary.avg).toBeCloseTo(85, 6);
  });
});
