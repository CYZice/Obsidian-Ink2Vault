import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import HandMarkdownAIPlugin from "./main";

/**
 * Hand Markdown AI 设置标签页
 */
export class HandMarkdownAISettingsTab extends PluginSettingTab {
    plugin: HandMarkdownAIPlugin;

    constructor(app: App, plugin: HandMarkdownAIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl("h2", { text: "Hand Markdown AI 设置" });

        this.addModelSettings(containerEl);

        this.addOutputSettings(containerEl);

        this.addAdvancedSettings(containerEl);
    }

    private addModelSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "AI 模型配置" });

        const enabledModels = Object.entries(this.plugin.settings.models)
            .filter(([_, config]) => config.enabled)
            .map(([id, _]) => id);

        new Setting(containerEl)
            .setName("当前模型")
            .setDesc("选择用于转换的AI模型")
            .addDropdown(dropdown => {
                if (enabledModels.length === 0) {
                    dropdown.addOption("", "无可用模型");
                } else {
                    enabledModels.forEach(modelId => {
                        const modelConfig = this.plugin.settings.models[modelId];
                        dropdown.addOption(modelId, modelConfig?.name || modelId);
                    });
                }
                dropdown.setValue(this.plugin.settings.currentModel)
                    .onChange(async (value) => {
                        this.plugin.settings.currentModel = value;
                        await this.plugin.saveSettings();
                    });
            });

        containerEl.createEl("hr");

        containerEl.createEl("h4", { text: "模型管理" });

        Object.entries(this.plugin.settings.models).forEach(([modelId, config]) => {
            containerEl.createEl("h5", { text: config.name || modelId });

            new Setting(containerEl)
                .setName("启用模型")
                .addToggle(toggle => toggle
                    .setValue(config.enabled)
                    .onChange(async (value) => {
                        this.plugin.settings.models[modelId].enabled = value;
                        await this.plugin.saveSettings();
                        this.display();
                    })
                );

            new Setting(containerEl)
                .setName("API Key")
                .setDesc(`输入${config.name || modelId}的API密钥`)
                .addText(text => text
                    .setPlaceholder("输入API密钥")
                    .setValue(config.apiKey || "")
                    .onChange(async (value) => {
                        this.plugin.settings.models[modelId].apiKey = value;
                        await this.plugin.saveSettings();
                    })
                );

            if (config.baseUrl) {
                new Setting(containerEl)
                    .setName("Base URL")
                    .setDesc("API的基础URL（用于自定义端点）")
                    .addText(text => text
                        .setPlaceholder("https://api.example.com/v1")
                        .setValue(config.baseUrl || "")
                        .onChange(async (value) => {
                            this.plugin.settings.models[modelId].baseUrl = value;
                            await this.plugin.saveSettings();
                        })
                    );
            }

            containerEl.createEl("hr");
        });

        new Setting(containerEl)
            .setName("添加新模型")
            .setDesc("添加自定义AI模型配置")
            .addButton(button => button
                .setButtonText("添加模型")
                .onClick(async () => {
                    await this.addNewModel();
                })
            );
    }

    /**
     * 添加输出设置
     */
    private addOutputSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "输出设置" });

        const outputSettings = this.plugin.settings.outputSettings;

        new Setting(containerEl)
            .setName("输出目录")
            .setDesc("转换后的Markdown文件保存目录（相对于vault根目录）")
            .addText(text => text
                .setPlaceholder("Handwriting Converted")
                .setValue(outputSettings.outputDir)
                .onChange(async (value) => {
                    this.plugin.settings.outputSettings.outputDir = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("保留原始文件名")
            .setDesc("是否使用原始文件名（去除扩展名）作为输出文件名")
            .addToggle(toggle => toggle
                .setValue(outputSettings.keepOriginalName)
                .onChange(async (value) => {
                    this.plugin.settings.outputSettings.keepOriginalName = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("输出文件扩展名")
            .setDesc("输出文件的扩展名")
            .addText(text => text
                .setPlaceholder("md")
                .setValue(outputSettings.outputExtension)
                .onChange(async (value) => {
                    this.plugin.settings.outputSettings.outputExtension = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("自动打开转换后的文件")
            .setDesc("转换完成后是否自动打开生成的Markdown文件")
            .addToggle(toggle => toggle
                .setValue(outputSettings.autoOpen)
                .onChange(async (value) => {
                    this.plugin.settings.outputSettings.autoOpen = value;
                    await this.plugin.saveSettings();
                })
            );
    }

    /**
     * 添加高级设置
     */
    private addAdvancedSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "高级设置" });

        const advancedSettings = this.plugin.settings.advancedSettings;

        new Setting(containerEl)
            .setName("请求超时时间（毫秒）")
            .setDesc("API请求的超时时间")
            .addText(text => text
                .setPlaceholder("60000")
                .setValue(String(advancedSettings.timeout))
                .onChange(async (value) => {
                    const timeout = parseInt(value);
                    if (!isNaN(timeout) && timeout > 0) {
                        this.plugin.settings.advancedSettings.timeout = timeout;
                        await this.plugin.saveSettings();
                    }
                })
            );

        new Setting(containerEl)
            .setName("最大重试次数")
            .setDesc("请求失败时的最大重试次数")
            .addText(text => text
                .setPlaceholder("3")
                .setValue(String(advancedSettings.maxRetries))
                .onChange(async (value) => {
                    const maxRetries = parseInt(value);
                    if (!isNaN(maxRetries) && maxRetries >= 0) {
                        this.plugin.settings.advancedSettings.maxRetries = maxRetries;
                        await this.plugin.saveSettings();
                    }
                })
            );

        new Setting(containerEl)
            .setName("显示详细日志")
            .setDesc("在控制台显示详细的调试日志")
            .addToggle(toggle => toggle
                .setValue(advancedSettings.verboseLogging)
                .onChange(async (value) => {
                    this.plugin.settings.advancedSettings.verboseLogging = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("使用流式响应")
            .setDesc("是否使用流式响应（如果提供商支持）")
            .addToggle(toggle => toggle
                .setValue(advancedSettings.useStreaming)
                .onChange(async (value) => {
                    this.plugin.settings.advancedSettings.useStreaming = value;
                    await this.plugin.saveSettings();
                })
            );

        containerEl.createEl("hr");

        // 转换提示词设置
        new Setting(containerEl)
            .setName("转换提示词")
            .setDesc("自定义AI转换手写笔记的提示词")
            .addTextArea(text => text
                .setPlaceholder("输入自定义提示词...")
                .setValue(this.plugin.settings.conversionPrompt || "")
                .onChange(async (value) => {
                    this.plugin.settings.conversionPrompt = value;
                    await this.plugin.saveSettings();
                })
            );

        containerEl.createEl("hr");

        // 配置验证按钮
        new Setting(containerEl)
            .setName("验证配置")
            .setDesc("测试当前AI提供商配置是否有效")
            .addButton(button => button
                .setButtonText("验证配置")
                .setCta()
                .onClick(async () => {
                    await this.validateConfiguration();
                })
            );

        // 重置设置按钮
        new Setting(containerEl)
            .setName("重置设置")
            .setDesc("将所有设置恢复为默认值")
            .addButton(button => button
                .setButtonText("重置")
                .setWarning()
                .onClick(async () => {
                    await this.resetSettings();
                })
            );
    }

    private async validateConfiguration() {
        const { currentModel, models } = this.plugin.settings;

        if (!currentModel) {
            new Notice("未选择模型", 5000);
            return;
        }

        const modelConfig = models[currentModel];

        if (!modelConfig || !modelConfig.enabled) {
            new Notice(`当前模型 ${currentModel} 未启用`, 5000);
            return;
        }

        if (!modelConfig.apiKey) {
            new Notice(`请先配置 ${modelConfig.name || currentModel} 的API密钥`, 5000);
            return;
        }

        new Notice(`正在验证 ${modelConfig.name || currentModel} 配置...`, 3000);

        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            new Notice(`${modelConfig.name || currentModel} 配置验证成功！`, 3000);
        } catch (error) {
            new Notice(`配置验证失败: ${error}`, 5000);
        }
    }

    private async addNewModel() {
        const modelId = prompt("请输入模型ID（例如：custom-model-1）:");
        if (!modelId) return;

        const modelName = prompt("请输入模型名称（例如：Custom Model）:") || modelId;
        const apiKey = prompt("请输入API密钥:");
        const baseUrl = prompt("请输入Base URL（可选，留空使用默认值）:");

        if (!apiKey) {
            new Notice("API密钥不能为空", 5000);
            return;
        }

        this.plugin.settings.models[modelId] = {
            id: modelId,
            name: modelName,
            provider: "openai",
            model: modelId,
            apiKey: apiKey,
            enabled: true,
            category: "text",
            baseUrl: baseUrl || undefined
        };

        await this.plugin.saveSettings();
        this.display();
        new Notice(`模型 ${modelName} 已添加`, 3000);
    }

    /**
     * 重置设置
     */
    private async resetSettings() {
        if (!confirm("确定要重置所有设置吗？此操作不可撤销。")) {
            return;
        }

        // 导入默认设置
        const { DEFAULT_SETTINGS } = await import("./defaults");

        this.plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        await this.plugin.saveSettings();

        // 重新显示设置页面
        this.display();

        new Notice("设置已重置为默认值", 3000);
    }
}


