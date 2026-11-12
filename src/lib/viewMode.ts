import type { CurrentUser } from "./types";

/** OneSystec is looking at a client's account and nothing may be changed (as opposed to managing it, where everything may). */
export function isReadOnlyView(user: CurrentUser | null | undefined): boolean {
  return !!user?.viewingAs && !user.managing;
}
