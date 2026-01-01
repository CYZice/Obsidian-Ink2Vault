import { FileData } from "../types";
import { BaseAIProvider } from "./base-provider";

/**
 * Claude API请求体接口
 */
interface ClaudeRequest {
    model: string;
    max_tokens: number;
    messages: Array<{
        role: string;
        content: Array<{
            type: string;
            text?: string;
            source?: {
                type: string;
                media_type: string;
                data: string;
            };
        }>;
    }>;
}

/**
 * Claude API响应接口
 */
interface ClaudeResponse {
    content: Array<{
        text: string;
    }>;
    error?: {
        message: string;
    };
}

/**
 * Claude AI提供商
 * 基于noted.md的claude_client.rs实现
 */
export class ClaudeProvider extends BaseAIProvider {
    name = "Claude";

    private config: any;

    constructor(config: any) {
        super();
        this.config = config;
    }

    /**
     * 构建Claude API请求体
     * 参考noted.md的claude_client.rs实现
     */
    protected buildRequestBody(fileData: FileData, prompt: string): unknown {
        // 确定文件类型：PDF使用document，其他使用image
        const fileType = fileData.mimeType === "application/pdf" ? "document" : "image";

        const requestBody: ClaudeRequest = {
            model: this.config.model || "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: fileType,
                            source: {
                                type: "base64",
                                media_type: fileData.mimeType,
                                data: fileData.base64
                            }
                        },
                        {
                            type: "text",
                            text: prompt
                        }
                    ]
                }
            ]
        };

        return requestBody;
    }

    /**
     * 解析Claude API响应
     * 参考noted.md的claude_client.rs实现
     */
    protected parseResponse(response: unknown): string {
        const claudeResponse = response as ClaudeResponse;

        // 检查错误
        if (claudeResponse.error) {
            throw new Error(claudeResponse.error.message);
        }

        // 提取Markdown内容
        const markdownText = claudeResponse.content?.[0]?.text || "";

        if (!markdownText) {
            throw new Error("未收到有效的响应内容");
        }

        return markdownText;
    }

    /**
     * 获取Claude API URL
     */
    protected getApiUrl(): string {
        return "https://api.anthropic.com/v1/messages";
    }

    /**
     * 获取请求头
     * 参考noted.md的claude_client.rs实现
     */
    protected getHeaders(): Record<string, string> {
        return {
            "Content-Type": "application/json",
            "x-api-key": this.config.apiKey,
            "anthropic-version": "2023-06-01"
        };
    }

    /**
     * 验证配置是否有效
     */
    validateConfig(): boolean {
        return !!(this.config.apiKey && this.config.enabled);
    }
}
