import type { Response } from "express";
import { isProduction } from "./env.js";

const ACCESS_TOKEN_COOKIE = "accessToken";
const REFRESH_TOKEN_COOKIE = "refreshToken";

const cookieBase = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  path: "/"
};

export function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string }
) {
  res.cookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    ...cookieBase,
    maxAge: 30 * 60 * 1000
  });
  res.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function setAccessTokenCookie(res: Response, accessToken: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...cookieBase,
    maxAge: 30 * 60 * 1000
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, cookieBase);
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieBase);
}

export function getAccessTokenFromRequest(req: {
  cookies?: Record<string, string | undefined>;
  headers: { authorization?: string };
}): string | undefined {
  if (req.cookies?.[ACCESS_TOKEN_COOKIE]) {
    return req.cookies[ACCESS_TOKEN_COOKIE];
  }

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }

  return undefined;
}

export function getRefreshTokenFromRequest(req: {
  cookies?: Record<string, string | undefined>;
  body?: { refreshToken?: string };
}): string | undefined {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] ?? req.body?.refreshToken;
}
