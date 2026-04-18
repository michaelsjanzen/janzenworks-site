import type { StorageProvider } from "./types";

export type { StorageProvider, UploadResult } from "./types";

/**
 * getStorage()
 *
 * Returns the active StorageProvider based on the STORAGE_PROVIDER
 * environment variable.
 *
 *   STORAGE_PROVIDER=local  (default) — saves to /public/uploads
 *   STORAGE_PROVIDER=s3               — uploads to S3-compatible storage
 *
 * The provider instance is cached per process after first call.
 */
let _provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (_provider) return _provider;

  const providerName = (process.env.STORAGE_PROVIDER ?? "local").toLowerCase().trim();

  if (providerName === "s3") {
    const { S3StorageProvider } = require("./s3") as typeof import("./s3");
    _provider = new S3StorageProvider();
    console.info("[Pugmill] Storage: S3 provider active (bucket:", process.env.S3_BUCKET, ")");
  } else if (providerName === "vercel-blob") {
    const { VercelBlobStorageProvider } = require("./vercel-blob") as typeof import("./vercel-blob");
    _provider = new VercelBlobStorageProvider();
    console.info("[Pugmill] Storage: Vercel Blob provider active.");
  } else {
    if (providerName !== "local") {
      console.warn(`[Pugmill] Unknown STORAGE_PROVIDER="${providerName}", falling back to local.`);
    }
    const { LocalStorageProvider } = require("./local") as typeof import("./local");
    _provider = new LocalStorageProvider();
  }

  return _provider!;
}

/** Clears the cached provider. Useful in tests or after env changes. */
export function resetStorageProvider(): void {
  _provider = null;
}
