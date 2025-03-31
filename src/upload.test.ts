import { describe, it, expect, vi, beforeEach } from "vitest";
import { uploadFile, uploadFolder } from "./upload";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

// Mock modules
vi.mock("@aws-sdk/client-s3");
vi.mock("node:fs", () => ({
  default: {
    readFileSync: vi.fn().mockReturnValue(Buffer.from("test content")),
    readdirSync: vi.fn().mockImplementation((dir, options) => {
      if (dir === "test-folder") {
        return [
          { name: "file1.txt", isDirectory: () => false },
          { name: "file2.txt", isDirectory: () => false },
        ];
      }
      return [];
    }),
  },
}));

describe("uploadFile", () => {
  const mockSend = vi.fn();
  const mockS3Client = {
    send: mockSend,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(S3Client).mockImplementation(() => mockS3Client as any);
  });

  it("should upload file successfully", async () => {
    mockSend.mockResolvedValueOnce({});

    await uploadFile({
      dist: "dist",
      filePath: "dist/test.txt",
      bucket: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      region: "test-region",
    });

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: "test-bucket",
      Key: "test.txt",
      Body: expect.any(Buffer),
      ContentType: expect.any(String),
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("should throw error when upload fails", async () => {
    const error = new Error("Upload failed");
    mockSend.mockRejectedValueOnce(error);

    await expect(
      uploadFile({
        dist: "dist",
        filePath: "dist/test.txt",
        bucket: "test-bucket",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
        region: "test-region",
      })
    ).rejects.toThrow("Upload failed");
  });
});

describe("uploadFolder", () => {
  const mockSend = vi.fn();
  const mockS3Client = {
    send: mockSend,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(S3Client).mockImplementation(() => mockS3Client as any);
    mockSend.mockResolvedValue({});
  });

  it("should upload all files in folder", async () => {
    await uploadFolder({
      localFolderPath: "test-folder",
      bucket: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      region: "test-region",
    });

    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "test-bucket",
        Key: expect.stringMatching(/file[12]\.txt/),
        Body: expect.any(Buffer),
        ContentType: expect.any(String),
      })
    );
  });
});
