import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

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

function generateRemoteKey(dist: string, prefix: string, filepath: string) {
  // 规范化路径，确保使用统一的分隔符
  const normalizedDist = path.normalize(dist);
  const normalizedFilePath = path.normalize(filepath);

  // 确保filepath以dist开头
  if (!normalizedFilePath.startsWith(normalizedDist)) {
    throw new Error(
      `filepath "${filepath}" must be inside dist directory "${dist}"`
    );
  }

  // 获取dist之后的部分路径
  let relativePath = normalizedFilePath.slice(normalizedDist.length);

  // 移除开头的路径分隔符（如果有）
  if (relativePath.startsWith(path.sep)) {
    relativePath = relativePath.slice(1);
  }

  // 将路径分隔符转换为Unix风格（/）
  relativePath = relativePath.split(path.sep).join("/");

  // 添加prefix
  let remoteKey = prefix + relativePath;

  // 确保prefix和路径之间只有一个斜杠
  remoteKey = remoteKey.replace(/([^/])\/+([^/])/g, "$1/$2");

  return remoteKey;
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
}: {
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
}) {
  const s3Client = createS3Client({
    region,
    endpoint,
    accessKeyId,
    secretAccessKey,
    forcePathStyle,
  });

  // 从文件路径中提取文件名，忽略目录前缀
  const remoteKey = generateRemoteKey(dist, prefix, filePath);

  const fileContent = fs.readFileSync(filePath);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: remoteKey,
    Body: fileContent,
    ...(contentType ? { ContentType: contentType } : {}),
  });

  try {
    // console.log(command);
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
