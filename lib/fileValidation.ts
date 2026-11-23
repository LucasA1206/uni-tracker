import path from "path";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  safeName?: string;
  mimeType?: string;
}

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".txt",
  ".md",
  ".doc",
  ".docx"
]);

const EXTENSION_MIME_MAP: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"]
};

/**
 * Validate magic bytes for common binary formats.
 */
function checkMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;

  switch (ext) {
    case ".pdf":
      // %PDF- (0x25 0x50 0x44 0x46 0x2D)
      return buffer.slice(0, 5).toString("utf-8") === "%PDF-";
    case ".png":
      // 89 50 4E 47
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    case ".jpg":
    case ".jpeg":
      // FF D8 FF
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case ".gif":
      // GIF8
      return buffer.slice(0, 4).toString("utf-8") === "GIF8";
    default:
      // Other text or composite zip formats
      return true;
  }
}

/**
 * Validate an uploaded file for size, extension, MIME type, and magic bytes.
 */
export async function validateUploadedFile(
  file: File,
  maxBytes: number
): Promise<{ valid: true; safeName: string; mimeType: string; buffer: Buffer } | { valid: false; error: string }> {
  if (!file || file.size <= 0) {
    return { valid: false, error: "Empty or invalid file provided" };
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return { valid: false, error: `File exceeds maximum allowed size of ${maxMb}MB` };
  }

  // Sanitize filename: extract basename and strip path traversal characters
  const rawBase = path.basename(file.name || "attachment");
  const ext = path.extname(rawBase).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      valid: false,
      error: `File type '${ext || "unknown"}' is not allowed. Supported formats: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`
    };
  }

  // Clean filename: keep alphanumerics, dots, hyphens, underscores
  const cleanName = rawBase.replace(/[^a-zA-Z0-9._-]/g, "_");

  const buffer = Buffer.from(await file.arrayBuffer());

  // Check magic bytes
  if (!checkMagicBytes(buffer, ext)) {
    return { valid: false, error: "File contents do not match the expected format extension" };
  }

  // Derive canonical MIME type
  const expectedMimes = EXTENSION_MIME_MAP[ext] || ["application/octet-stream"];
  const declaredMime = (file.type || "").toLowerCase();
  const mimeType = expectedMimes.includes(declaredMime) ? declaredMime : expectedMimes[0];

  return {
    valid: true,
    safeName: cleanName,
    mimeType,
    buffer
  };
}
