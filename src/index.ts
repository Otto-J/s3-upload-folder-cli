#!/usr/bin/env node

import { uploadFolder, uploadFile } from "./upload";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 package.json 中的版本号
const packageJson = JSON.parse(
  fs.readFileSync(join(__dirname, "../package.json"), "utf-8")
);
const version = packageJson.version;

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
  console.log(`S3 Upload Folder - 上传文件或文件夹到 S3 兼容存储

用法:
  上传文件夹:
    s3-upload-folder --dist <文件夹路径> --bucket <bucket名称> --ak <AccessKey> --sk <SecretKey> [可选参数]

  上传单个文件:
    s3-upload-folder --file <文件路径> --bucket <bucket名称> --ak <AccessKey> --sk <SecretKey> [可选参数]

必选参数:
  --dist, -d           本地文件夹路径（上传文件夹时必选）
  --file               单个文件路径（上传单文件时必选）
  --bucket, -b         目标 S3 bucket 名称
  --ak                 Access Key ID
  --sk                 Secret Access Key

可选参数:
  --endpoint, -e       S3 endpoint URL（用于阿里云 OSS、MinIO 等非 AWS 服务）
  --region, -r         AWS region（默认: us-east-1）
  --prefix, -p         远程路径前缀（默认: 空）
  --forcePathStyle     启用 path-style 访问（默认: true）
  --content-type       指定 Content-Type（仅单文件上传，默认自动检测）
  --version, -v        显示版本号

示例:
  # 上传文件夹到阿里云 OSS
  s3-upload-folder --dist ./dist --bucket my-bucket --ak LTAI... --sk xxx --endpoint https://oss-cn-hangzhou.aliyuncs.com

  # 上传单个 HTML 文件（自动检测 Content-Type）
  s3-upload-folder --file index.html --bucket my-bucket --ak xxx --sk xxx --endpoint https://oss-cn-hangzhou.aliyuncs.com

  # 上传到 AWS S3（指定 region）
  s3-upload-folder --dist ./build --bucket my-bucket --ak xxx --sk xxx --region us-west-2 --forcePathStyle false
`);
}

const options = parseArgs();

// 处理版本号显示
if (options.v || options.version) {
  console.log(version);
  process.exit(0);
}

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
    console.error(`❌ 错误: 文件不存在: ${options.file}`);
    console.error(`请检查文件路径是否正确`);
    process.exit(1);
  }
  if (!fs.statSync(options.file).isFile()) {
    console.error(`❌ 错误: 路径不是文件: ${options.file}`);
    console.error(`请使用 --dist 参数上传文件夹`);
    process.exit(1);
  }
  uploadFile({
    dist: "",
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
    console.error(`❌ 错误: 文件夹不存在: ${options.dist}`);
    console.error(`请检查文件夹路径是否正确`);
    process.exit(1);
  }
  if (!fs.statSync(options.dist).isDirectory()) {
    console.error(`❌ 错误: 路径不是文件夹: ${options.dist}`);
    console.error(`请使用 --file 参数上传单个文件`);
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
  console.error("❌ 错误: 必须指定 --file 或 --dist 参数之一");
  printUsage();
  process.exit(1);
}
