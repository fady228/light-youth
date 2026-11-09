import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';

/** Where sermon PDFs are stored. Read lazily so .env is loaded first. */
export const uploadDir = () => resolve(process.env.UPLOAD_DIR || join(process.cwd(), 'uploads'));

export const ensureUploadDir = () => mkdirSync(uploadDir(), { recursive: true });

/** Stored names are always "<uuid>.pdf" — anything else is rejected (no path tricks). */
export const PDF_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

export const uploadExists = (name: string) => PDF_NAME.test(name) && existsSync(join(uploadDir(), name));

export function removeUpload(name: string | null | undefined) {
  if (!name || !PDF_NAME.test(name)) return;
  try {
    unlinkSync(join(uploadDir(), name));
  } catch {
    /* already gone */
  }
}

export const MAX_PDF_BYTES = 25 * 1024 * 1024;
