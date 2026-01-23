import { normalize, isAbsolute, sep } from "node:path";

/**
 * Error thrown when path validation fails
 */
export class PathValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathValidationError";
  }
}

/**
 * Checks if a file path is safe and doesn't contain traversal attempts
 * @param path - The file path to validate
 * @returns true if the path is safe, false otherwise
 */
export function isSafePath(path: string): boolean {
  try {
    validateFilePath(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and sanitizes a file path to prevent directory traversal attacks
 * @param path - The file path to validate
 * @returns The normalized and validated path
 * @throws {PathValidationError} If the path is invalid or contains traversal attempts
 */
export function validateFilePath(path: string): string {
  // Check for null, undefined, or empty string
  if (!path || typeof path !== "string") {
    throw new PathValidationError("Path must be a non-empty string");
  }

  // Decode any URL encoding to catch encoded traversal attempts
  let decodedPath = path;
  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    throw new PathValidationError("Path contains invalid URL encoding");
  }

  // Check for null bytes (can be used to truncate paths)
  if (decodedPath.includes("\0")) {
    throw new PathValidationError("Path contains null bytes");
  }

  // Check for absolute paths (Unix and Windows)
  if (isAbsolute(decodedPath)) {
    throw new PathValidationError(
      "Absolute paths are not allowed. Use relative paths only.",
    );
  }

  // Normalize the path to resolve '..' and '.' sequences
  const normalizedPath = normalize(decodedPath);

  // Check if normalized path tries to escape (starts with '..')
  if (normalizedPath.startsWith(`..${sep}`) || normalizedPath === "..") {
    throw new PathValidationError(
      "Path traversal attempts are not allowed (contains '..')",
    );
  }

  // Additional check: ensure the path doesn't start with separator (absolute path indicator)
  if (normalizedPath.startsWith(sep)) {
    throw new PathValidationError(
      "Paths starting with separator are not allowed",
    );
  }

  // Check for Windows drive letters (C:, D:, etc.)
  if (/^[a-zA-Z]:/.test(normalizedPath)) {
    throw new PathValidationError("Windows drive letters are not allowed");
  }

  // Return the normalized path
  return normalizedPath;
}
