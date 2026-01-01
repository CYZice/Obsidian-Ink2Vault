import { requestUrl } from "obsidian";
import { FileData, AIProvider } from "../types";

/**
 * AI提供商基类
 * 提供通用的请求处理和错误处理逻辑
 */
export abstract class BaseAIProvider implements AIProvider {
    abstract name: string;
    
    /**
     * 发送转换请求
     * 
     * @param fileData 文件数据
     * @param prompt 转换提示词
     * @returns Promise<string> 转换后的Markdown内容
     */
    async convert(fileData: FileData, prompt: string): Promise<string> {
        const startTime = Date.now();
        
        try {
            // 构建请求体
            const requestBody = this.buildRequestBody(fileData, prompt);
            
            // 发送请求
            const response = await this.sendRequest(requestBody);
            
            // 解析响应
            const markdown = this.parseResponse(response);
            
            // 清理Markdown（移除可能的代码块标记）
            const cleanedMarkdown = this.cleanMarkdown(markdown);
            
            console.log(`${this.name} 转换完成，耗时: ${Date.now() - startTime}ms`);
            
            return cleanedMarkdown;
            
        } catch (error) {
            console.error(`${this.name} 转换失败:`, error);
            throw new Error(`${this.name} 转换失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * 构建请求体（由子类实现）
     */
    protected abstract buildRequestBody(fileData: FileData, prompt: string): unknown;
    
    /**
     * 发送HTTP请求
     * 
     * @param requestBody 请求体
     * @returns Promise<unknown> 响应数据
     */
    protected async sendRequest(requestBody: unknown): Promise<unknown> {
        const url = this.getApiUrl();
        const headers = this.getHeaders();
        
        const response = await requestUrl({
            url: url,
            method: "POST",
            headers: headers,
            body: JSON.stringify(requestBody),
            throw: false
        });
        
        // 检查响应状态
        if (response.status !== 200) {
            const errorMessage = this.parseErrorResponse(response);
            throw new Error(errorMessage);
        }
        
        return response.json;
    }
    
    /**
     * 解析响应（由子类实现）
     */
    protected abstract parseResponse(response: unknown): string;
    
    /**
     * 获取API URL（由子类实现）
     */
    protected abstract getApiUrl(): string;
    
    /**
     * 获取请求头（由子类实现）
     */
    protected abstract getHeaders(): Record<string, string>;
    
    /**
     * 解析错误响应
     * 
     * @param response 响应对象
     * @returns string 错误消息
     */
    protected parseErrorResponse(response: { status: number; json: unknown }): string {
        const json = response.json as any;
        
        if (response.status === 401) {
            return "API密钥无效或已过期";
        }
        
        if (response.status === 429) {
            return "请求过于频繁，请稍后再试";
        }
        
        if (json?.error?.message) {
            return json.error.message;
        }
        
        if (json?.message) {
            return json.message;
        }
        
        return `请求失败，状态码: ${response.status}`;
    }
    
    /**
     * 清理Markdown内容
     * 移除可能的代码块标记
     * 
     * @param markdown 原始Markdown
     * @returns string 清理后的Markdown
     */
    protected cleanMarkdown(markdown: string): string {
        return markdown
            .trim()
            .replace(/^```markdown\n?/, "")
            .replace(/^```md\n?/, "")
            .replace(/\n?```$/, "")
            .trim();
    }
    
    /**
     * 验证配置是否有效（由子类实现）
     */
    abstract validateConfig(): boolean;
}
