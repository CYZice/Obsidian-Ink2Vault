import { App, Notice, TFile } from "obsidian";
import { DEFAULT_CONVERSION_PROMPT } from "./defaults";
import { FileProcessor } from "./file-processor";
import { AIService } from "./services/ai-service";
import { ConversionResult, FileData, PluginSettings, ProgressCallback } from "./types";
import { PDFProcessor } from "./utils/pdf-processor";

export class ConversionService {
    private app: App;
    private settings: PluginSettings;
    private aiService: AIService;

    constructor(app: App, settings: PluginSettings) {
        this.app = app;
        this.settings = settings;
        this.aiService = new AIService(settings, app);
    }

    updateSettings(settings: PluginSettings): void {
        this.settings = settings;
        this.aiService.updateSettings(settings);
    }

    private getConversionPrompt(): string {
        return this.settings.conversionPrompt || DEFAULT_CONVERSION_PROMPT;
    }

    async convertFile(filePath: string): Promise<ConversionResult> {
        const startTime = Date.now();

        try {
            // 检测文件类型
            const mimeType = FileProcessor.getFileMimeType(filePath);

            // 判断是否为 PDF
            if (mimeType === "application/pdf") {
                // PDF 流式处理（新增）
                return await this.convertPdfStream(filePath, startTime);
            } else {
                // 单张图片处理（保留原有逻辑）
                return await this.convertSingleImage(filePath, startTime);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`转换失败: ${errorMessage}`, 5000);
            console.error("转换失败:", error);

            return {
                markdown: "",
                sourcePath: filePath,
                outputPath: "",
                provider: this.settings.currentModel || "unknown",
                duration: Date.now() - startTime,
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * 单张图片转换（原有逻辑）
     */
    private async convertSingleImage(filePath: string, startTime: number): Promise<ConversionResult> {
        try {
            const fileData = await FileProcessor.processFile(filePath, this.app);

            const prompt = this.getConversionPrompt();

            new Notice(`正在使用 AI 转换文件...`, 3000);

            const conversionResult = await this.aiService.convertFile(fileData, prompt);

            const outputPath = await this.saveConversionResult(
                fileData,
                conversionResult.markdown,
                this.extractSuggestedFilename(conversionResult.markdown)
            );

            new Notice(`转换成功！耗时: ${conversionResult.duration}ms`, 3000);

            return {
                ...conversionResult,
                outputPath,
                sourcePath: filePath
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`转换失败: ${errorMessage}`, 5000);
            console.error("转换失败:", error);

            return {
                markdown: "",
                sourcePath: filePath,
                outputPath: "",
                provider: this.settings.currentModel || "unknown",
                duration: Date.now() - startTime,
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * PDF 流式处理（新增）
     * 逐页转换，及时释放内存，合并结果
     */
    private async convertPdfStream(filePath: string, startTime: number): Promise<ConversionResult> {
        const markdownParts: string[] = [];
        let totalPages = 0;
        let successPages = 0;
        let failedPages: number[] = [];

        try {
            // 1. 读取 PDF 文件
            const file = this.app.vault.getAbstractFileByPath(filePath) as TFile;
            if (!file) {
                throw new Error(`文件不存在: ${filePath}`);
            }

            const arrayBuffer = await this.app.vault.readBinary(file);

            // 2. 获取 PDF 信息
            const pdfInfo = await PDFProcessor.getPdfInfo(arrayBuffer);
            totalPages = pdfInfo.numPages;

            new Notice(`开始处理 PDF，共 ${totalPages} 页`, 3000);

            const prompt = this.getConversionPrompt();

            // 3. 流式处理每一页
            await PDFProcessor.streamConvertPdfToImages(
                arrayBuffer,
                async (base64: string, pageNum: number) => {
                    try {
                        // 为每一页创建临时 FileData
                        const pageFileData: FileData = {
                            path: `${filePath}#page${pageNum}`,
                            name: `Page ${pageNum}`,
                            base64: base64,
                            mimeType: "image/jpeg",
                            size: base64.length,
                            isPdf: true
                        };

                        // 调用 AI 转换这一页
                        new Notice(`正在转换第 ${pageNum}/${totalPages} 页...`, 2000);

                        const result = await this.aiService.convertFile(pageFileData, prompt);

                        if (result.success !== false) {
                            // 追加到 Markdown（带分隔符）
                            if (pageNum > 1) {
                                markdownParts.push('\n\n---\n\n');
                            }
                            markdownParts.push(`## 第 ${pageNum} 页\n\n${result.markdown}`);
                            successPages++;
                        } else {
                            failedPages.push(pageNum);
                            markdownParts.push(
                                `\n\n---\n\n## 第 ${pageNum} 页\n\n> [!ERROR] 转换失败: ${result.error}`
                            );
                        }

                    } catch (pageError) {
                        failedPages.push(pageNum);
                        const errMsg = pageError instanceof Error ? pageError.message : String(pageError);
                        console.error(`第 ${pageNum} 页转换失败:`, errMsg);
                        markdownParts.push(
                            `\n\n---\n\n## 第 ${pageNum} 页\n\n> [!ERROR] 转换失败: ${errMsg}`
                        );
                    }
                },
                (current: number, total: number, message: string) => {
                    // 进度更新
                    new Notice(message, 1000);
                },
                {
                    scale: 1.5,
                    quality: 0.8,
                    format: 'jpeg',
                    timeoutPerPage: this.settings.timeout || 30000,
                    onCancel: () => false // 可以在这里实现中断逻辑
                }
            );

            // 4. 合并所有页面的 Markdown
            const finalMarkdown = markdownParts.join('');

            // 5. 提取文件名
            const fileName = FileProcessor.getFileName(filePath);
            const fileData: FileData = {
                path: filePath,
                base64: "",
                mimeType: "application/pdf",
                size: 0,
                name: fileName,
                isPdf: true
            };

            // 6. 保存文件
            const outputPath = await this.saveConversionResult(
                fileData,
                finalMarkdown,
                this.extractSuggestedFilename(finalMarkdown)
            );

            const duration = Date.now() - startTime;

            // 7. 显示完成消息
            const message = failedPages.length > 0
                ? `转换完成！成功 ${successPages}/${totalPages} 页（失败: 第 ${failedPages.join(', ')} 页）`
                : `转换成功！${totalPages} 页，耗时: ${(duration / 1000).toFixed(1)}s`;

            new Notice(message, 5000);

            return {
                markdown: finalMarkdown,
                sourcePath: filePath,
                outputPath,
                provider: this.settings.currentModel || "unknown",
                duration,
                success: failedPages.length === 0,
                error: failedPages.length > 0 ? `部分页面转换失败: ${failedPages.join(', ')}` : undefined
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            new Notice(`PDF 转换失败: ${errorMessage}`, 5000);
            console.error("PDF 转换失败:", error);

            return {
                markdown: markdownParts.join(''), // 返回已成功的部分
                sourcePath: filePath,
                outputPath: "",
                provider: this.settings.currentModel || "unknown",
                duration: Date.now() - startTime,
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * 从Markdown内容中提取建议的文件名
     * 
     * @param markdown Markdown内容
     * @returns string | undefined 建议的文件名，如果没有找到则返回undefined
     */
    private extractSuggestedFilename(markdown: string): string | undefined {
        // 尝试从Markdown的第一行标题提取文件名
        const firstLine = markdown.split('\n')[0].trim();

        // 检查是否是标题（# 开头）
        if (firstLine.startsWith('#')) {
            const title = firstLine.replace(/^#+\s*/, '').trim();
            // 清理文件名中的非法字符
            const cleanName = title
                .replace(/[<>:"/\\|?*]/g, '')
                .replace(/\s+/g, '-')
                .substring(0, 100); // 限制长度

            if (cleanName.length > 0) {
                return cleanName;
            }
        }

        return undefined;
    }

    async convertFiles(
        filePaths: string[],
        onProgress?: ProgressCallback
    ): Promise<ConversionResult[]> {
        const results: ConversionResult[] = [];
        const total = filePaths.length;

        for (let i = 0; i < total; i++) {
            const filePath = filePaths[i];

            try {
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total,
                        message: `正在转换: ${FileProcessor.getFileName(filePath)}`
                    });
                }

                const result = await this.convertFile(filePath);
                results.push(result);

            } catch (error) {
                console.error(`转换文件失败: ${filePath}`, error);
                results.push({
                    markdown: "",
                    sourcePath: filePath,
                    outputPath: "",
                    provider: this.settings.currentModel || "unknown",
                    duration: 0,
                    success: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return results;
    }

    /**
     * 保存转换结果
     * 
     * @param fileData 原始文件数据
     * @param markdown 转换后的Markdown内容
     * @param suggestedFilename 建议的文件名（可选）
     * @returns Promise<string> 输出文件路径
     */
    private async saveConversionResult(
        fileData: FileData,
        markdown: string,
        suggestedFilename?: string
    ): Promise<string> {
        const { outputSettings } = this.settings;

        // 确定输出目录
        let outputDir = outputSettings.outputDir;
        if (!outputDir.startsWith("/")) {
            outputDir = "/" + outputDir;
        }

        // 确保输出目录存在
        const outputFolder = this.app.vault.getAbstractFileByPath(outputDir.slice(1));
        if (!outputFolder) {
            await this.app.vault.createFolder(outputDir.slice(1));
        }

        // 确定输出文件名
        let outputFileName: string;
        if (outputSettings.keepOriginalName) {
            // 移除原始扩展名
            const baseName = fileData.name.replace(/\.[^/.]+$/, "");
            outputFileName = `${baseName}.${outputSettings.outputExtension}`;
        } else if (suggestedFilename) {
            // 使用建议的文件名
            outputFileName = suggestedFilename.endsWith(`.${outputSettings.outputExtension}`)
                ? suggestedFilename
                : `${suggestedFilename}.${outputSettings.outputExtension}`;
        } else {
            // 使用时间戳
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
            outputFileName = `converted-${timestamp}.${outputSettings.outputExtension}`;
        }

        // 构建完整输出路径
        const outputPath = `${outputDir.slice(1)}/${outputFileName}`;

        // 检查文件是否已存在
        const existingFile = this.app.vault.getAbstractFileByPath(outputPath);
        if (existingFile instanceof TFile) {
            // 文件已存在，询问是否覆盖（这里简化为直接覆盖）
            await this.app.vault.modify(existingFile, markdown);
        } else {
            // 创建新文件
            await this.app.vault.create(outputPath, markdown);
        }

        // 如果启用自动打开，打开文件
        if (outputSettings.autoOpen) {
            const newFile = this.app.vault.getAbstractFileByPath(outputPath);
            if (newFile instanceof TFile) {
                await this.app.workspace.openLinkText(newFile.path, "", true);
            }
        }

        return outputPath;
    }

    validateConfig(): boolean {
        return this.aiService.validateConfig();
    }

    static getSupportedFileTypes(): string[] {
        return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".pdf"];
    }

    static isFileSupported(filePath: string): boolean {
        return FileProcessor.isFileSupported(filePath);
    }
}




