import { App } from "obsidian";
import { FileData } from "../types";

/**
 * Excalidraw 处理器
 * 调用已安装的 Excalidraw 插件 API 将 .excalidraw 文件转换为 PNG
 */
export class ExcalidrawProcessor {
    /**
     * 检查 Excalidraw 插件是否可用
     * 
     * @param app Obsidian App 实例
     * @returns 如果插件可用返回 true，否则返回 false
     */
    static isExcalidrawAvailable(app: App): boolean {
        try {
            // @ts-ignore - 插件管理器的内部 API
            const excalidrawPlugin = app.plugins.getPlugin("obsidian-excalidraw-plugin");
            // 只要插件存在，就认为可用（ea 可能延迟加载）
            return !!excalidrawPlugin;
        } catch {
            return false;
        }
    }

    /**
     * 将 Excalidraw JSON 转换为 PNG Base64 (data URL)
     * 仅在需要时调用，且只有当 Excalidraw 插件可用时才能成功
     * 
     * @param app Obsidian App 实例
     * @param jsonContent Excalidraw JSON 文件内容
     * @param filePath 文件路径
     * @returns FileData 对象，包含 PNG 的 Base64 编码；如果插件不可用返回降级方案
     * @throws Error 如果转换失败
     */
    static async convertExcalidrawToPng(
        app: App,
        jsonContent: string,
        filePath: string
    ): Promise<FileData> {
        try {
            // 1. 获取 Excalidraw 插件实例（按需调用，不强制）
            // @ts-ignore - 插件管理器的内部 API
            const excalidrawPlugin = app.plugins.getPlugin("obsidian-excalidraw-plugin");

            // 如果插件不存在，返回降级方案（直接返回 JSON 内容作为 Base64）
            if (!excalidrawPlugin) {
                console.warn("Excalidraw 插件未安装，使用降级方案");
                return this.getFallbackFileData(jsonContent, filePath);
            }

            // 2. 获取 ExcalidrawAutomate (EA) 接口
            // 这是官方推荐的 API 访问点
            const ea = excalidrawPlugin.ea;

            // 如果 ea 不可用，也可以尝试其他 API（兼容性考虑）
            if (!ea && !excalidrawPlugin.excalidrawAPI) {
                console.warn("ExcalidrawAutomate API 不可用，使用降级方案");
                return this.getFallbackFileData(jsonContent, filePath);
            }

            // 3. 解析 Excalidraw JSON
            let scene: any;
            try {
                scene = JSON.parse(jsonContent);
            } catch (parseError) {
                throw new Error("Invalid Excalidraw JSON format");
            }

            // 4. 验证 scene 结构
            if (!scene.elements || !Array.isArray(scene.elements)) {
                throw new Error("Invalid Excalidraw file structure: missing elements");
            }

            // 5. 尝试使用 EA API 创建 PNG
            if (ea && typeof ea.createPNG === 'function') {
                const blob = await ea.createPNG(
                    filePath,
                    1, // 缩放比例
                    scene.elements,
                    scene.appState,
                    scene.files
                );

                if (blob) {
                    // 6. 转换 Blob 为 Base64 Data URL
                    const arrayBuffer = await blob.arrayBuffer();
                    const base64 = this.arrayBufferToBase64(arrayBuffer);
                    const dataUrl = `data:image/png;base64,${base64}`;

                    // 7. 提取文件名
                    const fileName = filePath
                        .split("/")
                        .pop()
                        ?.replace(/\.excalidraw(\.md)?$/i, "") || "drawing";

                    // 8. 返回 FileData
                    return {
                        path: filePath,
                        base64: dataUrl,
                        mimeType: "image/png",
                        size: base64.length,
                        name: fileName,
                    };
                }
            }

            // 如果 EA API 不可用或失败，使用降级方案
            console.warn("ExcalidrawAutomate createPNG 不可用或失败，使用降级方案");
            return this.getFallbackFileData(jsonContent, filePath);

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            console.error(`Excalidraw PNG conversion failed: ${msg}`);
            // 转换失败时，也返回降级方案而不是抛出错误
            return this.getFallbackFileData(jsonContent, filePath);
        }
    }

    /**
     * 获取降级方案：当 Excalidraw 插件不可用时使用
     * 返回 Excalidraw JSON 的 Base64 编码
     * 
     * @param jsonContent Excalidraw JSON 内容
     * @param filePath 文件路径
     * @returns FileData 对象
     */
    private static getFallbackFileData(jsonContent: string, filePath: string): FileData {
        const base64 = this.stringToBase64(jsonContent);
        const fileName = filePath
            .split("/")
            .pop()
            ?.replace(/\.excalidraw$/i, "") || "drawing";

        return {
            path: filePath,
            base64: `data:application/json;base64,${base64}`,
            mimeType: "application/json",
            size: base64.length,
            name: fileName,
        };
    }

    /**
     * 将字符串转换为 Base64
     */
    private static stringToBase64(str: string): string {
        return btoa(unescape(encodeURIComponent(str)));
    }

    /**
     * 将 ArrayBuffer 转换为 Base64 字符串
     */
    private static arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);

        // 使用 btoa()，但需要逐块处理避免栈溢出
        let binary = "";
        const chunkSize = 8192; // 每次处理 8KB

        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
            binary += String.fromCharCode(...Array.from(chunk));
        }

        return btoa(binary);
    }
}
