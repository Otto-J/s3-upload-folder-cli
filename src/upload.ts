import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
//  { readdirSync, readFileSync }

function createS3Client({
  region,
  endpoint,
  accessKeyId,
  secretAccessKey,
  forcePathStyle = true,
}: {
  region: string;
  endpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}) {
  return new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle,
  });
}

export async function uploadFile({
  filePath,
  bucket,
  accessKeyId,
  secretAccessKey,
  endpoint,
  region,
  prefix = "",
  forcePathStyle = true,
  contentType,
}: {
  filePath: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  region: string;
  prefix?: string;
  forcePathStyle?: boolean;
  contentType?: string;
}) {
  const s3Client = createS3Client({
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  });

  const relativePath = filePath.replace(/\\/g, "/");
  const remoteKey = path.join(prefix, relativePath).replace(/^\//, "");

  const fileContent = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: remoteKey,
    Body: fileContent,
    ...(contentType ? { ContentType: contentType } : {}),
  });

  try {
    await s3Client.send(command);
    console.log(`Uploaded: ${remoteKey}`);
  } catch (error) {
    console.error(`Failed to upload: ${remoteKey}`, error);
    throw error;
  }
}

export async function uploadFolder({
  localFolderPath,
  bucket,
  accessKeyId,
  secretAccessKey,
  endpoint,
  region,
  prefix = "",
  forcePathStyle = true,
  maxConcurrentUploads = 6,
}: {
  localFolderPath: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  region: string;
  prefix?: string;
  forcePathStyle?: boolean;
  maxConcurrentUploads?: number;
}) {
  const files = getFilesRecursively(localFolderPath);
  const total = files.length;
  let completed = 0;

  // Function to update progress bar
  const updateProgress = () => {
    completed++;
    const percentage = Math.floor((completed / total) * 100);
    const progressBar =
      "[" +
      "=".repeat(Math.floor(percentage / 5)) +
      " ".repeat(20 - Math.floor(percentage / 5)) +
      "]";
    process.stdout.write(
      `\r${progressBar} ${completed}/${total} (${percentage}%)`
    );
  };

  // Process files in batches of maxConcurrentUploads
  for (let i = 0; i < files.length; i += maxConcurrentUploads) {
    const batch = files.slice(i, i + maxConcurrentUploads);
    await Promise.all(
      batch.map((file) =>
        uploadFile({
          filePath: file,
          bucket,
          accessKeyId,
          secretAccessKey,
          endpoint,
          region,
          prefix: path
            .join(prefix, path.relative(localFolderPath, file))
            .replace(/^\//, ""),
          forcePathStyle,
        }).then(updateProgress)
      )
    );
  }
}

function getFilesRecursively(dir: string): string[] {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}
