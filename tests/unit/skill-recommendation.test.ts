import { describe, expect, it } from "vitest";
import {
  generateSkillRecommendations,
  getTop3Recommendations,
  getRecommendationsForSkill,
  getRecommendedFrequency,
  getModulesForSkill
} from "../../src/shared/lib/progress/skillRecommendationService";
import type { SkillProfileId } from "../../src/shared/types/domain";

describe("skillRecommendationService", () => {
  describe("getModulesForSkill", () => {
    it("returns correct modules for attention", () => {
      const modules = getModulesForSkill("attention");
      expect(modules).toContain("schulte");
    });

    it("returns correct modules for memory", () => {
      const modules = getModulesForSkill("memory");
      expect(modules).toContain("memory_grid");
      expect(modules).toContain("memory_match");
      expect(modules).toContain("n_back");
    });

    it("returns correct modules for reaction", () => {
      const modules = getModulesForSkill("reaction");
      expect(modules).toContain("reaction");
      expect(modules).toContain("sprint_math");
    });

    it("returns correct modules for math", () => {
      const modules = getModulesForSkill("math");
      expect(modules).toContain("sprint_math");
    });

    it("returns correct modules for logic", () => {
      const modules = getModulesForSkill("logic");
      expect(modules).toContain("decision_rush");
      expect(modules).toContain("pattern_recognition");
    });
  });

  describe("getRecommendedFrequency", () => {
    it("returns higher frequency for weak skills", () => {
      const freq = getRecommendedFrequency("attention", 30);
      expect(freq).toBeGreaterThanOrEqual(4);
    });

    it("returns medium frequency for medium skills", () => {
      const freq = getRecommendedFrequency("memory", 55);
      expect(freq).toBeGreaterThanOrEqual(3);
      expect(freq).toBeLessThanOrEqual(5);
    });

    it("returns lower frequency for strong skills", () => {
      const freq = getRecommendedFrequency("logic", 80);
      expect(freq).toBeLessThanOrEqual(3);
    });
  });

  describe("getRecommendationsForSkill", () => {
    it("returns weak recommendation for low score", () => {
      const rec = getRecommendationsForSkill("math", 25);
      expect(rec.level).toBe("weak");
      expect(rec.skillId).toBe("math");
      expect(rec.title).toBe("Базовый счёт");
      expect(rec.description).toContain("устных вычислениях");
    });

    it("returns medium recommendation for medium score", () => {
      const rec = getRecommendationsForSkill("reaction", 55);
      expect(rec.level).toBe("medium");
      expect(rec.skillId).toBe("reaction");
    });

    it("returns strong recommendation for high score", () => {
      const rec = getRecommendationsForSkill("attention", 85);
      expect(rec.level).toBe("strong");
      expect(rec.skillId).toBe("attention");
    });

    it("includes training modules in recommendation", () => {
      const rec = getRecommendationsForSkill("logic", 50);
      expect(rec.trainingModules.length).toBeGreaterThan(0);
      expect(rec.description).toBeDefined();
    });
  });

  describe("generateSkillRecommendations", () => {
    it("generates recommendations for all skills", () => {
      const skillScores: Record<SkillProfileId, number> = {
        attention: 60,
        memory: 45,
        reaction: 75,
        math: 50,
        logic: 40
      };

      const recommendations = generateSkillRecommendations(skillScores);

      expect(recommendations.length).toBe(5);
      expect(recommendations[0].priority).toBe(1);
    });

    it("prioritizes weaker skills first", () => {
      const skillScores: Record<SkillProfileId, number> = {
        attention: 90,
        memory: 30,
        reaction: 70,
        math: 50,
        logic: 45
      };

      const recommendations = generateSkillRecommendations(skillScores);

      expect(recommendations[0].skillId).toBe("memory");
      expect(recommendations[0].level).toBe("weak");
    });

    it("sorts recommendations by priority", () => {
      const skillScores: Record<SkillProfileId, number> = {
        attention: 50,
        memory: 40,
        reaction: 60,
        math: 35,
        logic: 55
      };

      const recommendations = generateSkillRecommendations(skillScores);

      for (let i = 0; i < recommendations.length - 1; i++) {
        expect(recommendations[i].priority).toBeLessThanOrEqual(recommendations[i + 1].priority);
      }
    });
  });

  describe("getTop3Recommendations", () => {
    it("returns only top 3 recommendations", () => {
      const skillScores: Record<SkillProfileId, number> = {
        attention: 60,
        memory: 45,
        reaction: 75,
        math: 50,
        logic: 40
      };

      const top3 = getTop3Recommendations(skillScores);

      expect(top3.length).toBe(3);
      expect(top3[0].priority).toBe(1);
      expect(top3[1].priority).toBe(2);
      expect(top3[2].priority).toBe(3);
    });

    it("returns weakest skills in top 3", () => {
      const skillScores: Record<SkillProfileId, number> = {
        attention: 90,
        memory: 25,
        reaction: 80,
        math: 30,
        logic: 35
      };

      const top3 = getTop3Recommendations(skillScores);

      const top3SkillIds = top3.map((recommendation) => recommendation.skillId);
      expect(top3SkillIds).toContain("memory");
      expect(top3SkillIds).toContain("math");
      expect(top3SkillIds).toContain("logic");
    });
  });
});