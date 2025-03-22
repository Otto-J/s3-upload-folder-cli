import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";
//  { readdirSync, readFileSync }

export async function uploadFolder({
  localFolderPath,
  bucketName,
  accessKeyId,
  secretAccessKey,
  endpoint,
  region,
  prefix = "",
  forcePathStyle = true,
}: {
  localFolderPath: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  region: string;
  prefix?: string;
  forcePathStyle?: boolean;
}) {
  const s3Client = new S3Client({
    region,
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle,
  });

  const files = getFilesRecursively(localFolderPath);

  for (const file of files) {
    const relativePath = file.replace(localFolderPath, "").replace(/\\/g, "/");
    const remoteKey = path.join(prefix, relativePath).replace(/^\//, "");

    const fileContent = fs.readFileSync(file);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: remoteKey,
      Body: fileContent,
    });

    try {
      await s3Client.send(command);
      console.log(`Uploaded: ${remoteKey}`);
    } catch (error) {
      console.error(`Failed to upload: ${remoteKey}`, error);
    }
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
