import { BaseAIProvider } from "./base-provider";
import { FileData } from "../types";
import { OpenAIConfig } from "../types";

/**
 * OpenAI API请求体接口
 */
interface OpenAIRequest {
    model: string;
    messages: Array<{
        role: string;
        content: string | Array<{
            type: string;
            text?: string;
            image_url?: {
                url: string;
            };
        }>;
    }>;
    max_tokens?: number;
}

/**
 * OpenAI API响应接口
 */
interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
    error?: {
        message: string;
    };
}

/**
 * OpenAI AI提供商
 * 基于markdown-next-ai的架构，使用标准的/chat/completions接口
 */
export class OpenAIProvider extends BaseAIProvider {
    name = "OpenAI";
    
    private config: OpenAIConfig;
    
    constructor(config: OpenAIConfig) {
        super();
        this.config = config;
    }
    
    /**
     * 构建OpenAI API请求体
     * 使用标准的chat/completions格式
     */
    protected buildRequestBody(fileData: FileData, prompt: string): unknown {
        const dataUrl = `data:${fileData.mimeType};base64,${fileData.base64}`;
        
        const requestBody: OpenAIRequest = {
            model: this.config.model || "gpt-4-vision-preview",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: dataUrl
                            }
                        }
                    ]
                }
            ],
            max_tokens: 4096
        };
        
        return requestBody;
    }
    
    /**
     * 解析OpenAI API响应
     */
    protected parseResponse(response: unknown): string {
        const openaiResponse = response as OpenAIResponse;
        
        // 检查错误
        if (openaiResponse.error) {
            throw new Error(openaiResponse.error.message);
        }
        
        // 提取Markdown内容
        const markdownText = openaiResponse.choices?.[0]?.message?.content || "";
        
        if (!markdownText) {
            throw new Error("未收到有效的响应内容");
        }
        
        return markdownText;
    }
    
    /**
     * 获取OpenAI API URL
     */
    protected getApiUrl(): string {
        const baseUrl = this.config.baseUrl || "https://api.openai.com/v1";
        const normalizedUrl = baseUrl.replace(/\/$/, "");
        return `${normalizedUrl}/chat/completions`;
    }
    
    /**
     * 获取请求头
     */
    protected getHeaders(): Record<string, string> {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.config.apiKey}`
        };
    }
    
    /**
     * 验证配置是否有效
     */
    validateConfig(): boolean {
        return !!(this.config.apiKey && this.config.enabled);
    }
}
