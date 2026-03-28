import { describe, expect, it } from "vitest";
import {
  calculatePatternScore,
  generatePatternQuestion,
  generatePatternQuestions,
  levelToNumber,
  numberToLevel,
  resolvePatternDifficulty
} from "../../src/features/pattern-recognition/engine/patternGenerator";

describe("PatternGenerator", () => {
  describe("generatePatternQuestion", () => {
    it("generates a valid question for kids level", () => {
      const question = generatePatternQuestion("kids", ["color", "shape"]);

      expect(question).toBeDefined();
      expect(question.patternType).toMatch(/^(ABAB|AABB)$/);
      expect(question.sequence.length).toBeGreaterThanOrEqual(4);
      expect(question.options.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(question.correctIndex) ? question.correctIndex[0] : question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.level).toBe("kids");
    });

    it("generates a valid question for standard level", () => {
      const question = generatePatternQuestion("standard", ["color", "shape"]);

      expect(question.patternType).toMatch(/^(ABAB|AABB|PROGRESSION|CYCLE|MIRROR)$/);
      expect(question.level).toBe("standard");
    });

    it("generates a valid question for pro level", () => {
      const question = generatePatternQuestion("pro", ["color", "shape", "size"]);

      expect(question.patternType).toMatch(
        /^(ABAB|AABB|PROGRESSION|CYCLE|MIRROR|MATH_SEQUENCE|MATH_ARITHMETIC|MATH_ALTERNATING)$/
      );
      expect(question.level).toBe("pro");
    });

    it("respects an explicit pattern type", () => {
      const question = generatePatternQuestion("standard", ["color"], "visual", "ABAB");
      expect(question.patternType).toBe("ABAB");
    });

    it("always includes the correct answer inside options", () => {
      const question = generatePatternQuestion("kids", ["color"], "visual", "ABAB");
      const correctIndex = Array.isArray(question.correctIndex) ? question.correctIndex[0] : question.correctIndex;

      expect(question.options[correctIndex]).toBeDefined();
    });

    it("supports multi-gap numeric questions", () => {
      const question = generatePatternQuestion(
        "standard",
        ["color", "shape"],
        "numeric",
        "MATH_ARITHMETIC",
        { gaps: 3, multiGap: true }
      );

      expect(question.answersNeeded).toBe(3);
      expect(question.gaps).toBe(3);
      expect(Array.isArray(question.correctIndex)).toBe(true);

      const correctIndices = question.correctIndex as number[];
      expect(correctIndices).toHaveLength(3);
      correctIndices.forEach(index => {
        expect(question.options[index]).toBeDefined();
      });
    });

    it("preserves repeated correct options for multi-gap sequences", () => {
      const question = generatePatternQuestion(
        "pro",
        ["color", "shape"],
        "visual",
        "AABB",
        { gaps: 3, multiGap: true }
      );

      expect(question.answersNeeded).toBe(3);
      expect(Array.isArray(question.correctIndex)).toBe(true);
      expect((question.correctIndex as number[])).toHaveLength(3);
    });

    it("keeps learning mode on a single-gap teaching pace", () => {
      const question = generatePatternQuestion(
        "pro",
        ["color", "shape"],
        "visual",
        "CYCLE",
        { modeId: "pattern_learning", gaps: 3, multiGap: true }
      );

      expect(question.answersNeeded).toBe(1);
      expect(question.gaps).toBe(1);
    });

    it("raises gap count in progressive mode after a stable streak", () => {
      const question = generatePatternQuestion(
        "standard",
        ["color", "shape"],
        "visual",
        "ABAB",
        {
          modeId: "pattern_progressive",
          questionIndex: 4,
          adaptiveState: { streak: 2, errorCount: 0 }
        }
      );

      expect(question.answersNeeded).toBe(2);
      expect(question.gaps).toBe(2);
    });

    it("injects tougher pro-classic control questions later in the batch", () => {
      const question = generatePatternQuestion(
        "pro",
        ["color", "shape"],
        "visual",
        "ABAB",
        { modeId: "pattern_classic", questionIndex: 3 }
      );

      expect(question.answersNeeded).toBe(2);
      expect(question.gaps).toBe(2);
    });
  });

  describe("generatePatternQuestions", () => {
    it("generates the requested amount of questions", () => {
      const questions = generatePatternQuestions(10, "standard", ["color", "shape"]);

      expect(questions).toHaveLength(10);
      questions.forEach(question => {
        expect(question.id).toBeDefined();
      });
    });

    it("generates several pattern families for standard level", () => {
      const questions = generatePatternQuestions(20, "standard", ["color", "shape"]);
      const types = new Set(questions.map(question => question.patternType));

      expect(types.size).toBeGreaterThanOrEqual(3);
    });
  });

  describe("resolvePatternDifficulty", () => {
    it("keeps learning mode in foundation stage with one gap", () => {
      const profile = resolvePatternDifficulty("standard", "visual", {
        modeId: "pattern_learning",
        questionIndex: 4,
        adaptiveState: { streak: 3, errorCount: 0 }
      });

      expect(profile.stage).toBe("foundation");
      expect(profile.gaps).toBe(1);
      expect(profile.description).toContain("1");
    });

    it("gives progressive standard a challenge profile after a stable streak", () => {
      const profile = resolvePatternDifficulty("standard", "mixed", {
        modeId: "pattern_progressive",
        questionIndex: 5,
        adaptiveState: { streak: 3, errorCount: 0 }
      });

      expect(profile.stage).toBe("challenge");
      expect(profile.gaps).toBe(2);
      expect(profile.allowedTypes).toContain("MIRROR");
    });

    it("caps multi-gap pools to supported families", () => {
      const profile = resolvePatternDifficulty("pro", "visual", {
        modeId: "pattern_multi",
        gaps: 3
      });

      expect(profile.gaps).toBe(3);
      expect(profile.allowedTypes).not.toContain("PROGRESSION");
      expect(profile.allowedTypes.every(type => !type.startsWith("MATH_"))).toBe(true);
    });
  });

  describe("calculatePatternScore", () => {
    it("rewards an excellent run", () => {
      const score = calculatePatternScore({
        correctCount: 15,
        totalQuestions: 15,
        avgLevel: 2,
        streakBest: 15,
        accuracy: 1
      });

      expect(score).toBeGreaterThan(100);
    });

    it("keeps a weak run lower", () => {
      const score = calculatePatternScore({
        correctCount: 5,
        totalQuestions: 15,
        avgLevel: 1,
        streakBest: 2,
        accuracy: 0.33
      });

      expect(score).toBeLessThan(50);
    });

    it("increases score with harder average level", () => {
      const baseMetrics = {
        correctCount: 10,
        totalQuestions: 15,
        streakBest: 5,
        accuracy: 0.67
      };

      const scoreLevel1 = calculatePatternScore({ ...baseMetrics, avgLevel: 1 });
      const scoreLevel3 = calculatePatternScore({ ...baseMetrics, avgLevel: 3 });

      expect(scoreLevel3).toBeGreaterThan(scoreLevel1);
    });

    it("increases score with a stronger streak", () => {
      const baseMetrics = {
        correctCount: 10,
        totalQuestions: 15,
        avgLevel: 2,
        accuracy: 0.67
      };

      const scoreNoStreak = calculatePatternScore({ ...baseMetrics, streakBest: 0 });
      const scoreStreak = calculatePatternScore({ ...baseMetrics, streakBest: 10 });

      expect(scoreStreak).toBeGreaterThan(scoreNoStreak);
    });
  });

  describe("levelToNumber", () => {
    it("maps kids to 1", () => {
      expect(levelToNumber("kids")).toBe(1);
    });

    it("maps standard to 2", () => {
      expect(levelToNumber("standard")).toBe(2);
    });

    it("maps pro to 3", () => {
      expect(levelToNumber("pro")).toBe(3);
    });
  });

  describe("numberToLevel", () => {
    it("maps 1 to kids", () => {
      expect(numberToLevel(1)).toBe("kids");
    });

    it("maps 2 to standard", () => {
      expect(numberToLevel(2)).toBe("standard");
    });

    it("maps 3 to pro", () => {
      expect(numberToLevel(3)).toBe("pro");
    });

    it("maps values below 1 to kids", () => {
      expect(numberToLevel(0)).toBe("kids");
    });
  });
});
