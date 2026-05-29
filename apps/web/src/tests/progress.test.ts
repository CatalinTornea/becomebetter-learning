import { describe, expect, it } from "vitest";
import { calculateCompletion } from "../lib/progress";

describe("calculateCompletion", () => {
  it("returns zero for invalid totals", () => {
    expect(calculateCompletion(2, 0)).toBe(0);
  });

  it("computes rounded percentage", () => {
    expect(calculateCompletion(3, 5)).toBe(60);
  });
});
