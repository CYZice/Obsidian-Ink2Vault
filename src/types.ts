import { MODEL_CATEGORIES } from "./constants";

export type ModelCategory = typeof MODEL_CATEGORIES[keyof typeof MODEL_CATEGORIES];

export interface ProviderConfig {
    apiKey: string;
    baseUrl: string;
    enabled: boolean;
    name?: string;
    type?: string;
}

export interface ModelConfig {
    id: string;
    name: string;
    provider: string;
    model: string;
    enabled: boolean;
    category: ModelCategory;
    actualModel?: string;
    type?: string;
    apiKey?: string;
    baseUrl?: string;
}

export interface CommonPrompt {
    id: string;
    name: string;
    content: string;
}

export interface GlobalRule {
    id: string;
    name: string;
    content: string;
    description?: string;
    category?: string;
    priority?: number;
    enabled: boolean;
    createdAt?: number;
    updatedAt?: number;
}

export interface ImageData {
    id: string | number;
    name: string;
    url: string;
    base64: string;
    type: string;
    size: number;
    fromInline?: boolean;
}

export interface TextContext {
    selectedText: string;
    beforeText: string;
    afterText: string;
    cursorPosition: { line: number; ch: number };
    filePath?: string;
    lineNumber?: number;
    additionalContext?: string;
    contextContent?: string;
}

export interface CursorPosition {
    left: number;
    top: number;
    height?: number;
}

export interface SelectedContext {
    files: Array<{ name: string; path: string; extension?: string }>;
    folders: Array<{ name: string; path: string }>;
}

export interface EventListenerInfo {
    element: HTMLElement | Document;
    event: string;
    handler: EventListener;
}

export interface APIModelConfig {
    apiKey: string;
    baseUrl: string;
    model: string;
}

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface AvailableModel {
    id: string;
    name: string;
    provider: string;
}

export interface PluginSettings {
    providers: Record<string, ProviderConfig>;
    models: Record<string, ModelConfig>;
    currentModel: string;
    timeout: number;
    maxTokens: number;
    conversionPrompt?: string;
    outputSettings: OutputSettings;
    advancedSettings: AdvancedSettings;
    legacyProviders?: ProviderConfigs;
    activeProvider?: string;
    enableGlobalRules?: boolean;
    globalRules?: GlobalRule[];
    apiKeyLinks?: Record<string, string>;
    commonPrompts: CommonPrompt[];
    enableRightClick?: boolean;
    enableAtTrigger?: boolean;
    maxContextLines?: number;
    maxContextChars?: number;
    ruleTemplates?: GlobalRule[];
}

export interface ProviderConfigs {
    gemini?: GeminiConfig;
    claude?: ClaudeConfig;
    openai?: OpenAIConfig;
    ollama?: OllamaConfig;
}

export interface GeminiConfig {
    apiKey: string;
    model?: string;
    enabled: boolean;
}

export interface ClaudeConfig {
    apiKey: string;
    model?: string;
    enabled: boolean;
}

export interface OpenAIConfig {
    apiKey: string;
    baseUrl?: string;
    model?: string;
    enabled: boolean;
}

export interface OllamaConfig {
    url: string;
    model?: string;
    enabled: boolean;
}

export interface OutputSettings {
    outputDir: string;
    keepOriginalName: boolean;
    outputExtension: string;
    autoOpen: boolean;
}

export interface AdvancedSettings {
    timeout: number;
    maxRetries: number;
    verboseLogging: boolean;
    useStreaming: boolean;
}

export interface FileData {
    path: string;
    base64: string;
    mimeType: string;
    size: number;
    name: string;
    isPdf?: boolean;
}

export interface ConversionResult {
    markdown: string;
    sourcePath: string;
    outputPath: string;
    provider: string;
    duration: number;
    success: boolean;
    error?: string;
    suggestedFilename?: string;
    modelId?: string;
    modelName?: string;
    tokensUsed?: number;
    cacheHit?: boolean;
    retryCount?: number;
    warnings?: string[];
}

export interface AIProvider {
    name: string;
    convert(fileData: FileData, prompt: string): Promise<string>;
    validateConfig(): boolean;
}

export interface ProgressCallback {
    (progress: {
        current: number;
        total: number;
        message: string;
    }): void;
}
