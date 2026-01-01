export const MODEL_CATEGORIES = {
    THINKING: "thinking",
    VISION: "vision",
    MULTIMODAL: "multimodal",
    TEXT: "text",
    IMAGE: "image"
} as const;

export const SYSTEM_PROMPTS: Record<string, string> = {
    continue: "你是一个专业的写作助手。请根据用户提供的上下文，从光标位置开始续写后续内容。重要：只生成新的内容，不要重复或重写已有的内容。",
    convert: "你是一个专业的文档转换助手。请将图片中的手写笔记转换为结构化的Markdown格式。注意标题、列表和其他格式。使用$$语法表示数学公式。不要遗漏原始文本中的任何内容。输出应适合在Obsidian中使用。只返回markdown内容，不要包含其他文本或解释。"
};

export const FILE_EXTENSIONS = {
    IMAGE: ["png", "jpg", "jpeg", "gif", "bmp", "svg", "webp"],
    DOCUMENT: ["md", "txt", "docx", "doc", "pdf", "xlsx", "xls", "epub", "mobi", "csv", "json"]
} as const;

export const IMAGE_CONSTANTS = {
    MAX_FILE_SIZE: 10485760,
    ALLOWED_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp"]
} as const;
