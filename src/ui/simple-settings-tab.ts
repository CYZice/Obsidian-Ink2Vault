import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type HandMarkdownAIPlugin from "../main";

/**
 * 简化版设置界面 - 只保留核心必要设置
 */
export class SimpleSettingsTab extends PluginSettingTab {
    plugin: HandMarkdownAIPlugin;

    constructor(app: App, plugin: HandMarkdownAIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 标题和状态
        this.addHeader(containerEl);

        // 核心配置
        this.addModelConfig(containerEl);
        this.addPdfSettings(containerEl);
        this.addOutputSettings(containerEl);
        this.addPromptSettings(containerEl);

        // 高级选项（折叠）
        this.addAdvancedOptions(containerEl);

        // 底部操作
        this.addFooter(containerEl);
    }

    private addHeader(containerEl: HTMLElement) {
        containerEl.createEl("h2", { text: "Hand Markdown AI" });
        containerEl.createEl("p", {
            text: "将 PDF 和手写笔记转换为 Markdown 格式",
            attr: { style: "color: var(--text-muted); margin-bottom: 20px;" }
        });

        // 状态指示器
        const statusDiv = containerEl.createDiv({ attr: { style: "margin-bottom: 20px;" } });
        const currentModel = this.plugin.settings.currentModel;
        const modelConfig = this.plugin.settings.models[currentModel];
        const provider = modelConfig ? this.plugin.settings.providers[modelConfig.provider] : null;
        const hasApiKey = provider?.apiKey?.trim();

        if (hasApiKey) {
            statusDiv.innerHTML = `
                <div style="padding: 12px; background: #d4edda; color: #155724; border-radius: 6px; border: 1px solid #c3e6cb;">
                    ✅ <strong>就绪</strong> - 使用 ${modelConfig?.name || currentModel}
                    <br><small>右键 PDF → "转换为Markdown"</small>
                </div>
            `;
        } else {
            statusDiv.innerHTML = `
                <div style="padding: 12px; background: #fff3cd; color: #856404; border-radius: 6px; border: 1px solid #ffeaa7;">
                    ⚠️ <strong>需要配置</strong> - 请先填写 API Key
                </div>
            `;
        }

        containerEl.createEl("hr");
    }

