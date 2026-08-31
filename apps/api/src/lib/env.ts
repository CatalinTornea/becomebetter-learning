const DEV_JWT_SECRET = "dev-secret-not-for-production";
const DEV_JWT_REFRESH_SECRET = "dev-refresh-secret-not-for-production";
const MIN_SECRET_LENGTH = 32;

export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

function resolveSecret(name: string, value: string | undefined, devFallback: string): string {
  if (value && value.length >= MIN_SECRET_LENGTH) {
    return value;
  }

  if (isProduction) {
    throw new Error(
      `${name} must be set to at least ${MIN_SECRET_LENGTH} characters in production`
    );
  }

  if (value) {
    console.warn(
      `[env] ${name} is shorter than ${MIN_SECRET_LENGTH} characters; use a longer value before deploying`
    );
    return value;
  }

  if (!isTest) {
    console.warn(`[env] ${name} is not set; using development fallback`);
  }

  return devFallback;
}

export const JWT_SECRET = resolveSecret("JWT_SECRET", process.env.JWT_SECRET, DEV_JWT_SECRET);
export const JWT_REFRESH_SECRET = resolveSecret(
  "JWT_REFRESH_SECRET",
  process.env.JWT_REFRESH_SECRET,
  DEV_JWT_REFRESH_SECRET
);

export function getFrontendOrigins(): string[] {
  const configured = process.env.FRONTEND_URL?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length) {
    return configured;
  }

  return ["http://localhost:3000"];
}
