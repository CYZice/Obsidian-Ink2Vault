# 代码架构分析与实现计划

## 当前架构分析

### 核心组件结构

```
main.ts (入口)
    │
    ├─ ConversionService (转换服务)
    │   └─ AIService (AI 调用)
    │
    ├─ FileProcessor (文件处理)
    │   └─ 读取→验证→Base64 编码
    │
└─ ConversionModal (UI 对话框)
        └─ 文件选择
```

### 现有流程（仅支持图片）

```
用户选择文件
    ↓
ConversionModal.onOpen()
    ↓ 文件选择
FileProcessor.processFile()
    ├─ 获取 extension
    ├─ 查询 SUPPORTED_FILE_TYPES
    ├─ readFile()
    ├─ arrayBufferToBase64()
    └─ return FileData
        {
            path: string
            base64: string (整个文件的 Base64)
            mimeType: string
            size: number
            name: string
        }
    ↓
ConversionService.convertFile()
    └─ AIService.convertFile()
        └─ 发送 API 请求
```

### FileData 接口现状

```typescript
export interface FileData {
    path: string;
    base64: string;
    mimeType: string;
    size: number;
    name: string;
}
```

---

## 实现计划（分 5 步）

### ✅ Step 1：修改 package.json（3 行改动）

**目的**：添加 pdfjs-dist 依赖

**修改内容**：
- 在 devDependencies 之前添加 dependencies 对象
- 添加 "pdfjs-dist": "^4.0.379"

**预期**：npm install 后获得 PDF 处理能力

---

### ✅ Step 2：创建新文件 src/utils/pdf-processor.ts（300 行）

**目的**：PDF 流式处理的核心逻辑

**包含内容**：
- `PDFProcessor` 类
- `initWorker()` - Worker 初始化
- `streamConvertPdfToImages()` - 流式处理（关键方法）
- `getPdfInfo()` - 获取 PDF 信息
- 内存管理（page.cleanup() 等）

**关键特性**：
- 逐页渲染，不全量加载
- 及时释放内存
- 支持进度回调
- 支持中断机制

---

### ✅ Step 3：修改 FileProcessor（5-10 行）

**目的**：增加 PDF 检测能力

**修改点**：
- 在 processFile() 后添加 getMimeType() 公共方法
- 添加 isPdf 标志用于后续路由

**影响范围**：最小（不改变现有逻辑）

---

### ✅ Step 4：修改 ConversionService（80 行）

**目的**：实现 PDF 流式处理逻辑

**修改点**：
- 在 convertFile() 中添加 PDF 检测判断
- 新增 convertPdfStream() 方法（处理多页）
- 保留 convertSingleImage() 方法（现有逻辑）
- 处理结果合并（多页 Markdown 合并）

**流程**：
```
convertFile(path)
    ├─ 检测是否为 PDF
    │   ├─ 是 → convertPdfStream()
    │   └─ 否 → convertSingleImage()
    └─ return ConversionResult
```

---

### ✅ Step 5：修改 main.ts（2 行）

**目的**：初始化 PDF.js Worker

**修改点**：
- import PDFProcessor
- 在 onload() 中调用 PDFProcessor.initWorker()

**时机**：插件启动时执行一次

---

## 实现难度评估

| 步骤 | 难度 | 行数 | 时间 |
|-----|------|------|------|
| Step 1 | 🟢 简单 | 3 | 5 分钟 |
| Step 2 | 🟡 中等 | 300 | 1 小时（可复制） |
| Step 3 | 🟢 简单 | 10 | 10 分钟 |
| Step 4 | 🟡 中等 | 80 | 1 小时 |
| Step 5 | 🟢 简单 | 2 | 5 分钟 |
| **总计** | **中等** | **395** | **2.5 小时** |

---

## 现有代码风险评估

```
✅ 低风险原因：
├─ 新增独立模块（pdf-processor.ts）
├─ 仅在入口点添加判断逻辑
├─ 保留所有现有方法完全不变
├─ 只新增接口字段（不修改）
└─ 图片处理流程 100% 保留

预期影响：
├─ 现有图片功能：无影响 ✅
├─ 现有代码行为：无改变 ✅
├─ 兼容性：完全兼容 ✅
└─ 可回滚性：容易回滚 ✅
```

---

## 代码集成点（关键 4 个）

### 集成点 1：package.json
```json
{
    "dependencies": {
        "pdfjs-dist": "^4.0.379"  ← 新增
    },
    "devDependencies": { ... }
}
```

### 集成点 2：FileProcessor
```typescript
static getMimeType(filePath: string): string {
    const extension = this.getFileExtension(filePath);
    return SUPPORTED_FILE_TYPES[extension as keyof typeof SUPPORTED_FILE_TYPES];
}
```

### 集成点 3：ConversionService
```typescript
async convertFile(filePath: string) {
    const mimeType = FileProcessor.getMimeType(filePath);
    
    if (mimeType === "application/pdf") {
        return await this.convertPdfStream(filePath);  ← 新增分支
    } else {
        return await this.convertSingleImage(filePath);  ← 保留
    }
}
```

### 集成点 4：main.ts
```typescript
import { PDFProcessor } from "./utils/pdf-processor";  ← 新增导入

async onload() {
    PDFProcessor.initWorker();  ← 新增初始化
    // ... 其他代码 ...
}
```

---

## 下一步行动

准备开始实现？建议按以下顺序：

1. **Step 1** → 修改 package.json（最快）
2. **Step 5** → 修改 main.ts 导入（建立基础）
3. **Step 2** → 创建 pdf-processor.ts（最复杂，可复制）
4. **Step 3** → 修改 FileProcessor（简单）
5. **Step 4** → 修改 ConversionService（需要理解上下文）

预期进度：2.5-3 小时完成全部实现。

---

让我现在开始实现！ 🚀