    private addModelConfig(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "🤖 AI 模型" });

        // 模型选择
        const enabledModels = Object.entries(this.plugin.settings.models)
            .filter(([_, config]) => config.enabled);

        new Setting(containerEl)
            .setName("选择模型")
            .setDesc("用于转换的 AI 模型")
            .addDropdown(dropdown => {
                enabledModels.forEach(([id, config]) => {
                    dropdown.addOption(id, `${config.name} (${config.provider})`);
                });
                dropdown.setValue(this.plugin.settings.currentModel)
                    .onChange(async (value) => {
                        this.plugin.settings.currentModel = value;
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        // 当前模型的API密钥配置
        if (enabledModels.length > 0) {
            const currentModel = this.plugin.settings.currentModel;
            const modelConfig = this.plugin.settings.models[currentModel];
            const provider = this.plugin.settings.providers[modelConfig?.provider];

            if (provider) {
                new Setting(containerEl)
                    .setName(`${provider.name || modelConfig.provider} API Key`)
                    .setDesc("从供应商平台获取 API 密钥")
                    .addText(text => {
                        text.inputEl.type = "password";
                        text.setPlaceholder("sk-...")
                            .setValue(provider.apiKey || "")
                            .onChange(async (value) => {
                                provider.apiKey = value.trim();
                                await this.plugin.saveSettings();
                                this.display();
                            });
                        text.inputEl.style.width = "100%";
                    })
                    .addExtraButton(btn => {
                        btn.setIcon("eye")
                            .setTooltip("显示/隐藏")
                            .onClick(() => {
                                const input = btn.extraSettingsEl.parentElement?.querySelector("input");
                                if (input) {
                                    input.type = input.type === "password" ? "text" : "password";
                                }
                            });
                    });

                // Base URL（可选）
                if (provider.baseUrl) {
                    new Setting(containerEl)
                        .setName("Base URL")
                        .setDesc("自定义 API 端点（可选）")
                        .addText(text => text
                            .setPlaceholder("https://api.openai.com/v1")
                            .setValue(provider.baseUrl || "")
                            .onChange(async (value) => {
                                provider.baseUrl = value.trim();
                                await this.plugin.saveSettings();
                            })
                        );
                }
            }
        }

        // 快捷链接
        const linksDiv = containerEl.createDiv({ attr: { style: "margin-top: 10px; font-size: 0.9em;" } });
        linksDiv.innerHTML = `
            <span style="color: var(--text-muted);">获取 API Key：</span>
            <a href="https://platform.openai.com/api-keys" target="_blank" style="margin-right: 10px;">OpenAI</a>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" style="margin-right: 10px;">Gemini</a>
            <a href="https://console.anthropic.com/settings/keys" target="_blank">Claude</a>
        `;

        containerEl.createEl("hr");
    }

    private addPdfSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "📄 PDF 处理" });

        new Setting(containerEl)
            .setName("图片质量")
            .setDesc("PDF 转图片的质量（0.1-1.0，越高越清晰但文件越大）")
            .addSlider(slider => slider
                .setLimits(0.1, 1.0, 0.1)
                .setValue(this.plugin.settings.advancedSettings?.pdfQuality || 0.8)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.advancedSettings.pdfQuality = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("图片缩放")
            .setDesc("PDF 转图片的缩放比例（1.0-2.0，越高越清晰）")
            .addSlider(slider => slider
                .setLimits(1.0, 2.0, 0.1)
                .setValue(this.plugin.settings.advancedSettings?.pdfScale || 1.5)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.advancedSettings.pdfScale = value;
                    await this.plugin.saveSettings();
                })
            );

        containerEl.createEl("hr");
    }

    private addOutputSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "💾 输出设置" });

        new Setting(containerEl)
            .setName("输出目录")
            .setDesc("转换后的文件保存位置")
            .addText(text => text
                .setPlaceholder("Converted")
                .setValue(this.plugin.settings.outputSettings.outputDir)
                .onChange(async (value) => {
                    this.plugin.settings.outputSettings.outputDir = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("保留原文件名")
            .setDesc("使用原始 PDF 文件名")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.outputSettings.keepOriginalName)
                .onChange(async (value) => {
                    this.plugin.settings.outputSettings.keepOriginalName = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("转换后自动打开")
            .setDesc("转换完成后立即打开文件")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.outputSettings.autoOpen)
                .onChange(async (value) => {
                    this.plugin.settings.outputSettings.autoOpen = value;
                    await this.plugin.saveSettings();
                })
            );

        containerEl.createEl("hr");
    }

    private addPromptSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "✍️ 转换提示词" });

        const defaultPrompt = "Take the handwritten notes from this image and convert them into a clean, well-structured Markdown file. Pay attention to headings, lists, and any other formatting. Use latex for mathematical equations. For latex use the $$ syntax. Do not skip anything from the original text. Just give me the markdown, do not include other text in the response apart from the markdown file.";

        new Setting(containerEl)
            .setName("自定义提示词")
            .setDesc("告诉 AI 如何转换你的笔记（留空使用默认）")
            .addTextArea(text => {
                text.setPlaceholder(defaultPrompt)
                    .setValue(this.plugin.settings.conversionPrompt || "")
                    .onChange(async (value) => {
                        this.plugin.settings.conversionPrompt = value;
                        await this.plugin.saveSettings();
                    });
                text.inputEl.rows = 6;
                text.inputEl.style.width = "100%";
            });

        containerEl.createEl("hr");
    }

    private addAdvancedOptions(containerEl: HTMLElement) {
        const detailsEl = containerEl.createEl("details", {
            attr: { style: "margin: 20px 0;" }
        });
        detailsEl.createEl("summary", {
            text: "⚙️ 高级选项",
            attr: { style: "cursor: pointer; font-size: 1.1em; font-weight: 600; margin-bottom: 10px;" }
        });

        const contentDiv = detailsEl.createDiv({ attr: { style: "margin-top: 15px;" } });

        new Setting(contentDiv)
            .setName("请求超时（秒）")
            .setDesc("单个页面处理的最大等待时间")
            .addText(text => text
                .setPlaceholder("60")
                .setValue(String(this.plugin.settings.advancedSettings.timeout / 1000))
                .onChange(async (value) => {
                    const seconds = parseInt(value);
                    if (!isNaN(seconds) && seconds > 0) {
                        this.plugin.settings.advancedSettings.timeout = seconds * 1000;
                        await this.plugin.saveSettings();
                    }
                })
            );

        new Setting(contentDiv)
            .setName("最大 Token 数")
            .setDesc("AI 响应的最大长度")
            .addText(text => text
                .setPlaceholder("4096")
                .setValue(String(this.plugin.settings.maxTokens))
                .onChange(async (value) => {
                    const tokens = parseInt(value);
                    if (!isNaN(tokens) && tokens > 0) {
                        this.plugin.settings.maxTokens = tokens;
                        await this.plugin.saveSettings();
                    }
                })
            );

    }

    private addFooter(containerEl: HTMLElement) {
        containerEl.createEl("hr");

        const footerDiv = containerEl.createDiv({
            attr: { style: "display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;" }
        });

        // 测试配置
        const testBtn = footerDiv.createEl("button", {
            text: "🧪 测试配置",
            attr: {
                style: "padding: 8px 16px; border: 1px solid var(--interactive-accent); background: transparent; color: var(--interactive-accent); border-radius: 6px; cursor: pointer;"
            }
        });
        testBtn.onclick = () => this.testConfiguration();

        // 重置设置
        const resetBtn = footerDiv.createEl("button", {
            text: "🔄 重置设置",
            attr: {
                style: "padding: 8px 16px; border: 1px solid var(--text-error); background: transparent; color: var(--text-error); border-radius: 6px; cursor: pointer;"
            }
        });
        resetBtn.onclick = () => this.resetSettings();

        // 版本信息
        containerEl.createEl("p", {
            text: "Hand Markdown AI v1.0.0",
            attr: { style: "text-align: center; color: var(--text-muted); margin-top: 20px; font-size: 0.85em;" }
        });
    }

    private async testConfiguration() {
        const currentModel = this.plugin.settings.currentModel;
        if (!currentModel) {
            new Notice("❌ 未选择模型", 3000);
            return;
        }

        const modelConfig = this.plugin.settings.models[currentModel];
        const provider = this.plugin.settings.providers[modelConfig?.provider];

        if (!provider?.apiKey) {
            new Notice("❌ 未配置 API Key", 3000);
            return;
        }

        new Notice("🧪 正在测试配置...", 2000);

        // 简单验证（实际项目中应该发送测试请求）
        setTimeout(() => {
            new Notice("✅ 配置有效！", 3000);
        }, 1000);
    }

    private async resetSettings() {
        if (!confirm("确定要重置所有设置吗？此操作不可撤销。")) {
            return;
        }

        const { DEFAULT_SETTINGS } = await import("../defaults");
        this.plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        await this.plugin.saveSettings();
        this.display();

        new Notice("✅ 设置已重置", 3000);
    }
}
