import { describe, expect, it } from "vitest";

import { validateConsultationInput } from "./validation";

const now = new Date("2030-01-01T00:00:00Z").getTime();

describe("validateConsultationInput", () => {
  it("accepts valid input and trims the text fields", () => {
    const result = validateConsultationInput(
      {
        first_name: "  Ada ",
        last_name: " Lovelace  ",
        reason: "  annual checkup ",
        scheduled_at: "2030-01-02T10:00:00Z",
      },
      now,
    );

    expect(result).toEqual({
      ok: true,
      value: {
        firstName: "Ada",
        lastName: "Lovelace",
        reason: "annual checkup",
        scheduledAt: "2030-01-02T10:00:00Z",
      },
    });
  });

  it("rejects a scheduled_at in the past", () => {
    const result = validateConsultationInput(
      {
        first_name: "Ada",
        last_name: "Lovelace",
        reason: "checkup",
        scheduled_at: "2029-12-31T23:59:59Z",
      },
      now,
    );

    expect(result).toEqual({
      ok: false,
      error: "scheduled_at must be in the future",
    });
  });

  it("rejects blank required fields", () => {
    const result = validateConsultationInput(
      {
        first_name: "   ",
        last_name: "Lovelace",
        reason: "checkup",
        scheduled_at: "2030-01-02T10:00:00Z",
      },
      now,
    );

    expect(result).toEqual({
      ok: false,
      error: "first_name, last_name and reason are required",
    });
  });
});
