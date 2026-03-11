import { describe, expect, it } from "vitest";
import {
  buildSpatialMemoryProgression,
  buildSpatialPattern,
  buildSpatialResultSummary,
  buildSpatialRoundInsight,
  getSpatialLevelConfig
} from "../../src/features/spatial-memory/spatialMemoryEngine";
import type { Session } from "../../src/shared/types/domain";

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: overrides.id ?? "s1",
    userId: "u1",
    taskId: "spatial_memory",
    mode: "spatial_memory",
    moduleId: "spatial_memory",
    modeId: "spatial_memory_classic",
    level: overrides.level ?? 2,
    presetId: "easy",
    adaptiveSource: overrides.adaptiveSource ?? "auto",
    timestamp: overrides.timestamp ?? "2026-03-10T10:00:00.000Z",
    localDate: overrides.localDate ?? "2026-03-10",
    durationMs: overrides.durationMs ?? 12_000,
    score: overrides.score ?? 110,
    accuracy: overrides.accuracy ?? 0.72,
    speed: overrides.speed ?? 10,
    errors: overrides.errors ?? 2,
    correctCount: overrides.correctCount ?? 3,
    trialsTotal: overrides.trialsTotal ?? 4,
    difficulty: overrides.difficulty ?? {
      gridSize: 4,
      numbersCount: 16,
      mode: "spatial_memory"
    }
  };
}

describe("spatialMemoryEngine", () => {
  it("starts new users from the easy baseline", () => {
    const progression = buildSpatialMemoryProgression([]);

    expect(progression.recommendedDifficulty).toBe("easy");
    expect(progression.recommendedLevel).toBe(1);
  });

  it("raises the recommended level after stable recent rounds", () => {
    const sessions = [
      makeSession({ id: "s1", level: 2, accuracy: 0.9, errors: 1, score: 124 }),
      makeSession({
        id: "s2",
        level: 2,
        accuracy: 0.92,
        errors: 0,
        score: 132,
        timestamp: "2026-03-10T11:00:00.000Z",
        localDate: "2026-03-10"
      }),
      makeSession({
        id: "s3",
        level: 2,
        accuracy: 0.91,
        errors: 1,
        score: 128,
        timestamp: "2026-03-10T12:00:00.000Z",
        localDate: "2026-03-10"
      })
    ];

    const progression = buildSpatialMemoryProgression(sessions);

    expect(progression.recommendedLevel).toBe(3);
    expect(progression.recommendedDifficulty).toBe("easy");
  });

  it("builds valid spatial patterns for a level config", () => {
    const config = getSpatialLevelConfig(5);
    const pattern = buildSpatialPattern(config);

    expect(pattern.cells).toHaveLength(config.targets);
    expect(new Set(pattern.cells).size).toBe(config.targets);
    expect(pattern.family).toBeDefined();
    expect(config.families).toContain(pattern.family);
    expect(pattern.gridSize).toBe(config.gridSize);
    expect(Math.max(...pattern.cells)).toBeLessThan(config.gridSize * config.gridSize);
  });

  it("escalates board size on higher trainer levels", () => {
    expect(getSpatialLevelConfig(1).gridSize).toBe(4);
    expect(getSpatialLevelConfig(5).gridSize).toBe(5);
    expect(getSpatialLevelConfig(10).gridSize).toBe(6);
    expect(getSpatialLevelConfig(10).targets).toBeGreaterThan(getSpatialLevelConfig(7).targets);
    expect(getSpatialLevelConfig(10).families).toContain("weave");
    expect(getSpatialLevelConfig(10).families).not.toContain("band");
  });

  it("penalizes extra guesses in accuracy when the player overclicks", () => {
    const result = buildSpatialResultSummary(new Set<number>([0, 1, 2, 9, 10]), [0, 1, 2], 3);

    expect(result.hits).toBe(3);
    expect(result.falseHits).toBe(2);
    expect(result.accuracy).toBeCloseTo(0.6, 5);
  });

  it("detects overguessing when false hits exceed misses", () => {
    const picked = new Set<number>([0, 1, 2, 14, 15]);
    const result = buildSpatialResultSummary(picked, [0, 1, 2], 3);
    const insight = buildSpatialRoundInsight(result, {
      ...buildSpatialPattern(getSpatialLevelConfig(4)),
      family: "band",
      gridSize: 5,
      familyLabel: "Полоса",
      structureLabel: "ряд или колонка",
      coachingHint: "",
      recallHint: "",
      resultHint: "",
      cells: [0, 1, 2]
    });

    expect(insight.diagnosticLabel).toBe("Лишние догадки");
  });
  it("detects broken rhythm for weave patterns", () => {
    const result = buildSpatialResultSummary(new Set<number>([0, 2, 6, 7]), [0, 2, 6, 8, 12, 14], 4);
    const insight = buildSpatialRoundInsight(result, {
      ...buildSpatialPattern(getSpatialLevelConfig(9)),
      family: "weave",
      gridSize: 6,
      familyLabel: "Плетение",
      structureLabel: "чередующиеся линии",
      coachingHint: "",
      recallHint: "",
      resultHint: "",
      cells: [0, 2, 6, 8, 12, 14]
    });

    expect(insight.diagnosticLabel).toBe("Сбитый ритм");
  });

  it("detects a lost remote anchor on split patterns", () => {
    const result = buildSpatialResultSummary(new Set<number>([0, 1, 5]), [0, 1, 5, 23], 4);
    const insight = buildSpatialRoundInsight(result, {
      ...buildSpatialPattern(getSpatialLevelConfig(8)),
      family: "split",
      gridSize: 6,
      familyLabel: "Разнос",
      structureLabel: "кластер и спутник",
      coachingHint: "",
      recallHint: "",
      resultHint: "",
      cells: [0, 1, 5, 23]
    });

    expect(insight.diagnosticLabel).toBe("Потеря дальней опоры");
  });
});
