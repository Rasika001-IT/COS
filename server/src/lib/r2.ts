import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'node:crypto'
import { env } from '../config/env.js'

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.r2.accessKeyId, secretAccessKey: env.r2.secretAccessKey },
})

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function allowedMime(mimetype: string): boolean {
  return mimetype in ALLOWED_MIME
}

export async function uploadToR2(orgId: string, buffer: Buffer, mimetype: string): Promise<string> {
  const ext = ALLOWED_MIME[mimetype]
  const key = `${orgId}/${crypto.randomUUID()}.${ext}`
  await s3.send(new PutObjectCommand({ Bucket: env.r2.bucket, Key: key, Body: buffer, ContentType: mimetype }))
  return `${env.r2.publicBaseUrl}/${key}`
}

export function keyFromUrl(url: string): string | null {
  if (!url.startsWith(env.r2.publicBaseUrl + '/')) return null
  return url.slice(env.r2.publicBaseUrl.length + 1)
}

export async function deleteFromR2(url: string): Promise<void> {
  const key = keyFromUrl(url)
  if (!key) return
  await s3.send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: key }))
}
