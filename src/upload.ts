import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

type IUploadFileParams = {
  dist: string;
  filePath: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  region: string;
  prefix?: string;
  forcePathStyle?: boolean;
  contentType?: string;
};

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

export function generateRemoteKey(
  folderPath: string,
  prefix: string,
  filepath: string
) {
  // 规范化路径，确保使用统一的分隔符
  const relativePath = filepath.replace(folderPath, "").replace(/\\/g, "/");
  const remoteKey = path.join(prefix, relativePath).replace(/^\//, "");

  return remoteKey;
}

function detectContentType(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.ico': 'image/x-icon',
  };
  return mimeTypes[ext];
}

export async function uploadFile({
  dist = "",
  filePath,
  bucket,
  accessKeyId,
  secretAccessKey,
  endpoint,
  region,
  prefix = "",
  forcePathStyle = true,
  contentType,
}: IUploadFileParams) {
  const s3Client = createS3Client({
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  });

  const remoteKey = generateRemoteKey(dist, prefix, filePath);
  const fileContent = fs.readFileSync(filePath);

  // 自动检测 Content-Type
  const finalContentType = contentType || detectContentType(filePath);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: remoteKey,
    Body: fileContent,
    ...(finalContentType ? { ContentType: finalContentType } : {}),
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
  maxConcurrentUploads = 5,
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
          dist: localFolderPath,
          filePath: file,
          bucket,
          accessKeyId,
          secretAccessKey,
          endpoint,
          region,
          prefix,
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
