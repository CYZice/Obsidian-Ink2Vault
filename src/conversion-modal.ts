import { App, Modal, Notice, TFile } from "obsidian";
import { ConversionService } from "./conversion-service";
import HandMarkdownAIPlugin from "./main";

/**
 * 文件转换对话框
 * 允许用户选择要转换的文件
 */
export class ConversionModal extends Modal {
    private plugin: HandMarkdownAIPlugin;
    private selectedFiles: TFile[] = [];
    private fileCheckboxes: Map<string, HTMLInputElement> = new Map();

    constructor(app: App, plugin: HandMarkdownAIPlugin) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;

        contentEl.empty();
        contentEl.addClass("hand-markdown-ai-modal");

        // 标题
        contentEl.createEl("h2", {
            text: "转换手写笔记",
            cls: "modal-title"
        });

        // 说明
        const descEl = contentEl.createEl("p", {
            text: "选择要转换的手写笔记文件（支持PNG、JPG、JPEG、PDF等格式）",
            cls: "modal-description"
        });

        // 获取支持的文件
        const supportedFiles = this.getSupportedFiles();

        if (supportedFiles.length === 0) {
            // 没有支持的文件
            const noFilesEl = contentEl.createEl("div", {
                text: "未找到支持的文件。请确保vault中有PNG、JPG、JPEG或PDF格式的文件。",
                cls: "no-files-message"
            });

            // 关闭按钮
            const closeButton = contentEl.createEl("button", {
                text: "关闭",
                cls: "mod-cancel"
            });
            closeButton.onclick = () => {
                this.close();
            };

            return;
        }

        // 文件列表容器
        const fileListContainer = contentEl.createDiv();
        fileListContainer.addClass("file-list-container");

        // 添加全选/取消全选
        const selectAllContainer = fileListContainer.createDiv();
        selectAllContainer.addClass("select-all-container");

        const selectAllCheckbox = selectAllContainer.createEl("input", {
            type: "checkbox",
            cls: "select-all-checkbox"
        });
        const selectAllLabel = selectAllContainer.createEl("label", {
            text: "全选",
            cls: "select-all-label"
        });

        // 全选/取消全选逻辑
        selectAllCheckbox.addEventListener("change", () => {
            const isChecked = selectAllCheckbox.checked;
            this.fileCheckboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            this.updateSelectedFiles();
        });

        // 文件列表
        const fileList = fileListContainer.createDiv();
        fileList.addClass("file-list");

        supportedFiles.forEach(file => {
            const fileItem = fileList.createDiv();
            fileItem.addClass("file-item");

            const checkbox = fileItem.createEl("input", {
                type: "checkbox",
                cls: "file-checkbox"
            });

            const fileName = fileItem.createEl("label", {
                text: file.path,
                cls: "file-name"
            });

            const fileSize = fileItem.createEl("span", {
                text: this.formatFileSize(file.stat.size),
                cls: "file-size"
            });

            // 存储checkbox引用
            this.fileCheckboxes.set(file.path, checkbox);

            // 文件选择变化事件
            checkbox.addEventListener("change", () => {
                this.updateSelectedFiles();
                this.updateSelectAllState();
            });
        });

        // 统计信息
        const statsEl = contentEl.createDiv();
        statsEl.addClass("file-stats");
        statsEl.textContent = `已选择 ${this.selectedFiles.length} / ${supportedFiles.length} 个文件`;

        // 按钮容器
        const buttonContainer = contentEl.createDiv();
        buttonContainer.addClass("modal-button-container");

        // 取消按钮
        const cancelButton = buttonContainer.createEl("button", {
            text: "取消",
            cls: "mod-cancel"
        });
        cancelButton.onclick = () => {
            this.close();
        };

        // 转换按钮
        const convertButton = buttonContainer.createEl("button", {
            text: "开始转换",
            cls: "mod-cta"
        });
        convertButton.onclick = async () => {
            if (this.selectedFiles.length === 0) {
                new Notice("请至少选择一个文件", 3000);
                return;
            }

            this.close();

            // 执行转换
            const filePaths = this.selectedFiles.map(file => file.path);
            await this.plugin.convertFiles(filePaths);
        };
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.fileCheckboxes.clear();
    }

    /**
     * 更新选中的文件列表
     */
    private updateSelectedFiles() {
        this.selectedFiles = [];
        this.fileCheckboxes.forEach((checkbox, filePath) => {
            if (checkbox.checked) {
                const file = this.app.vault.getAbstractFileByPath(filePath);
                if (file instanceof TFile) {
                    this.selectedFiles.push(file);
                }
            }
        });

        // 更新统计信息
        const statsEl = this.contentEl.querySelector(".file-stats");
        if (statsEl) {
            const supportedFiles = this.getSupportedFiles();
            statsEl.textContent = `已选择 ${this.selectedFiles.length} / ${supportedFiles.length} 个文件`;
        }
    }

    /**
     * 更新全选复选框状态
     */
    private updateSelectAllState() {
        const selectAllCheckbox = this.contentEl.querySelector(
            ".select-all-checkbox"
        ) as HTMLInputElement;

        if (selectAllCheckbox) {
            const allChecked = Array.from(this.fileCheckboxes.values()).every(
                checkbox => checkbox.checked
            );
            const someChecked = Array.from(this.fileCheckboxes.values()).some(
                checkbox => checkbox.checked
            );

            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = someChecked && !allChecked;
        }
    }

    /**
     * 获取支持的文件列表
     */
    private getSupportedFiles(): TFile[] {
        const files: TFile[] = [];

        // 遍历vault中的所有文件
        this.app.vault.getFiles().forEach(file => {
            if (ConversionService.isFileSupported(file.path)) {
                files.push(file);
            }
        });

        // 按文件名排序
        files.sort((a, b) => a.path.localeCompare(b.path));

        return files;
    }

    /**
     * 格式化文件大小
     */
    private formatFileSize(bytes: number): string {
        if (bytes === 0) return "0 B";

        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    }
}