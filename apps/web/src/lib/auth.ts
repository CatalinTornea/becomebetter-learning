import { apiFetch, apiJson } from "./api";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "STUDENT" | "COACH" | "ADMIN";
};

const USER_STORAGE_KEY = "user";

export function cacheUser(user: AuthUser) {
  sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function getCachedUser(): AuthUser | null {
  const stored = sessionStorage.getItem(USER_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    sessionStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function clearCachedUser() {
  sessionStorage.removeItem(USER_STORAGE_KEY);
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await apiFetch("/auth/me");

  if (response.status === 401) {
    clearCachedUser();
    return null;
  }

  if (!response.ok) {
    throw new Error("Could not load current user");
  }

  const payload = (await response.json()) as { user: AuthUser };
  cacheUser(payload.user);
  return payload.user;
}

export async function logout(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
  clearCachedUser();
}

export function notifyAuthChanged() {
  window.dispatchEvent(new Event("auth-changed"));
}
