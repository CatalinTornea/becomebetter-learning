const getFallbackApiUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://becomebetter-learning.onrender.com";
  }
  return "http://localhost:4000";
};

export const API_URL = process.env.NEXT_PUBLIC_API_URL || getFallbackApiUrl();

function requestSignal(timeoutMs: number, externalSignal?: AbortSignal | null) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  return { signal: controller.signal, clear: () => window.clearTimeout(timeoutId) };
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const { signal, clear } = requestSignal(20000, options.signal);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: "include",
      headers,
      signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Serverul local nu a răspuns. Verifică dacă API-ul rulează și încearcă din nou.");
    }
    throw error;
  } finally {
    clear();
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiFetch(path);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message)
        : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}
