import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL, apiFetch, apiJson } from "../lib/api";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("window", { setTimeout, clearTimeout });
});

afterEach(() => vi.unstubAllGlobals());

describe("session renewal", () => {
  it("renews an expired session and retries saving with the same data", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(Response.json({ id: "saved-project" }));

    const body = JSON.stringify({ name: "Project", state: { goal: "Improve" } });
    expect(await apiJson("/practice-projects", { method: "POST", body })).toEqual({ id: "saved-project" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1]).toEqual([
      `${API_URL}/auth/refresh`,
      expect.objectContaining({ method: "POST", credentials: "include" })
    ]);
    for (const index of [0, 2]) {
      expect(fetchMock.mock.calls[index]).toEqual([
        `${API_URL}/practice-projects`,
        expect.objectContaining({ method: "POST", body, credentials: "include" })
      ]);
    }
  });

  it("shares renewal between concurrent requests including the current-user check", async () => {
    let completeRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => { completeRefresh = resolve; });
    let attempts = 0;
    fetchMock.mockImplementation(async (url) => {
      if (url === `${API_URL}/auth/refresh`) return refreshResponse;
      attempts += 1;
      return new Response(null, { status: attempts <= 2 ? 401 : 200 });
    });

    const requests = [apiFetch("/auth/me"), apiFetch("/practice-projects")];
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    completeRefresh(new Response(null, { status: 200 }));
    expect((await Promise.all(requests)).map((response) => response.status)).toEqual([200, 200]);
    expect(fetchMock.mock.calls.filter(([url]) => url === `${API_URL}/auth/refresh`)).toHaveLength(1);
  });

  it("reports an expired session without retrying a save if renewal is refused", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ message: "Missing token" }, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    await expect(apiJson("/practice-projects", { method: "POST" })).rejects.toThrow("Sesiunea a expirat");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not loop if the retried request is still unauthorized", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));
    expect((await apiFetch("/practice-projects")).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not renew for invalid login credentials", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: "Invalid credentials" }, { status: 401 }));
    await expect(apiJson("/auth/login", { method: "POST" })).rejects.toThrow("Invalid credentials");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
