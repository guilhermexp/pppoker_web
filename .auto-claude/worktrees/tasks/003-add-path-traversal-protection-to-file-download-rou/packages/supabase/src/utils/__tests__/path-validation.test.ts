import { describe, expect, it } from "bun:test";
import {
  PathValidationError,
  isSafePath,
  validateFilePath,
} from "../path-validation";

describe("Path Validation", () => {
  describe("validateFilePath", () => {
    it("should validate and return normalized valid paths", () => {
      const validPaths = [
        "team-id/folder/file.pdf",
        "invoices/2024/invoice-123.pdf",
        "vault/documents/report.docx",
        "folder/subfolder/file.txt",
      ];

      for (const path of validPaths) {
        const result = validateFilePath(path);
        expect(typeof result).toBe("string");
        expect(result).toBeTruthy();
      }
    });

    it("should normalize paths with ./ sequences", () => {
      const path = "./folder/./file.txt";
      const result = validateFilePath(path);
      expect(result).toBe("folder/file.txt");
    });

    it("should throw error for null or undefined paths", () => {
      expect(() => validateFilePath(null as any)).toThrow(PathValidationError);
      expect(() => validateFilePath(undefined as any)).toThrow(
        PathValidationError,
      );
      expect(() => validateFilePath(null as any)).toThrow(
        "Path must be a non-empty string",
      );
    });

    it("should throw error for empty string", () => {
      expect(() => validateFilePath("")).toThrow(PathValidationError);
      expect(() => validateFilePath("")).toThrow(
        "Path must be a non-empty string",
      );
    });

    it("should throw error for non-string input", () => {
      expect(() => validateFilePath(123 as any)).toThrow(PathValidationError);
      expect(() => validateFilePath({} as any)).toThrow(PathValidationError);
      expect(() => validateFilePath([] as any)).toThrow(PathValidationError);
    });

    it("should throw error for basic path traversal attempts", () => {
      const traversalPaths = [
        "../../../etc/passwd",
        "../../secrets/config.json",
        "../other-bucket/file.pdf",
        "..",
        "../",
        "folder/../../outside/file.txt",
      ];

      for (const path of traversalPaths) {
        expect(() => validateFilePath(path)).toThrow(PathValidationError);
        expect(() => validateFilePath(path)).toThrow(
          "Path traversal attempts are not allowed",
        );
      }
    });

    it("should throw error for URL-encoded path traversal", () => {
      const encodedPaths = [
        "..%2F..%2F..%2Fetc%2Fpasswd",
        "..%2F..%2Fsecrets",
        "%2e%2e%2f%2e%2e%2ffile.txt",
        "folder%2F..%2F..%2Foutside",
      ];

      for (const path of encodedPaths) {
        expect(() => validateFilePath(path)).toThrow(PathValidationError);
      }
    });

    it("should throw error for absolute Unix paths", () => {
      const absolutePaths = [
        "/etc/passwd",
        "/absolute/path/file.txt",
        "/var/log/system.log",
        "/home/user/secrets.txt",
      ];

      for (const path of absolutePaths) {
        expect(() => validateFilePath(path)).toThrow(PathValidationError);
        expect(() => validateFilePath(path)).toThrow(
          "Absolute paths are not allowed",
        );
      }
    });

    it("should throw error for Windows absolute paths", () => {
      const windowsPaths = [
        "C:\\Windows\\System32",
        "D:\\secrets\\file.txt",
        "C:/Program Files/app.exe",
      ];

      for (const path of windowsPaths) {
        expect(() => validateFilePath(path)).toThrow(PathValidationError);
      }
    });

    it("should throw error for null byte injection", () => {
      const nullBytePaths = [
        "file.txt\0.pdf",
        "folder/file\0/../../etc/passwd",
        "\0malicious",
      ];

      for (const path of nullBytePaths) {
        expect(() => validateFilePath(path)).toThrow(PathValidationError);
        expect(() => validateFilePath(path)).toThrow(
          "Path contains null bytes",
        );
      }
    });

    it("should throw error for invalid URL encoding", () => {
      const invalidEncoded = ["file%ZZname.txt", "folder%/file.txt", "%GG%HH"];

      for (const path of invalidEncoded) {
        expect(() => validateFilePath(path)).toThrow(PathValidationError);
        expect(() => validateFilePath(path)).toThrow(
          "Path contains invalid URL encoding",
        );
      }
    });

    it("should handle valid paths with special characters", () => {
      const specialCharPaths = [
        "folder/file with spaces.pdf",
        "team-123/report_2024.xlsx",
        "vault/document-final.docx",
        "files/image (1).png",
      ];

      for (const path of specialCharPaths) {
        const result = validateFilePath(path);
        expect(typeof result).toBe("string");
        expect(result).toBeTruthy();
      }
    });

    it("should handle URL-encoded valid paths", () => {
      const encoded = "folder%2Ffile%20with%20spaces.pdf";
      const result = validateFilePath(encoded);
      expect(result).toBe("folder/file with spaces.pdf");
    });

    it("should allow paths that navigate within valid directories", () => {
      // vault/../other-bucket/file normalizes to other-bucket/file which is valid
      const validPath = "vault/../other-bucket/file";
      const result = validateFilePath(validPath);
      expect(result).toBe("other-bucket/file");
    });

    it("should handle nested valid folders", () => {
      const deepPath = "level1/level2/level3/level4/file.txt";
      const result = validateFilePath(deepPath);
      expect(result).toBe(deepPath);
    });

    it("should throw error for just '../' string", () => {
      expect(() => validateFilePath("../")).toThrow(PathValidationError);
      expect(() => validateFilePath("../")).toThrow(
        "Path traversal attempts are not allowed",
      );
    });

    it("should throw error for paths starting with separator after normalization", () => {
      // These should be caught by absolute path check
      const separatorPaths = ["/folder/file.txt", "/file.txt"];

      for (const path of separatorPaths) {
        expect(() => validateFilePath(path)).toThrow(PathValidationError);
      }
    });
  });

  describe("isSafePath", () => {
    it("should return true for valid paths", () => {
      const validPaths = [
        "team-id/folder/file.pdf",
        "invoices/2024/invoice-123.pdf",
        "vault/documents/report.docx",
        "./folder/file.txt",
      ];

      for (const path of validPaths) {
        expect(isSafePath(path)).toBe(true);
      }
    });

    it("should return false for path traversal attempts", () => {
      const invalidPaths = [
        "../../../etc/passwd",
        "../../secrets",
        "..",
        "../",
        "folder/../../outside/file.txt",
      ];

      for (const path of invalidPaths) {
        expect(isSafePath(path)).toBe(false);
      }
    });

    it("should return false for absolute paths", () => {
      const absolutePaths = [
        "/etc/passwd",
        "/absolute/path/file.txt",
        "C:\\Windows\\System32",
      ];

      for (const path of absolutePaths) {
        expect(isSafePath(path)).toBe(false);
      }
    });

    it("should return false for null bytes", () => {
      expect(isSafePath("file.txt\0.pdf")).toBe(false);
      expect(isSafePath("\0malicious")).toBe(false);
    });

    it("should return false for empty or invalid input", () => {
      expect(isSafePath("")).toBe(false);
      expect(isSafePath(null as any)).toBe(false);
      expect(isSafePath(undefined as any)).toBe(false);
    });

    it("should return false for URL-encoded traversal", () => {
      expect(isSafePath("..%2F..%2Fetc%2Fpasswd")).toBe(false);
      expect(isSafePath("%2e%2e%2f%2e%2e%2ffile.txt")).toBe(false);
    });

    it("should return true for URL-encoded valid paths", () => {
      expect(isSafePath("folder%2Ffile.pdf")).toBe(true);
      expect(isSafePath("file%20with%20spaces.txt")).toBe(true);
    });
  });

  describe("PathValidationError", () => {
    it("should create error with correct name and message", () => {
      const error = new PathValidationError("Test error message");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PathValidationError);
      expect(error.name).toBe("PathValidationError");
      expect(error.message).toBe("Test error message");
    });

    it("should be catchable as PathValidationError", () => {
      try {
        throw new PathValidationError("Custom error");
      } catch (error) {
        expect(error).toBeInstanceOf(PathValidationError);
        if (error instanceof PathValidationError) {
          expect(error.message).toBe("Custom error");
        }
      }
    });
  });
});
