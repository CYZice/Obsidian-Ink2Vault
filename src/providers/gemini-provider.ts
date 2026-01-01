import { BaseAIProvider } from "./base-provider";
import { FileData } from "../types";
import { GeminiConfig } from "../types";

/**
 * Gemini API请求体接口
 */
interface GeminiRequest {
    contents: Array<{
        parts: Array<{
            text?: string;
            inline_data?: {
                mime_type: string;
                data: string;
            };
        }>;
    }>;
}

/**
 * Gemini API响应接口
 */
interface GeminiResponse {
    candidates?: Array<{
        content: {
            parts: Array<{
                text: string;
            }>;
        };
    }>;
    error?: {
        message: string;
    };
}

/**
 * Gemini AI提供商
 * 基于noted.md的gemini_client.rs实现
 */
export class GeminiProvider extends BaseAIProvider {
    name = "Gemini";
    
    private config: GeminiConfig;
    
    constructor(config: GeminiConfig) {
        super();
        this.config = config;
    }
    
    /**
     * 构建Gemini API请求体
     * 参考noted.md的gemini_client.rs实现
     */
    protected buildRequestBody(fileData: FileData, prompt: string): unknown {
        const requestBody: GeminiRequest = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        },
                        {
                            inline_data: {
                                mime_type: fileData.mimeType,
                                data: fileData.base64
                            }
                        }
                    ]
                }
            ]
        };
        
        return requestBody;
    }
    
    /**
     * 解析Gemini API响应
     * 参考noted.md的gemini_client.rs实现
     */
    protected parseResponse(response: unknown): string {
        const geminiResponse = response as GeminiResponse;
        
        // 检查错误
        if (geminiResponse.error) {
            throw new Error(geminiResponse.error.message);
        }
        
        // 提取Markdown内容
        const markdownText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || "";
        
        if (!markdownText) {
            throw new Error("未收到有效的响应内容");
        }
        
        return markdownText;
    }
    
    /**
     * 获取Gemini API URL
     */
    protected getApiUrl(): string {
        const model = this.config.model || "gemma-3-27b-it";
        return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.config.apiKey}`;
    }
    
    /**
     * 获取请求头
     */
    protected getHeaders(): Record<string, string> {
        return {
            "Content-Type": "application/json"
        };
    }
    
    /**
     * 验证配置是否有效
     */
    validateConfig(): boolean {
        return !!(this.config.apiKey && this.config.enabled);
    }
}
