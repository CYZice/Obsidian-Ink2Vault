import { App, Notice, TFile } from "obsidian";
import { MAX_FILE_SIZE, SUPPORTED_FILE_TYPES } from "./defaults";
import { FileData } from "./types";

/**
 * 文件处理工具类
 * 负责读取文件、验证格式、转换为Base64编码
 */
export class FileProcessor {

    /**
     * 处理文件并返回FileData
     * 
     * @param filePath 文件路径
     * @param app Obsidian App实例
     * @returns Promise<FileData> 处理后的文件数据
     * @throws Error 如果文件处理失败
     */
    static async processFile(filePath: string, app: App): Promise<FileData> {
        // 获取文件扩展名
        const extension = this.getFileExtension(filePath);

        // 验证文件类型
        const mimeType = SUPPORTED_FILE_TYPES[extension as keyof typeof SUPPORTED_FILE_TYPES];
        if (!mimeType) {
            throw new Error(`不支持的文件类型: ${extension}`);
        }

        // 读取文件
        const arrayBuffer = await this.readFile(filePath, app);

        // 验证文件大小
        const fileSize = arrayBuffer.byteLength;
        if (fileSize > MAX_FILE_SIZE) {
            throw new Error(`文件过大: ${this.formatFileSize(fileSize)} (最大支持 ${this.formatFileSize(MAX_FILE_SIZE)})`);
        }

        // 转换为Base64
        const base64 = this.arrayBufferToBase64(arrayBuffer);

        // 获取文件名
        const fileName = this.getFileName(filePath);

        return {
            path: filePath,
            base64: base64,
            mimeType: mimeType,
            size: fileSize,
            name: fileName
        };
    }

    /**
     * 批量处理文件
     * 
     * @param filePaths 文件路径数组
     * @param app Obsidian App实例
     * @param onProgress 进度回调
     * @returns Promise<FileData[]> 处理后的文件数据数组
     */
    static async processFiles(
        filePaths: string[],
        app: App,
        onProgress?: (current: number, total: number, message: string) => void
    ): Promise<FileData[]> {
        const results: FileData[] = [];
        const total = filePaths.length;

        for (let i = 0; i < total; i++) {
            const filePath = filePaths[i];

            try {
                if (onProgress) {
                    onProgress(i + 1, total, `正在处理: ${this.getFileName(filePath)}`);
                }

                const fileData = await this.processFile(filePath, app);
                results.push(fileData);

            } catch (error) {
                console.error(`处理文件失败: ${filePath}`, error);
                new Notice(`处理文件失败: ${this.getFileName(filePath)}`, 5000);
                // 继续处理其他文件
            }
        }

        return results;
    }

    /**
     * 读取文件内容
     * 
     * @param filePath 文件路径
     * @param app Obsidian App实例
     * @returns Promise<ArrayBuffer> 文件内容
     */
    private static async readFile(filePath: string, app: App): Promise<ArrayBuffer> {
        try {
            // 在Obsidian环境中，使用app.vault.readBinary
            const file = app.vault.getAbstractFileByPath(filePath);
            if (!file || !(file instanceof TFile)) {
                throw new Error(`文件不存在: ${filePath}`);
            }

            const arrayBuffer = await app.vault.readBinary(file);
            return arrayBuffer;
        } catch (error) {
            throw new Error(`读取文件失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * 将ArrayBuffer转换为Base64字符串
     * 
     * @param buffer ArrayBuffer
     * @returns string Base64字符串
     */
    private static arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = "";
        const len = bytes.byteLength;

        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary);
    }

    /**
     * 获取文件扩展名
     * 
     * @param filePath 文件路径
     * @returns string 文件扩展名（包含点）
     */
    private static getFileExtension(filePath: string): string {
        const lastDotIndex = filePath.lastIndexOf(".");
        if (lastDotIndex === -1) {
            return "";
        }
        return filePath.slice(lastDotIndex).toLowerCase();
    }

    /**
     * 获取文件名（不含路径）
     * 
     * @param filePath 文件路径
     * @returns string 文件名
     */
    static getFileName(filePath: string): string {
        const lastSlashIndex = Math.max(
            filePath.lastIndexOf("/"),
            filePath.lastIndexOf("\\")
        );

        if (lastSlashIndex === -1) {
            return filePath;
        }

        return filePath.slice(lastSlashIndex + 1);
    }

    /**
     * 格式化文件大小
     * 
     * @param bytes 字节数
     * @returns string 格式化后的文件大小
     */
    private static formatFileSize(bytes: number): string {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    /**
     * 检查文件是否支持
     * 
     * @param filePath 文件路径
     * @returns boolean 是否支持
     */
    static isFileSupported(filePath: string): boolean {
        const extension = this.getFileExtension(filePath);
        return extension in SUPPORTED_FILE_TYPES;
    }

    /**
     * 获取文件的MIME类型
     * 
     * @param filePath 文件路径
     * @returns string | undefined MIME类型
     */
    static getFileMimeType(filePath: string): string | undefined {
        const extension = this.getFileExtension(filePath);
        return SUPPORTED_FILE_TYPES[extension as keyof typeof SUPPORTED_FILE_TYPES];
    }
}

