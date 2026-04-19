import { describe, it, expect, beforeEach, afterEach } from "vitest";

// We re-import validateEnv each test by resetting module cache via inline fn
// so we can control process.env cleanly.
import { validateEnv } from "../src/lib/validate-env";

// All env vars that validateEnv reads — always saved and restored so
// .env.local values (loaded by tests/setup.ts) don't leak between tests.
const VALIDATE_ENV_KEYS = [
  "NODE_ENV", "NEXT_PHASE", "DATABASE_URL", "POSTGRES_URL",
  "NEXTAUTH_SECRET", "NEXTAUTH_URL", "STORAGE_PROVIDER",
  "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY",
  "S3_PUBLIC_URL", "S3_ENDPOINT", "BLOB_READ_WRITE_TOKEN", "AI_ENCRYPTION_KEY",
  "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET",
];

// Helper: run validateEnv with a fully controlled env, capturing console output
function runWithEnv(
  env: Record<string, string | undefined>,
  fn: () => void
) {
  const original: Record<string, string | undefined> = {};
  // Save and clear ALL known keys first so nothing leaks from .env.local
  for (const k of VALIDATE_ENV_KEYS) {
    original[k] = process.env[k];
    delete process.env[k];
  }
  // Apply only what this test wants
  for (const [k, v] of Object.entries(env)) {
    if (v !== undefined) process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const k of VALIDATE_ENV_KEYS) {
      if (original[k] === undefined) delete process.env[k];
      else process.env[k] = original[k];
    }
  }
}

describe("validateEnv", () => {
  const warns: string[] = [];
  const errors: string[] = [];
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warns.length = 0;
    errors.length = 0;
    warnSpy = vi.spyOn(console, "warn").mockImplementation((msg: string) => warns.push(msg));
    errorSpy = vi.spyOn(console, "error").mockImplementation((msg: string) => errors.push(msg));
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("skips validation during next build phase", () => {
    runWithEnv({ NEXT_PHASE: "phase-production-build", DATABASE_URL: undefined, POSTGRES_URL: undefined }, () => {
      expect(() => validateEnv()).not.toThrow();
    });
  });

  it("throws in production when DATABASE_URL is missing", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: undefined,
      POSTGRES_URL: undefined,
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(32),
      AI_ENCRYPTION_KEY: "a".repeat(64),
    }, () => {
      expect(() => validateEnv()).toThrow("DATABASE_URL");
    });
  });

  it("errors in dev (logs, no throw) when DATABASE_URL is missing", () => {
    runWithEnv({
      NODE_ENV: "development",
      DATABASE_URL: undefined,
      POSTGRES_URL: undefined,
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(32),
      AI_ENCRYPTION_KEY: "a".repeat(64),
    }, () => {
      expect(() => validateEnv()).not.toThrow();
      expect(errors.some(e => e.includes("DATABASE_URL"))).toBe(true);
    });
  });

  it("accepts POSTGRES_URL as a DATABASE_URL substitute", () => {
    runWithEnv({
      NODE_ENV: "development",
      DATABASE_URL: undefined,
      POSTGRES_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(32),
      AI_ENCRYPTION_KEY: "a".repeat(64),
    }, () => {
      expect(() => validateEnv()).not.toThrow();
      expect(errors.some(e => e.includes("DATABASE_URL"))).toBe(false);
    });
  });

  it("warns (does not throw) when NEXTAUTH_SECRET is missing", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: undefined,
      AI_ENCRYPTION_KEY: "a".repeat(64),
    }, () => {
      expect(() => validateEnv()).not.toThrow();
      expect(warns.some(w => w.includes("NEXTAUTH_SECRET"))).toBe(true);
    });
  });

  it("warns (does not throw) when NEXTAUTH_SECRET is too short", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "tooshort",
      AI_ENCRYPTION_KEY: "a".repeat(64),
    }, () => {
      expect(() => validateEnv()).not.toThrow();
      expect(warns.some(w => w.includes("NEXTAUTH_SECRET"))).toBe(true);
    });
  });

  it("warns (does not throw) when AI_ENCRYPTION_KEY is missing in production", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(32),
      AI_ENCRYPTION_KEY: undefined,
    }, () => {
      expect(() => validateEnv()).not.toThrow();
      expect(warns.some(w => w.includes("AI_ENCRYPTION_KEY"))).toBe(true);
    });
  });

  it("warns (does not throw) when AI_ENCRYPTION_KEY is wrong length", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(32),
      AI_ENCRYPTION_KEY: "tooshort",
    }, () => {
      expect(() => validateEnv()).not.toThrow();
      expect(warns.some(w => w.includes("AI_ENCRYPTION_KEY"))).toBe(true);
    });
  });

  it("warns (does not throw) when NEXTAUTH_URL is missing", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(32),
      AI_ENCRYPTION_KEY: "a".repeat(64),
      NEXTAUTH_URL: undefined,
    }, () => {
      expect(() => validateEnv()).not.toThrow();
      expect(warns.some(w => w.includes("NEXTAUTH_URL"))).toBe(true);
    });
  });

  it("errors when NEXTAUTH_URL is a localhost address in production", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(32),
      AI_ENCRYPTION_KEY: "a".repeat(64),
      NEXTAUTH_URL: "http://localhost:3000",
    }, () => {
      expect(() => validateEnv()).toThrow("localhost");
    });
  });

  it("passes cleanly with all required vars set correctly", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(44), // valid base64 length > 32
      AI_ENCRYPTION_KEY: "a".repeat(64),
      NEXTAUTH_URL: "https://example.com",
    }, () => {
      expect(() => validateEnv()).not.toThrow();
    });
  });

  it("errors in production when STORAGE_PROVIDER=s3 but S3 vars missing", () => {
    runWithEnv({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://localhost/test",
      NEXT_PHASE: undefined,
      NEXTAUTH_SECRET: "a".repeat(32),
      AI_ENCRYPTION_KEY: "a".repeat(64),
      NEXTAUTH_URL: "https://example.com",
      STORAGE_PROVIDER: "s3",
      S3_BUCKET: undefined,
      S3_REGION: undefined,
      S3_ACCESS_KEY_ID: undefined,
      S3_SECRET_ACCESS_KEY: undefined,
    }, () => {
      expect(() => validateEnv()).toThrow("S3_BUCKET");
    });
  });
});
