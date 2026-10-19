import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

const notificationId = "33333333-3333-4333-8333-333333333333";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

function updates() {
  return fake.builders.flatMap(({ builder }) => builder.update.mock.calls);
}

function expectReadPayload() {
  expect(updates()).toHaveLength(1);
  const [payload] = updates()[0] as [Record<string, unknown>];
  expect(payload.is_read).toBe(true);
  expect(Number.isNaN(Date.parse(payload.read_at as string))).toBe(false);
}

describe("markNotificationRead", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
  });

  it("rejects an invalid id without touching the DB", async () => {
    fake = fakeSupabase();
    expect(await markNotificationRead("not-a-uuid")).toEqual({ ok: false });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await markNotificationRead(notificationId)).toEqual({ ok: false });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a plain error when the update fails", async () => {
    fake = fakeSupabase({
      tables: { notifications: { data: null, error: { message: "db" } } },
    });
    expect(await markNotificationRead(notificationId)).toEqual({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("marks the user's own notification read and revalidates", async () => {
    fake = fakeSupabase();
    expect(await markNotificationRead(notificationId)).toEqual({ ok: true });

    expectReadPayload();
    const [{ table, builder }] = fake.builders;
    expect(table).toBe("notifications");
    expect(builder.eq).toHaveBeenCalledWith("id", notificationId);
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("markAllNotificationsRead", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await markAllNotificationsRead()).toEqual({ ok: false });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a plain error when the update fails", async () => {
    fake = fakeSupabase({
      tables: { notifications: { data: null, error: { message: "db" } } },
    });
    expect(await markAllNotificationsRead()).toEqual({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("marks all the user's unread notifications read and revalidates", async () => {
    fake = fakeSupabase();
    expect(await markAllNotificationsRead()).toEqual({ ok: true });

    expectReadPayload();
    const [{ table, builder }] = fake.builders;
    expect(table).toBe("notifications");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.eq).toHaveBeenCalledWith("is_read", false);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
