import type { User } from "@supabase/supabase-js";

export type UserProfile = {
  name: string;
  avatarUrl: string | null;
};

// Google fills `full_name`/`name` and `avatar_url`/`picture` in user_metadata.
export function getUserProfile(
  user: Pick<User, "email" | "user_metadata">,
): UserProfile {
  const meta = user.user_metadata ?? {};
  return {
    name: meta.full_name ?? meta.name ?? user.email ?? "",
    avatarUrl: meta.avatar_url ?? meta.picture ?? null,
  };
}
