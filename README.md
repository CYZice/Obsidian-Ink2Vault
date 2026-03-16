# Hand Markdown AI

一个强大的 Obsidian 插件，可以将手写笔记（PDF、JPG、PNG）转换为 Markdown 格式。支持多种 AI 提供商（Gemini、Claude、OpenAI）。

## 功能特性

- 📝 **多格式支持**：支持 PDF、JPG、PNG 等手写笔记格式
- 🤖 **多 AI 提供商**：支持 Gemini、Claude、OpenAI 等多种 AI 服务
- ⚡ **快捷键操作**：提供快捷键快速转换文件
- 🎨 **美观 UI**：现代化的用户界面设计
- ⚙️ **灵活配置**：丰富的设置选项，支持自定义转换提示词
- 🔄 **批量转换**：支持批量转换多个文件
- 📊 **文件统计**：显示文件大小和转换进度

## 安装方法

### 方法一：手动安装

1. 下载最新版本的插件
2. 将 `Hand-Markdown-AI` 文件夹复制到你的 Obsidian vault 的 `.obsidian/plugins/` 目录下
3. 在 Obsidian 中启用插件

### 方法二：使用插件市场（待发布）

在 Obsidian 的社区插件市场搜索 "Hand Markdown AI" 并安装

## 配置说明

### 1. 选择 AI 提供商

在设置页面选择你要使用的 AI 提供商：
- **Gemini**：Google 的 AI 服务
- **Claude**：Anthropic 的 AI 服务
- **OpenAI**：OpenAI 的 GPT 模型

### 2. 配置 API 密钥

每个提供商都需要配置相应的 API 密钥：
- **Gemini**：在 [Google AI Studio](https://makersuite.google.com/) 获取 API 密钥
- **Claude**：在 [Anthropic Console](https://console.anthropic.com/) 获取 API 密钥
- **OpenAI**：在 [OpenAI Platform](https://platform.openai.com/) 获取 API 密钥

### 3. 配置模型参数

根据需要配置：
- 模型名称（如 gemini-pro、claude-3-opus、gpt-4）
- 自定义 Base URL（可选）
- 温度参数（控制创造性）
- 最大输出令牌数

### 4. 输出设置

- **输出目录**：指定转换后的 Markdown 文件保存位置
- **保留原始文件名**：是否使用原始文件名
- **文件扩展名**：输出的文件扩展名（默认 .md）
- **自动打开文件**：转换后是否自动打开文件

### 5. 高级设置

- **请求超时时间**：API 请求的超时时间（毫秒）
- **最大重试次数**：请求失败时的重试次数
- **显示详细日志**：在控制台显示调试日志
- **使用流式响应**：是否使用流式响应
- **转换提示词**：自定义 AI 转换提示词

## 使用方法

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+C` | 转换单个文件 |
| `Ctrl+Alt+C` | 转换当前文件 |
| `Ctrl+Shift+Alt+C` | 转换选中的文件 |
| `Ctrl+,` | 打开设置 |


### 命令面板

通过 `Ctrl+P` 打开命令面板，输入或搜索以下命令：

- **Hand Markdown AI: 转换当前文件**：将当前激活的文件转换为 Markdown（支持 PDF、JPG、PNG）。
- **Hand Markdown AI: 转换文件夹内所有文件**：弹出文件夹选择框，批量转换所选文件夹及其子文件夹内所有受支持的文件。


### 右键菜单

在文件浏览器或相关界面右键点击时，支持以下菜单功能：

- **文件浏览器右键文件**：受支持格式（PDF、JPG、PNG）文件右键，显示“转换为Markdown”菜单项。
- **输出目录 Markdown 文件**：右键输出目录中的 Markdown 文件，显示“重试失败页（输出文件）”和“重试指定页（输出文件）”菜单项，可针对转换失败的页进行重试。
- **文件夹右键**：右键文件夹，显示“转换此文件夹内所有文件”菜单项，可批量转换整个文件夹。
- **Markdown 预览图片右键**：在 Markdown 预览视图下右键图片（包括 Excalidraw 导出 PNG），显示“转换为Markdown”菜单项。

### Ribbon 图标

点击左侧边栏的 Hand Markdown AI 图标，可以快速转换单个文件

## 文件格式要求

- **PDF**：支持多页 PDF 文件
- **JPG**：支持 JPEG 格式图片
- **PNG**：支持 PNG 格式图片
- **最大文件大小**：10MB

## 转换流程

1. 选择要转换的文件
2. 插件将文件转换为 Base64 格式
3. 发送到 AI 服务进行识别和转换
4. 接收转换结果并保存为 Markdown 文件
5. 可选：自动打开转换后的文件

## 故障排除

### 转换失败

1. 检查 API 密钥是否正确配置
2. 检查网络连接是否正常
3. 查看控制台日志获取详细错误信息
4. 尝试增加超时时间或重试次数

### API 配额限制

- 检查你的 API 账户是否有足够的配额
- 考虑升级到付费计划

### 文件格式不支持

- 确保文件是 PDF、JPG 或 PNG 格式
- 检查文件大小是否超过 10MB 限制

## 开发说明

### 项目结构

```
Hand-Markdown-AI/
├── src/
│   ├── main.ts                 # 主插件类
│   ├── settings-tab.ts         # 设置面板
│   ├── conversion-modal.ts     # 转换对话框
│   ├── conversion-service.ts   # 转换服务
│   ├── file-processor.ts       # 文件处理
│   ├── defaults.ts             # 默认配置
│   ├── types.ts                # 类型定义
│   └── providers/              # AI 提供商适配器
│       ├── base-provider.ts    # 基础提供商类
│       ├── gemini-provider.ts  # Gemini 适配器
│       ├── claude-provider.ts  # Claude 适配器
│       └── openai-provider.ts  # OpenAI 适配器
├── styles.css                  # 样式文件
├── manifest.json               # 插件清单
├── package.json                # 依赖配置
├── tsconfig.json               # TypeScript 配置
└── README.md                   # 说明文档
```

### 构建命令

```bash
# 安装依赖
npm install

# 开发模式（自动编译）
npm run dev

# 生产构建
npm run build

# 版本更新
npm run version
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### v1.0.0 (2024-01-01)

- 初始版本发布
- 支持 PDF、JPG、PNG 格式
- 支持 Gemini、Claude、OpenAI 提供商
- 实现快捷键和命令面板
- 完善的设置面板

## 联系方式

如有问题或建议，请通过以下方式联系：
- GitHub Issues
- Email: your-email@example.com

## 致谢

- [Obsidian](https://obsidian.md/) - 强大的笔记应用
- [noted.md](https://github.com/yourusername/noted.md) - 原始转换逻辑参考
- [markdown-next-ai](https://github.com/yourusername/markdown-next-ai) - 架构设计参考
