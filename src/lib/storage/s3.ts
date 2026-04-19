import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { StorageProvider, UploadResult } from "./types";

/**
 * S3StorageProvider
 *
 * Uploads files to any S3-compatible object store:
 *   - AWS S3
 *   - Cloudflare R2  (set S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com)
 *   - DigitalOcean Spaces  (set S3_ENDPOINT=https://<region>.digitaloceanspaces.com)
 *   - MinIO / self-hosted
 *
 * Required env vars:
 *   S3_BUCKET           — bucket name
 *   S3_REGION           — AWS region (e.g. "us-east-1"); use "auto" for R2
 *   S3_ACCESS_KEY_ID    — access key / key ID
 *   S3_SECRET_ACCESS_KEY — secret access key
 *
 * Optional env vars:
 *   S3_ENDPOINT         — custom endpoint URL (for R2, DO Spaces, MinIO, etc.)
 *   S3_PUBLIC_URL       — base URL for public file access.
 *                         Defaults to https://{bucket}.s3.{region}.amazonaws.com
 *                         For R2 / custom domains set this to your CDN URL.
 *                         E.g. "https://media.example.com" or
 *                              "https://pub-xxxx.r2.dev"
 *   S3_PUBLIC_ACL       — set to "false" to omit the ACL header (use when your
 *                         bucket enforces private ACL or uses a CDN). Defaults
 *                         to "true" (public-read). R2 buckets require "false".
 */
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly usePublicAcl: boolean;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT;
    const publicUrl = process.env.S3_PUBLIC_URL;
    // S3_PUBLIC_ACL defaults to true. Set to "false" for private buckets or R2.
    this.usePublicAcl = process.env.S3_PUBLIC_ACL !== "false";

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3StorageProvider requires S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY"
      );
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      // forcePathStyle must be true for non-AWS endpoints (Supabase, MinIO, R2, DO Spaces).
      // Virtual-hosted style (bucket.endpoint) requires a per-bucket SSL cert which custom
      // endpoints don't have. Only omit forcePathStyle for native AWS S3.
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });

    // Build default public URL if S3_PUBLIC_URL is not set
    this.publicBaseUrl = publicUrl
      ? publicUrl.replace(/\/$/, "")
      : endpoint
      ? `${endpoint.replace(/\/$/, "")}/${bucket}`
      : `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  async upload(buffer: Buffer, fileName: string, mimeType: string): Promise<UploadResult> {
    const key = `uploads/${fileName}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // Only set ACL when S3_PUBLIC_ACL is not "false". Omit for private
        // buckets, R2 (which doesn't support ACLs), or CDN-fronted setups.
        ...(this.usePublicAcl ? { ACL: "public-read" } : {}),
      })
    );

    const url = `${this.publicBaseUrl}/${key}`;
    return { url, storageKey: key };
  }

  async delete(storageKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
        })
      );
    } catch (err: unknown) {
      // NoSuchKey means it's already gone — treat as success
      if ((err as { name?: string }).name === "NoSuchKey") return;
      throw err;
    }
  }
}
