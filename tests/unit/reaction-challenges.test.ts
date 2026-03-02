import { describe, expect, it } from "vitest";
import { buildReactionChallenge } from "../../src/features/reaction/challenges";

describe("reaction challenges", () => {
  it("returns null challenge for signal mode", () => {
    expect(buildReactionChallenge("signal")).toBeNull();
  });

  it("builds stroop challenge with exactly one correct option", () => {
    const challenge = buildReactionChallenge("stroop_match");
    expect(challenge).not.toBeNull();
    expect(challenge?.options).toHaveLength(4);
    expect(challenge?.prompt).toContain("цвет текста");

    const correct = challenge?.options.filter((option) => option.isCorrect) ?? [];
    expect(correct).toHaveLength(1);
  });

  it("builds pair challenge with exactly one correct option", () => {
    const challenge = buildReactionChallenge("pair_match");
    expect(challenge).not.toBeNull();
    expect(challenge?.options).toHaveLength(4);
    expect(challenge?.prompt).toContain("Найдите пару");

    const correct = challenge?.options.filter((option) => option.isCorrect) ?? [];
    expect(correct).toHaveLength(1);
    expect(correct[0]?.secondaryLabel).toBeTruthy();
  });

  it("builds number challenge with exactly one correct option", () => {
    const challenge = buildReactionChallenge("number_match");
    expect(challenge).not.toBeNull();
    expect(challenge?.options).toHaveLength(4);
    expect(challenge?.prompt).toContain("Найдите число");

    const correct = challenge?.options.filter((option) => option.isCorrect) ?? [];
    expect(correct).toHaveLength(1);
  });
});
