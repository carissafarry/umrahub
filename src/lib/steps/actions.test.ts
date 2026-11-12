import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "@/lib/trips/fakeSupabase";
import {
  clearStepCommentVote,
  deleteStepComment,
  postStepComment,
  reportStepContent,
  voteStepComment,
} from "./actions";

const stepId = "5eed0000-0000-4000-8000-000000000001";
const commentId = "44444444-4444-4444-8444-444444444444";

let fake = fakeSupabase();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => fake.client,
}));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

describe("postStepComment", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    consoleError.mockClear();
  });

  it("rejects an invalid step id without touching the DB", async () => {
    fake = fakeSupabase();
    expect(await postStepComment("not-a-uuid", "Tips")).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it.each([
    ["   ", "empty"],
    ["a".repeat(1001), "tooLong"],
  ])("rejects invalid content without touching the DB", async (content, error) => {
    fake = fakeSupabase();
    expect(await postStepComment(stepId, content)).toEqual({ ok: false, error });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await postStepComment(stepId, "Tips")).toEqual({
      ok: false,
      error: "failed",
    });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("inserts only the step and the trimmed content, then revalidates", async () => {
    fake = fakeSupabase();
    expect(await postStepComment(stepId, "  Bawa payung  ")).toEqual({
      ok: true,
    });
    const [{ table, builder }] = fake.builders;
    expect(table).toBe("step_comments");
    expect(builder.insert).toHaveBeenCalledTimes(1);
    expect(builder.insert.mock.calls[0]).toEqual([
      { step_id: stepId, content: "Bawa payung" },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(`/steps/${stepId}`);
  });

  it("returns a fixed error and logs only the code when the insert fails", async () => {
    fake = fakeSupabase({
      tables: {
        step_comments: { data: null, error: { code: "42501", message: "rls" } },
      },
    });
    expect(await postStepComment(stepId, "Rahasia saya")).toEqual({
      ok: false,
      error: "failed",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Step comments: comment insert failed",
      "42501",
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("Rahasia");
  });
});

describe("deleteStepComment", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    consoleError.mockClear();
  });

  it.each([
    ["not-a-uuid", stepId],
    [commentId, "not-a-uuid"],
  ])("rejects invalid ids without touching the DB", async (comment, step) => {
    fake = fakeSupabase();
    expect(await deleteStepComment(comment, step)).toEqual({ ok: false });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await deleteStepComment(commentId, stepId)).toEqual({ ok: false });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("deletes filtered by id and user_id, then revalidates", async () => {
    fake = fakeSupabase();
    expect(await deleteStepComment(commentId, stepId)).toEqual({ ok: true });
    const [{ table, builder }] = fake.builders;
    expect(table).toBe("step_comments");
    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenCalledWith("id", commentId);
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(revalidatePath).toHaveBeenCalledWith(`/steps/${stepId}`);
  });

  it("returns a plain error when the delete fails", async () => {
    fake = fakeSupabase({
      tables: { step_comments: { data: null, error: { code: "XX000" } } },
    });
    expect(await deleteStepComment(commentId, stepId)).toEqual({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Step comments: comment delete failed",
      "XX000",
    );
  });
});

describe("voteStepComment", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    consoleError.mockClear();
  });

  it.each([
    ["not-a-uuid", stepId, 1],
    [commentId, "not-a-uuid", 1],
    [commentId, stepId, 0],
    [commentId, stepId, 2],
  ])("rejects invalid input without touching the DB", async (comment, step, value) => {
    fake = fakeSupabase();
    expect(await voteStepComment(comment, step, value as 1 | -1)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await voteStepComment(commentId, stepId, 1)).toEqual({
      ok: false,
      error: "failed",
    });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([1, -1] as const)(
    "upserts only the comment and the value %i, then revalidates",
    async (value) => {
      fake = fakeSupabase();
      expect(await voteStepComment(commentId, stepId, value)).toEqual({
        ok: true,
      });
      const [{ table, builder }] = fake.builders;
      expect(table).toBe("step_comment_votes");
      expect(builder.upsert).toHaveBeenCalledTimes(1);
      expect(builder.upsert.mock.calls[0]).toEqual([
        { comment_id: commentId, value },
        { onConflict: "comment_id,user_id" },
      ]);
      expect(revalidatePath).toHaveBeenCalledWith(`/steps/${stepId}`);
    },
  );

  it("returns a fixed error and logs only the code when the upsert fails", async () => {
    fake = fakeSupabase({
      tables: {
        step_comment_votes: { data: null, error: { code: "42501", message: "rls" } },
      },
    });
    expect(await voteStepComment(commentId, stepId, 1)).toEqual({
      ok: false,
      error: "failed",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Step comments: comment vote failed",
      "42501",
    );
  });
});

describe("clearStepCommentVote", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    consoleError.mockClear();
  });

  it.each([
    ["not-a-uuid", stepId],
    [commentId, "not-a-uuid"],
  ])("rejects invalid ids without touching the DB", async (comment, step) => {
    fake = fakeSupabase();
    expect(await clearStepCommentVote(comment, step)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await clearStepCommentVote(commentId, stepId)).toEqual({
      ok: false,
      error: "failed",
    });
    expect(fake.from).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("deletes filtered by comment_id and user_id, then revalidates", async () => {
    fake = fakeSupabase();
    expect(await clearStepCommentVote(commentId, stepId)).toEqual({ ok: true });
    const [{ table, builder }] = fake.builders;
    expect(table).toBe("step_comment_votes");
    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(builder.eq.mock.calls).toEqual([
      ["comment_id", commentId],
      ["user_id", "user-1"],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith(`/steps/${stepId}`);
  });

  it("returns a fixed error and logs only the code when the delete fails", async () => {
    fake = fakeSupabase({
      tables: { step_comment_votes: { data: null, error: { code: "XX000" } } },
    });
    expect(await clearStepCommentVote(commentId, stepId)).toEqual({
      ok: false,
      error: "failed",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "Step comments: comment vote clear failed",
      "XX000",
    );
  });
});

describe("reportStepContent", () => {
  beforeEach(() => {
    revalidatePath.mockClear();
    consoleError.mockClear();
  });

  it("rejects an invalid step id without touching the DB", async () => {
    fake = fakeSupabase();
    expect(await reportStepContent("not-a-uuid", "Usang")).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it.each([
    ["   ", "empty"],
    ["a".repeat(501), "tooLong"],
  ])("rejects an invalid reason without touching the DB", async (reason, error) => {
    fake = fakeSupabase();
    expect(await reportStepContent(stepId, reason)).toEqual({ ok: false, error });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("rejects a signed-out user without writing", async () => {
    fake = fakeSupabase({ user: null });
    expect(await reportStepContent(stepId, "Usang")).toEqual({
      ok: false,
      error: "failed",
    });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("inserts only the step and the trimmed reason", async () => {
    fake = fakeSupabase();
    expect(await reportStepContent(stepId, "  Biaya sudah naik  ")).toEqual({
      ok: true,
    });
    const [{ table, builder }] = fake.builders;
    expect(table).toBe("content_flags");
    expect(builder.insert).toHaveBeenCalledTimes(1);
    expect(builder.insert.mock.calls[0]).toEqual([
      { step_id: stepId, reason: "Biaya sudah naik" },
    ]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns a fixed error and logs only the code when the insert fails", async () => {
    fake = fakeSupabase({
      tables: {
        content_flags: { data: null, error: { code: "42501", message: "rls" } },
      },
    });
    expect(await reportStepContent(stepId, "Rahasia saya")).toEqual({
      ok: false,
      error: "failed",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "Step comments: content flag insert failed",
      "42501",
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("Rahasia");
  });
});
