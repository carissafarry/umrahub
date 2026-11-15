import { describe, expect, it } from "vitest";
import {
  nextStatus,
  parseSeats,
  participationStatuses,
  type OptionResponse,
  type ParticipationAction,
  type ParticipationStatus,
} from "./transitions";

const none = null;
type Expected = Record<ParticipationStatus | "none", ParticipationStatus | null>;

// Every action × every status ("none" is no row yet).
const matrix: [ParticipationAction, OptionResponse | undefined, Expected][] = [
  [
    "expressInterest",
    undefined,
    {
      none: "interested",
      interested: none,
      fix: none,
      awaiting_payment: none,
      paid_claimed: none,
      confirmed: none,
      declined: none,
      lapsed: none,
      cancelled: "interested",
    },
  ],
  [
    "setSeats",
    undefined,
    {
      none: none,
      interested: "interested",
      fix: "fix",
      awaiting_payment: none,
      paid_claimed: none,
      confirmed: none,
      declined: none,
      lapsed: none,
      cancelled: none,
    },
  ],
  [
    "confirmAttendance",
    undefined,
    {
      none: none,
      interested: "fix",
      fix: none,
      awaiting_payment: none,
      paid_claimed: none,
      confirmed: none,
      declined: none,
      lapsed: none,
      cancelled: none,
    },
  ],
  [
    "respondToOption",
    "accept",
    {
      none: none,
      interested: none,
      fix: "fix",
      awaiting_payment: none,
      paid_claimed: none,
      confirmed: none,
      declined: none,
      lapsed: none,
      cancelled: none,
    },
  ],
  [
    "respondToOption",
    "decline",
    {
      none: none,
      interested: none,
      fix: "declined",
      awaiting_payment: none,
      paid_claimed: none,
      confirmed: none,
      declined: none,
      lapsed: none,
      cancelled: none,
    },
  ],
  [
    "cancelInterest",
    undefined,
    {
      none: none,
      interested: "cancelled",
      fix: "cancelled",
      awaiting_payment: "cancelled",
      paid_claimed: none,
      confirmed: none,
      declined: none,
      lapsed: none,
      cancelled: none,
    },
  ],
];

describe("nextStatus", () => {
  it.each(matrix)("%s %s covers every status", (action, input, expected) => {
    for (const status of participationStatuses) {
      expect(nextStatus(action, status, input), `${action} from ${status}`).toBe(
        expected[status],
      );
    }
    expect(nextStatus(action, null, input)).toBe(expected.none);
  });

  it("refuses respondToOption without a valid response", () => {
    expect(nextStatus("respondToOption", "fix")).toBeNull();
    expect(
      nextStatus("respondToOption", "fix", "maybe" as unknown as "accept"),
    ).toBeNull();
  });

  it("never lets a user reach awaiting_payment, confirmed or lapsed", () => {
    const forbidden = ["awaiting_payment", "confirmed", "lapsed"];
    for (const [action, input] of matrix) {
      for (const status of [...participationStatuses, null]) {
        expect(forbidden).not.toContain(nextStatus(action, status, input));
      }
    }
  });
});

describe("parseSeats", () => {
  it.each([1, 2, 10])("accepts %s", (value) => {
    expect(parseSeats(value)).toEqual({ ok: true, seats: value });
  });

  it.each([0, 11, 2.5, "3", NaN, -1, Infinity, null, undefined])(
    "rejects %s",
    (value) => {
      expect(parseSeats(value)).toEqual({ ok: false });
    },
  );
});
