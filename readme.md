# @web.worker/s3-upload-folder

## 开发背景

> 这样吧，你封装成一个 npm 包好了，名字就叫 @web.worker/s3-upload-folder，用户可以通过 npx @web.worker/s3-upload-folder --dist dist/ --ak xx --sk xx --endpoint xx --bucket xx ，可能还有我没想到的。你做个补充。使用 esm+ts 实现。

## 介绍

一个基于 ESM + TypeScript 实现的命令行工具，用于将本地文件夹递归上传至 S3 兼容的对象存储服务。该工具可直接通过 npx 使用，无需额外安装。

## 使用方式

通过以下命令上传文件夹：

```sh
npx @web.worker/s3-upload-folder \
  --dist $DIST_PATH \
  --ak $ACCESS_KEY \
  --sk $SECRET_KEY \
  --endpoint $ENDPOINT \
  --region $REGION \
  --bucket $BUCKET_NAME \
  --prefix /
```

### 命令行参数

- `--dist`：本地目录路径，待上传的文件夹 **(必填)**。
- `--ak`：Access Key ID **(必填)**。
- `--sk`：Secret Access Key **(必填)**。
- `--bucket`：目标存储桶名称 **(必填)**。
- `--endpoint`：S3 接口的 endpoint（对于非 AWS 服务可选）。
- `--region`：存储区域，默认值为 `us-east-1`。
- `--prefix`：上传至存储桶的远程路径前缀，默认留空。
- `--forcePathStyle`：是否采用路径风格访问，默认开启。

## 实现原理

### 核心功能

- **递归读取本地文件夹**  
  工具采用 Node.js 内置的 `fs` 模块，通过递归方式读取指定目录下的所有文件，将子文件夹及文件一并遍历。

- **上传逻辑**  
  利用 AWS SDK v3 中的 [`S3Client`](https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-s3) 和 [`PutObjectCommand`](https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-s3) 命令，逐个将文件内容上传至目标存储桶。

  - **进度提示**  
    采用内置进度条实现，每个文件上传成功或失败后，调用专门的 `updateProgress` 函数更新上传进度，并在命令行实时显示当前进度。

  - **并发上传**  
    通过将文件分批（每批同时最多上传 `maxConcurrentUploads` 个文件）执行并发上传操作，从而有效提升上传速度。

- **错误处理**  
  每个文件上传均独立执行，若上传失败则打印具体的错误信息，便于用户排查。

### 技术栈

- **ESM 模块**：采用原生 ESM 模块语法，支持现代 JavaScript 和 TypeScript。
- **TypeScript**：通过 TypeScript 提供类型检查和代码提示，保证程序的健壮性。
- **Commander**：用于解析命令行参数，提升 CLI 使用体验。
- **AWS SDK v3**：简化与 S3 兼容存储服务的交互。

## 开发与构建

### 项目结构

```
s3uploadFolder/
├── src/
│   ├── cli.ts          // 命令行入口，负责参数解析和调用上传逻辑
│   ├── upload.ts       // 文件上传核心逻辑，包括递归读取目录和调用 SDK 命令
├── package.json        // npm 包配置及依赖管理
├── tsconfig.json       // TypeScript 编译配置
├── README.md           // 项目使用说明
```

### 构建与发布

1. **安装依赖**

   在项目根目录下执行：

   ```bash
   npm install
   ```

2. **构建项目**

   执行以下命令生成 `dist` 文件夹：

   ```bash
   npm run build
   ```

3. **发布到 npm**

   登录 npm 并发布：

   ```bash
   npm login
   npm publish --access public
   ```

## 后续扩展

- **上传进度提示**：可添加进度条显示上传进度。
- **并发上传**：通过并发控制优化上传速度。
- **分片上传**：支持大文件的分片上传功能。
