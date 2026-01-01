import { Notice, Plugin, TFile } from "obsidian";
import { ConversionModal } from "./conversion-modal";
import { ConversionService } from "./conversion-service";
import { DEFAULT_SETTINGS } from "./defaults";
import { AIService } from "./services/ai-service";
import type { PluginSettings } from "./types";
import { SimpleSettingsTab } from "./ui/simple-settings-tab";
import { PDFProcessor } from "./utils/pdf-processor";

export default class HandMarkdownAIPlugin extends Plugin {
    settings: PluginSettings;
    conversionService: ConversionService;
    aiService: AIService;

    async onload() {
        console.log("加载 Hand Markdown AI 插件");

        await this.loadSettings();

        // 初始化 PDF Worker (Obsidian 内置)
        PDFProcessor.initWorker();

        this.aiService = new AIService(this.settings, this.app);
        this.conversionService = new ConversionService(this.app, this.settings);

        this.addSettingTab(new SimpleSettingsTab(this.app, this));

        this.registerCommands();

        this.registerContextMenu();

        this.addRibbonIcon("file-text", "转换手写笔记", () => {
            this.showConversionModal();
        });

        console.log("Hand Markdown AI 插件加载完成");
    }

    onunload() {
        console.log("卸载 Hand Markdown AI 插件");
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);

        if (this.conversionService) {
            this.conversionService.updateSettings(this.settings);
        }

        if (this.aiService) {
            this.aiService.updateSettings(this.settings);
        }
    }

    /**
     * 注册命令
     */
    private registerCommands() {
        // 转换单个文件
        this.addCommand({
            id: "convert-single-file",
            name: "转换单个文件",
            hotkeys: [
                {
                    modifiers: ["Mod", "Shift"],
                    key: "C"
                }
            ],
            callback: () => {
                this.showConversionModal();
            }
        });

        // 转换当前文件
        this.addCommand({
            id: "convert-current-file",
            name: "转换当前文件",
            hotkeys: [
                {
                    modifiers: ["Mod", "Alt"],
                    key: "C"
                }
            ],
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    return false;
                }

                if (!ConversionService.isFileSupported(activeFile.path)) {
                    return false;
                }

                if (!checking) {
                    this.convertFile(activeFile.path);
                }

                return true;
            }
        });

        // 转换选中的文件
        this.addCommand({
            id: "convert-selected-files",
            name: "转换选中的文件",
            hotkeys: [
                {
                    modifiers: ["Mod", "Shift", "Alt"],
                    key: "C"
                }
            ],
            callback: () => {
                this.showFileSelectionModal();
            }
        });

        // 打开设置
        this.addCommand({
            id: "open-settings",
            name: "打开设置",
            hotkeys: [
                {
                    modifiers: ["Mod"],
                    key: ","
                }
            ],
            callback: () => {
                this.openSettings();
            }
        });

        // 快速转换当前文件（无确认）
        this.addCommand({
            id: "quick-convert-current",
            name: "快速转换当前文件（无确认）",
            hotkeys: [
                {
                    modifiers: ["Mod"],
                    key: "K"
                }
            ],
            checkCallback: (checking: boolean) => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    return false;
                }

                if (!ConversionService.isFileSupported(activeFile.path)) {
                    return false;
                }

                if (!checking) {
                    // 验证配置
                    if (!this.conversionService.validateConfig()) {
                        new Notice("请先在设置中配置AI提供商", 5000);
                        this.openSettings();
                        return;
                    }

                    // 直接执行转换，不显示确认
                    this.convertFile(activeFile.path);
                }

                return true;
            }
        });

        this.addCommand({
            id: "toggle-model",
            name: "切换AI模型",
            callback: () => {
                this.toggleModel();
            }
        });
    }

    /**
     * 注册右键菜单
     */
    private registerContextMenu() {
        this.registerEvent(
            this.app.workspace.on("file-menu", (menu, file) => {
                if (file instanceof TFile && ConversionService.isFileSupported(file.path)) {
                    menu.addItem((item) => {
                        item
                            .setTitle("转换为Markdown")
                            .setIcon("file-text")
                            .onClick(() => {
                                this.convertFile(file.path);
                            });
                    });
                }
            })
        );
    }

    /**
     * 显示转换对话框
     */
    private showConversionModal() {
        new ConversionModal(this.app, this).open();
    }

    /**
     * 显示文件选择对话框
     */
    private showFileSelectionModal() {
        // 这里可以创建一个文件选择器
        // 暂时使用转换对话框
        new ConversionModal(this.app, this).open();
    }

    /**
     * 转换文件
     * 
     * @param filePath 文件路径
     */
    async convertFile(filePath: string) {
        // 验证配置
        if (!this.conversionService.validateConfig()) {
            new Notice("请先在设置中配置AI提供商", 5000);
            this.openSettings();
            return;
        }

        // 执行转换
        const result = await this.conversionService.convertFile(filePath);

        if (result.success) {
            new Notice(`转换成功！文件已保存到: ${result.outputPath}`, 5000);
        } else {
            new Notice(`转换失败: ${result.error}`, 5000);
        }
    }

    /**
     * 批量转换文件
     * 
     * @param filePaths 文件路径数组
     */
    async convertFiles(filePaths: string[]) {
        // 验证配置
        if (!this.conversionService.validateConfig()) {
            new Notice("请先在设置中配置AI提供商", 5000);
            this.openSettings();
            return;
        }

        // 过滤不支持的文件
        const supportedFiles = filePaths.filter(path =>
            ConversionService.isFileSupported(path)
        );

        if (supportedFiles.length === 0) {
            new Notice("没有支持的文件", 3000);
            return;
        }

        // 执行批量转换
        const results = await this.conversionService.convertFiles(supportedFiles);

        // 统计结果
        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        new Notice(
            `批量转换完成！成功: ${successCount}, 失败: ${failCount}`,
            5000
        );
    }

    /**
     * 打开设置
     */
    private openSettings() {
        // Obsidian会自动在设置中显示插件设置
        // 用户可以通过 Ctrl/Cmd + , 打开设置
        new Notice("请在设置中找到 Hand Markdown AI 插件进行配置", 5000);
    }

    private toggleModel() {
        const enabledModels = Object.entries(this.settings.models)
            .filter(([_, config]) => config.enabled)
            .map(([id, _]) => id);

        if (enabledModels.length === 0) {
            new Notice("没有启用的模型，请在设置中配置", 5000);
            return;
        }

        const currentIndex = enabledModels.indexOf(this.settings.currentModel);
        const nextIndex = (currentIndex + 1) % enabledModels.length;
        const nextModel = enabledModels[nextIndex];

        this.settings.currentModel = nextModel;
        this.saveSettings();

        const modelName = this.settings.models[nextModel]?.name || nextModel;
        new Notice(`已切换到模型: ${modelName}`, 3000);
    }
}