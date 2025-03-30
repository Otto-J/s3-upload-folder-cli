#!/usr/bin/env node

import { uploadFolder, uploadFile } from "./upload";
import fs from "fs";

function parseArgs(): { [key: string]: any } {
  const args = process.argv.slice(2);
  const options: { [key: string]: any } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    } else if (arg.startsWith("-")) {
      // 处理短参数（支持 -d 等）
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
        options[key] = args[++i];
      } else {
        options[key] = true;
      }
    }
  }
  return options;
}

function printUsage() {
  console.log(`用法:
  上传文件夹:
  npx @web.worker/s3-upload-folder -d <localFolderPath> -b <bucket> -ak <accessKeyId> -sk <secretAccessKey> [可选参数]

  上传单个文件:
  npx @web.worker/s3-upload-folder --file <filePath> -b <bucket> -ak <accessKeyId> -sk <secretAccessKey> [可选参数]

必选参数:
  -d, --dist           本地要上传的文件夹路径（上传文件夹时必选）
  --file               要上传的单个文件路径（上传单个文件时必选）
  -b, --bucket         目标 S3 bucket 名称
  -ak, --ak            Access Key ID
  -sk, --sk            Secret Access Key

可选参数:
  -e, --endpoint       S3 endpoint URL，用于非 AWS 服务
  -r, --region         AWS region (默认: us-east-1)
  -p, --prefix         远程路径前缀 (默认: 空)
      --forcePathStyle 布尔值，启用 path-style 访问 (默认: true)
  --content-type       文件的 Content-Type（仅用于单个文件上传）
`);
}

const options = parseArgs();

// 校验必选参数
const required = [
  { keys: ["b", "bucket"], name: "bucket" },
  { keys: ["ak"], name: "ak" },
  { keys: ["sk"], name: "sk" },
];

const missing = [];
for (const req of required) {
  let found = false;
  for (const key of req.keys) {
    if (options[key] !== undefined) {
      options[req.name] = options[key];
      found = true;
      break;
    }
  }
  if (!found) {
    missing.push(req.name);
  }
}

if (missing.length > 0) {
  console.error(`缺少必选参数: ${missing.join(", ")}`);
  printUsage();
  process.exit(1);
}

// 设置可选参数默认值
options.region = options.r || options.region || "us-east-1";
options.prefix = options.p || options.prefix || "";
if (options.forcePathStyle === undefined) {
  options.forcePathStyle = true;
}

// 判断是上传文件夹还是单个文件
if (options.file) {
  // 上传单个文件
  if (!fs.existsSync(options.file)) {
    console.error(`文件不存在: ${options.file}`);
    process.exit(1);
  }
  uploadFile({
    filePath: options.file,
    bucket: options.bucket,
    accessKeyId: options.ak,
    secretAccessKey: options.sk,
    endpoint: options.endpoint,
    region: options.region,
    prefix: options.prefix,
    forcePathStyle: options.forcePathStyle,
    contentType: options["content-type"],
  });
} else if (options.dist) {
  // 上传文件夹
  if (!fs.existsSync(options.dist)) {
    console.error(`文件夹不存在: ${options.dist}`);
    process.exit(1);
  }
  uploadFolder({
    localFolderPath: options.dist,
    bucket: options.bucket,
    accessKeyId: options.ak,
    secretAccessKey: options.sk,
    endpoint: options.endpoint,
    region: options.region,
    prefix: options.prefix,
    forcePathStyle: options.forcePathStyle,
  });
} else {
  console.error("必须指定 --file 或 --dist 参数之一");
  printUsage();
  process.exit(1);
}
