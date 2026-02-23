# @web.worker/s3-upload-folder

一个轻量级的 CLI 工具，用于将文件或文件夹上传到 S3 兼容的对象存储服务（AWS S3、阿里云 OSS、MinIO 等）。

## 特性

- 📦 支持单文件和文件夹上传
- 🚀 并发上传，提升速度
- 📊 实时进度显示
- 🎯 自动检测文件 MIME 类型
- 🔧 支持所有 S3 兼容服务
- 💻 零配置，开箱即用

## 快速开始

使用 npx 直接运行，无需安装：

```bash
# 上传文件夹
npx @web.worker/s3-upload-folder \
  --dist ./dist \
  --bucket my-bucket \
  --ak YOUR_ACCESS_KEY \
  --sk YOUR_SECRET_KEY \
  --endpoint https://oss-cn-hangzhou.aliyuncs.com

# 上传单个文件
npx @web.worker/s3-upload-folder \
  --file index.html \
  --bucket my-bucket \
  --ak YOUR_ACCESS_KEY \
  --sk YOUR_SECRET_KEY \
  --endpoint https://oss-cn-hangzhou.aliyuncs.com
```

## 使用方式

### 命令行参数

#### 必选参数

| 参数 | 简写 | 说明 |
|------|------|------|
| `--dist` | `-d` | 本地文件夹路径（上传文件夹时必选） |
| `--file` | - | 单个文件路径（上传单文件时必选） |
| `--bucket` | `-b` | 目标 S3 bucket 名称 |
| `--ak` | - | Access Key ID |
| `--sk` | - | Secret Access Key |

#### 可选参数

| 参数 | 简写 | 默认值 | 说明 |
|------|------|--------|------|
| `--endpoint` | `-e` | - | S3 endpoint URL（用于非 AWS 服务） |
| `--region` | `-r` | `us-east-1` | AWS region |
| `--prefix` | `-p` | `""` | 远程路径前缀 |
| `--forcePathStyle` | - | `true` | 启用 path-style 访问 |
| `--content-type` | - | 自动检测 | 指定 Content-Type（仅单文件上传） |
| `--version` | `-v` | - | 显示版本号 |

### 两种上传模式

| 模式 | 使用场景 | 特点 |
|------|----------|------|
| 文件夹上传 | 部署静态网站、批量上传 | 递归上传所有文件，自动检测 MIME 类型，显示进度条 |
| 单文件上传 | 上传单个文件、指定 Content-Type | 快速上传，可手动指定 MIME 类型 |

## 实际使用示例

### AWS S3

```bash
npx @web.worker/s3-upload-folder \
  --dist ./build \
  --bucket my-website \
  --ak AKIAIOSFODNN7EXAMPLE \
  --sk wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --region us-west-2 \
  --forcePathStyle false
```

### 阿里云 OSS

```bash
npx @web.worker/s3-upload-folder \
  --dist ./dist \
  --bucket my-bucket \
  --ak LTAI5t... \
  --sk xxx \
  --endpoint https://oss-cn-hangzhou.aliyuncs.com
```

### MinIO

```bash
npx @web.worker/s3-upload-folder \
  --dist ./public \
  --bucket my-bucket \
  --ak minioadmin \
  --sk minioadmin \
  --endpoint http://localhost:9000
```

### 上传到指定路径前缀

```bash
# 上传到 bucket 的 static/v1.0/ 目录下
npx @web.worker/s3-upload-folder \
  --dist ./dist \
  --bucket my-bucket \
  --ak xxx \
  --sk xxx \
  --endpoint https://oss-cn-hangzhou.aliyuncs.com \
  --prefix static/v1.0/
```

### 上传单个文件并指定 Content-Type

```bash
# 自动检测 Content-Type
npx @web.worker/s3-upload-folder \
  --file index.html \
  --bucket my-bucket \
  --ak xxx \
  --sk xxx \
  --endpoint https://oss-cn-hangzhou.aliyuncs.com

# 手动指定 Content-Type
npx @web.worker/s3-upload-folder \
  --file data.bin \
  --bucket my-bucket \
  --ak xxx \
  --sk xxx \
  --endpoint https://oss-cn-hangzhou.aliyuncs.com \
  --content-type application/octet-stream
```

## 技术实现

### 技术栈

- **运行时**: Bun
- **语言**: TypeScript (ESM)
- **SDK**: AWS SDK v3 (`@aws-sdk/client-s3`)
- **参数解析**: 自定义解析器

### 核心功能

#### 1. 递归文件遍历

使用 Node.js 内置 `fs` 模块递归读取文件夹，支持任意深度的目录结构。

#### 2. 并发上传

默认每批上传 5 个文件，通过 `Promise.all` 实现并发控制，显著提升上传速度。

#### 3. 自动 MIME 类型检测

根据文件扩展名自动检测 Content-Type，支持常见文件类型：

- HTML/CSS/JS
- 图片（PNG、JPG、SVG、WebP 等）
- 字体（WOFF、WOFF2、TTF）
- 文档（PDF、JSON、XML 等）

#### 4. 实时进度显示

上传文件夹时显示进度条：

```
[====================] 45/45 (100%)
```

## 项目结构

```
s3uploade/
├── src/
│   ├── index.ts       # CLI 入口，参数解析
│   ├── upload.ts      # 核心上传逻辑
│   └── upload.test.ts # 单元测试
├── dist/              # 构建输出
├── package.json
├── tsconfig.json
└── readme.md
```

## 开发

### 安装依赖

```bash
bun install
```

### 构建

```bash
bun run build
```

### 测试

```bash
bun test
```

### 本地测试

```bash
# 构建后测试
./dist/index.js --file test.html --bucket test --ak xxx --sk xxx
```

## 常见问题

### Q: 如何上传到阿里云 OSS？

A: 使用 `--endpoint` 参数指定 OSS endpoint：

```bash
--endpoint https://oss-cn-hangzhou.aliyuncs.com
```

### Q: 上传失败怎么办？

A: 检查以下几点：
1. Access Key 和 Secret Key 是否正确
2. Bucket 是否存在且有写入权限
3. Endpoint 是否正确（非 AWS 服务必须指定）
4. 网络连接是否正常

### Q: 如何设置文件的 Content-Type？

A:
- 文件夹上传：自动根据文件扩展名检测
- 单文件上传：自动检测，也可使用 `--content-type` 手动指定

### Q: 支持哪些 S3 兼容服务？

A: 支持所有实现 S3 API 的服务，包括：
- AWS S3
- 阿里云 OSS
- 腾讯云 COS
- MinIO
- Cloudflare R2
- DigitalOcean Spaces

### Q: 如何提高上传速度？

A: 工具默认使用并发上传（每批 5 个文件），已经优化了速度。如需进一步优化，可以：
1. 使用更快的网络连接
2. 选择地理位置更近的 region/endpoint

## 许可证

ISC

## 作者

Otto_WebWorkerPodcast
