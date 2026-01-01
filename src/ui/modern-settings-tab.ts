import { App, Modal, Notice, PluginSettingTab, Setting } from "obsidian";
import type HandMarkdownAIPlugin from "../main";
import type { CommonPrompt } from "../types";
import { ModalManager } from "./modal-manager";

/**
 * 现代化设置页面 - 模仿Markdown-Next-AI-Private的表格化设计
 */
export class ModernSettingsTab extends PluginSettingTab {
    plugin: HandMarkdownAIPlugin;
    private modalManager: ModalManager;

    constructor(app: App, plugin: HandMarkdownAIPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.modalManager = new ModalManager(plugin);
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Hand Markdown AI 设置" });

        // 供应商和API设置
        this.addProviderSection(containerEl);

        // 模型设置
        this.addModelSection(containerEl);

        // 功能设置
        this.addFeatureSettings(containerEl);

        // 全局规则设置
        this.addGlobalRulesSection(containerEl);

        // 常用提示词管理
        this.addCommonPromptsSection(containerEl);

        // 输出设置
        this.addOutputSettings(containerEl);

        // 高级设置
        this.addAdvancedSettings(containerEl);

        // 配置验证和重置
        this.addValidationAndReset(containerEl);
    }

    /**
     * 供应商配置部分 - 表格化展示
     */
    private addProviderSection(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "供应商配置" });

        // 添加说明文字
        containerEl.createEl("p", {
            text: "API密钥：在对应供应商平台获取API密钥",
            attr: { style: "color: var(--text-muted); margin-bottom: 5px; font-size: 0.9em;" }
        });

        // 创建供应商表格
        const providerTable = containerEl.createEl("table", {
            cls: "hand-markdown-ai-provider-table",
            attr: { style: "width: 100%; margin-bottom: 20px;" }
        });

        // 表头
        const thead = providerTable.createEl("thead");
        const headerRow = thead.createEl("tr");
        headerRow.createEl("th", { text: "供应商", attr: { style: "text-align: left; padding: 8px;" } });
        headerRow.createEl("th", { text: "类型", attr: { style: "text-align: left; padding: 8px;" } });
        headerRow.createEl("th", { text: "API密钥", attr: { style: "text-align: left; padding: 8px;" } });
        headerRow.createEl("th", { text: "获取密钥", attr: { style: "text-align: left; padding: 8px;" } });
        headerRow.createEl("th", { text: "操作", attr: { style: "text-align: left; padding: 8px;" } });

        // 表体
        const tbody = providerTable.createEl("tbody");

        Object.entries(this.plugin.settings.providers).forEach(([providerId, provider]) => {
            const row = tbody.createEl("tr", {
                attr: { style: "border-bottom: 1px solid var(--background-modifier-border);" }
            });

            // 供应商名称
            row.createEl("td", {
                text: provider.name || providerId,
                attr: { style: "padding: 12px 8px; font-weight: 500;" }
            });

            // 类型
            row.createEl("td", {
                text: provider.type || "openai",
                attr: { style: "padding: 8px; color: var(--text-muted);" }
            });

            // API密钥状态
            const apiKeyCell = row.createEl("td", { attr: { style: "padding: 8px;" } });
            if (provider.apiKey && provider.apiKey.trim()) {
                apiKeyCell.createEl("span", {
                    text: "••••••••",
                    attr: { style: "color: var(--text-muted); margin-right: 8px;" }
                });
                apiKeyCell.createEl("span", {
                    text: "已配置",
                    attr: { style: "color: var(--text-success); font-size: 0.9em;" }
                });
            } else {
                apiKeyCell.createEl("span", {
                    text: "未配置",
                    attr: { style: "color: var(--text-warning); font-size: 0.9em;" }
                });
            }

            // 获取密钥链接
            const linkCell = row.createEl("td", { attr: { style: "padding: 8px;" } });
            const apiKeyLink = this.plugin.settings.apiKeyLinks?.[providerId];
            if (apiKeyLink) {
                linkCell.createEl("a", {
                    text: "获取密钥",
                    attr: {
                        href: apiKeyLink,
                        target: "_blank",
                        style: "color: var(--text-accent); text-decoration: underline; font-size: 0.9em;"
                    }
                });
            } else {
                linkCell.createEl("span", {
                    text: "-",
                    attr: { style: "color: var(--text-muted);" }
                });
            }

            // 操作按钮
            const actionsCell = row.createEl("td", { attr: { style: "padding: 8px;" } });

            // 配置按钮
            const configBtn = actionsCell.createEl("button", {
                text: "配置",
                attr: {
                    style: "margin-right: 8px; padding: 4px 8px; font-size: 0.9em; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal); border-radius: 4px; cursor: pointer;"
                }
            });
            configBtn.onclick = () => this.showProviderConfigModal(providerId);

            // 删除按钮（仅自定义供应商）
            if (!["openai", "anthropic", "gemini", "ollama"].includes(providerId)) {
                const deleteBtn = actionsCell.createEl("button", {
                    text: "删除",
                    attr: {
                        style: "padding: 4px 8px; font-size: 0.9em; border: 1px solid var(--text-error); background: var(--background-primary); color: var(--text-error); border-radius: 4px; cursor: pointer;"
                    }
                });
                deleteBtn.onclick = () => this.deleteProvider(providerId);
            }
        });

        // 添加供应商按钮
        const addProviderBtn = containerEl.createEl("button", {
            text: "+ 添加供应商",
            attr: {
                style: "background: var(--interactive-accent); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; margin-top: 10px;"
            }
        });
        addProviderBtn.onclick = () => this.showAddProviderModal();
    }

    /**
     * 模型配置部分 - 卡片化展示
     */
    private addModelSection(containerEl: HTMLElement) {
        const modelHeader = containerEl.createEl("div", {
            attr: { style: "display: flex; justify-content: space-between; align-items: center; margin-top: 30px; margin-bottom: 15px;" }
        });
        modelHeader.createEl("h3", { text: "模型设置", attr: { style: "margin: 0;" } });

        const addModelBtn = modelHeader.createEl("button", {
            text: "+ 添加模型",
            attr: {
                style: "background: var(--interactive-accent); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px;"
            }
        });
        addModelBtn.onclick = () => this.showAddModelModal();

        // 模型卡片容器
        const modelsContainer = containerEl.createEl("div", {
            attr: { style: "display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; margin-bottom: 20px;" }
        });

        Object.entries(this.plugin.settings.models).forEach(([modelId, model]) => {
            const modelCard = modelsContainer.createEl("div", {
                cls: "model-card",
                attr: {
                    style: "border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 15px; background: var(--background-secondary);"
                }
            });

            // 模型头部
            const header = modelCard.createEl("div", {
                attr: { style: "display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;" }
            });

            const titleEl = header.createEl("div");
            titleEl.createEl("div", {
                text: model.name,
                attr: { style: "font-weight: bold; font-size: 1.1em;" }
            });
            titleEl.createEl("div", {
                text: `${model.provider} · ${model.category}`,
                attr: { style: "color: var(--text-muted); font-size: 0.9em;" }
            });

            // 启用开关
            const toggleSwitch = header.createEl("input", {
                type: "checkbox",
                attr: { style: "transform: scale(1.2);" }
            }) as HTMLInputElement;
            toggleSwitch.checked = model.enabled;
            toggleSwitch.onchange = async () => {
                this.plugin.settings.models[modelId].enabled = toggleSwitch.checked;
                await this.plugin.saveSettings();
            };

            // 模型信息
            const infoSection = modelCard.createEl("div", {
                attr: { style: "margin-bottom: 10px;" }
            });
            infoSection.createEl("div", {
                text: `模型ID: ${model.model}`,
                attr: { style: "color: var(--text-muted); font-size: 0.9em;" }
            });

            // 操作按钮
            const actions = modelCard.createEl("div", {
                attr: { style: "display: flex; gap: 8px;" }
            });

            const editBtn = actions.createEl("button", {
                text: "编辑",
                attr: {
                    style: "padding: 4px 8px; font-size: 0.9em; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal); border-radius: 4px; cursor: pointer;"
                }
            });
            editBtn.onclick = () => this.showEditModelModal(modelId);

            const deleteBtn = actions.createEl("button", {
                text: "删除",
                attr: {
                    style: "padding: 4px 8px; font-size: 0.9em; border: 1px solid var(--text-error); background: var(--background-primary); color: var(--text-error); border-radius: 4px; cursor: pointer;"
                }
            });
            deleteBtn.onclick = () => this.deleteModel(modelId);
        });

        // 当前模型选择
        new Setting(containerEl)
            .setName("当前模型")
            .setDesc("选择当前使用的AI模型")
            .addDropdown(dropdown => {
                const enabledModels = Object.keys(this.plugin.settings.models)
                    .filter(id => this.plugin.settings.models[id].enabled);

                enabledModels.forEach(id => {
                    const model = this.plugin.settings.models[id];
                    dropdown.addOption(id, `${model.name} (${model.provider})`);
                });

                if (!enabledModels.includes(this.plugin.settings.currentModel) && enabledModels.length > 0) {
                    this.plugin.settings.currentModel = enabledModels[0];
                    this.plugin.saveSettings();
                }

                dropdown.setValue(this.plugin.settings.currentModel || "")
                    .onChange(async (value) => {
                        this.plugin.settings.currentModel = value;
                        await this.plugin.saveSettings();
                    });
            });
    }

    /**
     * 功能设置
     */
    private addFeatureSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "功能设置" });

        new Setting(containerEl)
            .setName("启用右键菜单")
            .setDesc("在选中文本时显示AI处理选项")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableRightClick || false)
                .onChange(async (value) => {
                    this.plugin.settings.enableRightClick = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("启用@或&符号触发")
            .setDesc("输入@或&符号时呼出续写对话框")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableAtTrigger || false)
                .onChange(async (value) => {
                    this.plugin.settings.enableAtTrigger = value;
                    await this.plugin.saveSettings();
                })
            );
    }

    /**
     * 全局规则设置
     */
    private addGlobalRulesSection(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "全局规则设置" });
        containerEl.createEl("p", {
            text: "全局规则会自动应用到所有AI请求中，每次对话都需要遵循全局规则",
            attr: { style: "color: var(--text-muted); margin-bottom: 15px;" }
        });

        new Setting(containerEl)
            .setName("启用全局规则")
            .setDesc("开启后，全局规则将自动应用到所有AI请求中")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableGlobalRules || false)
                .onChange(async (value) => {
                    this.plugin.settings.enableGlobalRules = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("管理全局规则")
            .setDesc("添加、编辑和管理全局规则")
            .addButton(button => button
                .setButtonText("打开规则管理器")
                .onClick(() => this.showRuleManager())
            );
    }

    /**
     * 常用提示词管理
     */
    private addCommonPromptsSection(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "常用提示词管理" });
        containerEl.createEl("p", {
            text: "管理常用提示词，可在输入框中使用#符号快速调用",
            attr: { style: "color: var(--text-muted); margin-bottom: 15px;" }
        });

        new Setting(containerEl)
            .setName("添加新提示词")
            .setDesc("创建一个新的常用提示词")
            .addButton(button => button
                .setButtonText("添加提示词")
                .onClick(() => this.showPromptModal())
            );

        if (this.plugin.settings.commonPrompts && this.plugin.settings.commonPrompts.length > 0) {
            const promptsContainer = containerEl.createEl("div", { attr: { style: "margin-top: 15px;" } });

            this.plugin.settings.commonPrompts.forEach((prompt, index) => {
                const promptEl = promptsContainer.createEl("div", {
                    attr: {
                        style: "display: flex; align-items: center; justify-content: space-between; padding: 10px; margin-bottom: 8px; border: 1px solid var(--background-modifier-border); border-radius: 6px; background: var(--background-secondary);"
                    }
                });

                const infoEl = promptEl.createEl("div", { attr: { style: "flex: 1;" } });
                infoEl.createEl("div", {
                    text: prompt.name || "未命名提示词",
                    attr: { style: "font-weight: bold; margin-bottom: 4px;" }
                });
                infoEl.createEl("div", {
                    text: prompt.content && prompt.content.length > 100 ? prompt.content.substring(0, 100) + "..." : (prompt.content || ""),
                    attr: { style: "color: var(--text-muted); font-size: 0.7em;" }
                });

                const actionsEl = promptEl.createEl("div", { attr: { style: "display: flex; gap: 8px;" } });

                actionsEl.createEl("button", {
                    text: "编辑",
                    attr: { style: "padding: 4px 8px; font-size: 0.8em; border: 1px solid var(--background-modifier-border); background: var(--background-primary); color: var(--text-normal); border-radius: 4px; cursor: pointer;" }
                }).onclick = () => this.showPromptModal(index);

                actionsEl.createEl("button", {
                    text: "删除",
                    attr: { style: "padding: 4px 8px; font-size: 0.8em; border: 1px solid var(--text-error); background: var(--background-primary); color: var(--text-error); border-radius: 4px; cursor: pointer;" }
                }).onclick = () => this.deletePrompt(index);
            });
        } else {
            containerEl.createEl("p", {
                text: "暂无常用提示词，点击上方按钮添加",
                attr: { style: "color: var(--text-muted); font-style: italic; margin-top: 15px;" }
            });
        }
    }

    /**
     * 输出设置
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
     * 高级设置
     */
    private addAdvancedSettings(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "高级设置" });

        const advancedSettings = this.plugin.settings.advancedSettings;

        new Setting(containerEl)
            .setName("请求超时时间（毫秒）")
            .setDesc("API请求的超时时间")
            .addText(text => text
                .setPlaceholder("30000")
                .setValue(String(this.plugin.settings.timeout))
                .onChange(async (value) => {
                    const timeout = parseInt(value) || 30000;
                    this.plugin.settings.timeout = timeout;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("最大重试次数")
            .setDesc("请求失败时的最大重试次数")
            .addText(text => text
                .setPlaceholder("3")
                .setValue(String(advancedSettings.maxRetries))
                .onChange(async (value) => {
                    const maxRetries = parseInt(value) || 3;
                    this.plugin.settings.advancedSettings.maxRetries = maxRetries;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("最大Token数")
            .setDesc("AI生成文本的最大长度限制")
            .addText(text => text
                .setPlaceholder("5000")
                .setValue(String(this.plugin.settings.maxTokens))
                .onChange(async (value) => {
                    const tokens = parseInt(value) || 5000;
                    if (tokens > 0) {
                        this.plugin.settings.maxTokens = tokens;
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
    }

    /**
     * 配置验证和重置
     */
    private addValidationAndReset(containerEl: HTMLElement) {
        containerEl.createEl("h3", { text: "配置管理" });

        // 测试连接
        new Setting(containerEl)
            .setName("测试API连接")
            .setDesc("测试当前API配置是否正常")
            .addButton(button => button
                .setButtonText("测试连接")
                .onClick(async () => {
                    button.setButtonText("测试中...");
                    try {
                        // 这里应该调用实际的AI服务测试方法
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        new Notice("✅ API连接成功");
                    } catch (error: any) {
                        new Notice("❌ API连接失败: " + error.message);
                    } finally {
                        button.setButtonText("测试连接");
                    }
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

    // ============= 模态框方法 =============

    private showProviderConfigModal(providerId: string) {
        this.modalManager.showProviderConfigModal(providerId);
    }

    private showAddProviderModal() {
        this.modalManager.showAddProviderModal();
    }

    private showEditModelModal(modelId: string) {
        this.modalManager.showEditModelModal(modelId);
    }

    private showAddModelModal() {
        this.modalManager.showAddModelModal();
    }

    private showPromptModal(index: number | null = null) {
        const modal = new Modal(this.app);
        modal.titleEl.setText(index !== null ? "编辑提示词" : "添加新提示词");

        const { contentEl } = modal;
        const isEdit = index !== null;
        const prompt = isEdit && this.plugin.settings.commonPrompts && this.plugin.settings.commonPrompts[index]
            ? this.plugin.settings.commonPrompts[index]
            : null;

        contentEl.createEl("label", {
            text: "提示词名称:",
            attr: { style: "display: block; margin-bottom: 5px; font-weight: bold;" }
        });
        const nameInput = contentEl.createEl("input", {
            type: "text",
            placeholder: "请输入提示词名称",
            attr: { style: "width: 100%; margin-bottom: 15px; border: 1px solid var(--background-modifier-border); border-radius: 4px;" }
        }) as HTMLInputElement;
        if (isEdit && prompt) nameInput.value = prompt.name;

        contentEl.createEl("label", {
            text: "提示词内容:",
            attr: { style: "display: block; margin-bottom: 5px; font-weight: bold;" }
        });
        const contentInput = contentEl.createEl("textarea", {
            placeholder: "请输入提示词内容",
            attr: { style: "width: 100%; height: 120px; padding: 8px; margin-bottom: 15px; border: 1px solid var(--background-modifier-border); border-radius: 4px; resize: vertical; font-family: var(--font-text);" }
        }) as HTMLTextAreaElement;
        if (isEdit && prompt) contentInput.value = prompt.content;

        const buttonContainer = contentEl.createEl("div", {
            attr: { style: "display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px;" }
        });

        buttonContainer.createEl("button", {
            text: "取消",
            attr: { style: "padding: 6px 12px;" }
        }).onclick = () => modal.close();

        buttonContainer.createEl("button", {
            text: isEdit ? "保存" : "添加",
            attr: { style: "padding: 6px 12px; background: var(--interactive-accent); color: white; border: none; border-radius: 4px; cursor: pointer;" }
        }).onclick = async () => {
            const name = nameInput.value.trim();
            const content = contentInput.value.trim();

            if (!name || !content) {
                new Notice("提示词名称和内容不能为空");
                return;
            }

            const newPrompt: CommonPrompt = {
                id: isEdit && prompt ? prompt.id : Date.now().toString(),
                name,
                content
            };

            if (isEdit && index !== null) {
                this.plugin.settings.commonPrompts[index] = newPrompt;
            } else {
                this.plugin.settings.commonPrompts.push(newPrompt);
            }

            await this.plugin.saveSettings();
            modal.close();
            this.display();
        };

        modal.open();
    }

    private showRuleManager() {
        // TODO: 实现规则管理器
        new Notice("打开规则管理器");
    }

    // ============= 工具方法 =============

    private async deletePrompt(index: number) {
        if (!confirm("确定要删除这个提示词吗？")) {
            return;
        }

        this.plugin.settings.commonPrompts.splice(index, 1);
        await this.plugin.saveSettings();
        this.display();
        new Notice("提示词已删除");
    }

    private async deleteProvider(providerId: string) {
        if (!confirm(`确定要删除供应商 "${providerId}" 吗？这将同时删除该供应商下的所有模型。`)) {
            return;
        }

        // 删除该供应商下的所有模型
        Object.keys(this.plugin.settings.models).forEach(modelId => {
            if (this.plugin.settings.models[modelId].provider === providerId) {
                delete this.plugin.settings.models[modelId];
            }
        });

        delete this.plugin.settings.providers[providerId];
        await this.plugin.saveSettings();
        this.display();
        new Notice("供应商已删除");
    }

    private async deleteModel(modelId: string) {
        if (!confirm(`确定要删除模型 "${this.plugin.settings.models[modelId].name}" 吗？`)) {
            return;
        }

        // 如果删除的是当前模型，切换到其他启用的模型
        if (this.plugin.settings.currentModel === modelId) {
            const otherEnabled = Object.keys(this.plugin.settings.models)
                .find(id => id !== modelId && this.plugin.settings.models[id].enabled);
            this.plugin.settings.currentModel = otherEnabled || "";
        }

        delete this.plugin.settings.models[modelId];
        await this.plugin.saveSettings();
        this.display();
        new Notice("模型已删除");
    }

    private async resetSettings() {
        if (!confirm("确定要重置所有设置吗？此操作不可撤销。")) {
            return;
        }

        const { DEFAULT_SETTINGS } = await import("../defaults");
        this.plugin.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
        await this.plugin.saveSettings();
        this.display();
        new Notice("设置已重置为默认值");
    }
}