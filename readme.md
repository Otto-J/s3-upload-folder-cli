> 很好，这样吧，你封装成一个 npm 包好了，名字就叫 @webworker.tech/s3uploadFolder，用户可以通过 npx @webworker.tech/s3uploadFolder --dist dist/ --ak xx --sk xx --endpoint xx --bucketName xx ，可能还有我没想到的。你做个补充。使用 esm+ts 实现

好的！接下来我将为你设计一个完整的 npm 包，命名为 `@webworker.tech/s3uploadFolder`，并使用 **ESM + TypeScript** 实现。这个工具将支持通过命令行上传整个文件夹到 S3 兼容的对象存储服务。

---

### 1. 功能需求分析

根据你的描述，以下是工具的核心功能和参数需求：

- **核心功能**：
  - 支持上传整个文件夹到指定的 S3 存储桶。
  - 支持递归上传子文件夹及其内容。
  - 支持自定义远程路径（即目标路径前缀）。
- **命令行参数**：
  - `--dist`：本地文件夹路径（必填）。
  - `--ak`：Access Key ID（必填）。
  - `--sk`：Secret Access Key（必填）。
  - `--endpoint`：S3 兼容服务的 endpoint（可选，默认为 AWS S3）。
  - `--bucketName`：目标存储桶名称（必填）。
  - `--region`：存储区域（可选，默认为 `us-east-1`）。
  - `--prefix`：远程路径前缀（可选，默认为空）。
  - `--forcePathStyle`：是否启用路径风格访问（可选，默认为 `true`）。
- **其他需求**：
  - 使用 ESM 模块规范。
  - 使用 TypeScript 编写，提供类型安全。
  - 提供友好的错误提示和帮助信息。
  - 支持通过 `npx` 直接运行。

---

### 2. 项目结构

以下是项目的目录结构：

```
s3uploadFolder/
├── src/
│   ├── cli.ts          // 命令行入口
│   ├── upload.ts       // 文件上传逻辑
│   └── utils.ts        // 工具函数
├── package.json        // npm 包配置
├── tsconfig.json       // TypeScript 配置
├── README.md           // 使用说明
└── bin/
    └── s3uploadFolder  // CLI 可执行文件
```

---

### 3. 初始化项目

#### 创建项目并安装依赖

```bash
mkdir s3uploadFolder
cd s3uploadFolder
npm init -y
npm install @aws-sdk/client-s3 commander fs-extra typescript --save
npm install @types/node --save-dev
```

#### 配置 TypeScript

创建 `tsconfig.json` 文件：

```json
{
  "compilerOptions": {
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

#### 配置 npm 包

在 `package.json` 中添加以下字段：

```json
{
  "name": "@webworker.tech/s3uploadFolder",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/cli.js",
  "bin": {
    "s3uploadFolder": "bin/s3uploadFolder"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/cli.js"
  }
}
```

---

### 4. 实现代码

#### `src/cli.ts`（CLI 入口）

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { uploadFolder } from "./upload.js";

const program = new Command();

program
  .name("s3uploadFolder")
  .description("Upload a folder to an S3-compatible storage service")
  .version("1.0.0")
  .requiredOption("-d, --dist <path>", "Local folder path to upload")
  .requiredOption("-b, --bucketName <name>", "Target S3 bucket name")
  .requiredOption("-a, --ak <key>", "Access Key ID")
  .requiredOption("-s, --sk <key>", "Secret Access Key")
  .option(
    "-e, --endpoint <url>",
    "S3 endpoint URL (optional for non-AWS services)"
  )
  .option(
    "-r, --region <region>",
    "AWS region (default: us-east-1)",
    "us-east-1"
  )
  .option("-p, --prefix <prefix>", "Remote path prefix (default: '')", "")
  .option("--forcePathStyle", "Enable path-style access (default: true)", true)
  .parse(process.argv);

const options = program.opts();

uploadFolder({
  localFolderPath: options.dist,
  bucketName: options.bucketName,
  accessKeyId: options.ak,
  secretAccessKey: options.sk,
  endpoint: options.endpoint,
  region: options.region,
  prefix: options.prefix,
  forcePathStyle: options.forcePathStyle,
});
```

---

#### `src/upload.ts`（上传逻辑）

```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { readdirSync, statSync, readFileSync } from "fs";
import { join } from "path";

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
    const remoteKey = join(prefix, relativePath).replace(/^\//, "");

    const fileContent = readFileSync(file);

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
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getFilesRecursively(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}
```

---

#### `src/utils.ts`（工具函数）

此处可以添加更多通用工具函数（如路径处理、日志格式化等），目前暂不需要额外实现。

---

### 5. 打包和发布

#### 构建项目

运行以下命令生成 `dist` 文件夹：

```bash
npm run build
```

#### 发布到 npm

确保你已经登录到 npm：

```bash
npm login
```

然后发布：

```bash
npm publish --access public
```

---

### 6. 使用说明

用户可以通过以下方式安装和使用：

```bash
npx @webworker.tech/s3uploadFolder \
  --dist dist/ \
  --ak YOUR_ACCESS_KEY \
  --sk YOUR_SECRET_KEY \
  --endpoint https://your-endpoint.com \
  --bucketName your-bucket-name \
  --prefix remote/path/prefix
```

---

### 7. 后续扩展

- **进度条**：添加上传进度显示（可以使用 `progress` 库）。
- **并发控制**：支持多文件并发上传。
- **分片上传**：支持大文件的分片上传。

希望这个设计能满足你的需求！如果有其他问题或需要进一步调整，请随时告诉我！
