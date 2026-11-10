import { describe, expect, it } from "vitest";
import {
  endDateLabel,
  formatDate,
  nextOccurrence,
  relativeDate,
} from "./dates";

describe("recurring dates", () => {
  const now = new Date(2026, 10, 10, 12, 0, 0); // 10 Nov 2026

  it("keeps a future non-recurring date as-is", () => {
    expect(nextOccurrence("2026-12-25", "none", now)).toBe("2026-12-25");
  });

  it("rolls a yearly date into the current year", () => {
    expect(nextOccurrence("2020-12-25", "yearly", now)).toBe("2026-12-25");
  });

  it("rolls a weekly date to the next future occurrence", () => {
    expect(nextOccurrence("2026-11-01", "weekly", now)).toBe("2026-11-15");
  });

  it("clamps monthly recurrence to the end of short months", () => {
    expect(nextOccurrence("2026-01-31", "monthly", new Date(2026, 1, 1))).toBe("2026-02-28");
  });

  it("formats relative time", () => {
    expect(relativeDate("2026-11-10", now)).toBe("today");
    expect(relativeDate("2026-11-11", now)).toBe("tomorrow");
    expect(relativeDate("2026-11-25", now)).toBe("in 2 weeks");
    expect(relativeDate("2026-11-01", now)).toBe("9 days ago");
  });

  it("builds a display label", () => {
    const label = endDateLabel("2026-12-25", "yearly", now);
    expect(label?.date).toBe("25 Dec");
    expect(label?.relative).toBe("in 6 weeks");
    expect(label?.recurrence).toBe("yearly");
  });

  it("formats full dates with a year when needed", () => {
    expect(formatDate("2099-01-02")).toBe("2 Jan 2099");
  });
});
