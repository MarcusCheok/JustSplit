import { describe, it, expect } from "vitest";
import { toSgd } from "./currency";

describe("toSgd", () => {
  it("passes SGD amounts through unchanged, ignoring the rate", () => {
    expect(toSgd(100, "SGD", 1)).toBe(100);
    expect(toSgd(49.99, "SGD", 0.9)).toBe(49.99);
  });

  it("converts AUD amounts using the given rate", () => {
    expect(toSgd(100, "AUD", 0.9)).toBe(90);
  });

  it("rounds to 2 decimal places", () => {
    expect(toSgd(10, "AUD", 0.881)).toBe(8.81);
    expect(toSgd(33.33, "AUD", 0.9)).toBe(30);
  });
});
