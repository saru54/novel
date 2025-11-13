"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusBarController = void 0;
const vscode = __importStar(require("vscode"));
function truncate(text, max = 40) {
    if (text.length <= max) {
        return text;
    }
    return `${text.slice(0, max - 3)}...`;
}
class StatusBarController {
    lineItem;
    toggleItem;
    visibilityItem;
    jumpItem;
    shortcutsEnabled = false;
    extensionVisible = true;
    displayMode = 'panel';
    cachedLineText = '$(book) 尚未选择文本';
    cachedLineTooltip = '选择小说文本后将在此显示当前句子';
    constructor() {
        this.lineItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.toggleItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
        this.visibilityItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        this.jumpItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);
        this.lineItem.command = 'novelNavigator.toggleDisplayMode';
        this.lineItem.tooltip = '选择小说文本后将在此显示当前句子';
        this.toggleItem.command = 'novelNavigator.toggleShortcuts';
        this.toggleItem.tooltip = '切换行快捷键 (Left/Right) 切换章节快捷键 (Ctrl+Left/Right) 切换视图位置(Ctrl + Alt + M)';
        this.updateToggleLabel();
        this.visibilityItem.command = 'novelNavigator.toggleExtensionEnabled';
        this.visibilityItem.tooltip = '显示/隐藏小说导航';
        this.updateVisibilityLabel();
        this.jumpItem.command = 'novelNavigator.jumpToPosition';
        this.jumpItem.tooltip = '跳转至指定章节或章节内的行';
        this.jumpItem.text = '$(milestone) 跳转';
        this.refreshVisibility();
    }
    setLine(text, chapterTitle) {
        const display = text.trim().length === 0 ? '（空行）' : text.trim();
        this.cachedLineText = `$(book) ${truncate(display)}`;
        this.cachedLineTooltip = chapterTitle ? `${chapterTitle}\n\n${display}` : display;
        this.applyLineContent();
    }
    clearLine() {
        this.cachedLineText = '$(book) 尚未选择文本';
        this.cachedLineTooltip = '选择小说文本后将在此显示当前句子';
        this.applyLineContent();
    }
    setShortcutsEnabled(enabled) {
        this.shortcutsEnabled = enabled;
        this.updateToggleLabel();
    }
    setDisplayMode(mode) {
        this.displayMode = mode;
        this.refreshVisibility();
    }
    setExtensionVisible(visible) {
        this.extensionVisible = visible;
        this.updateVisibilityLabel();
        this.refreshVisibility();
    }
    dispose() {
        this.lineItem.dispose();
        this.toggleItem.dispose();
        this.visibilityItem.dispose();
        this.jumpItem.dispose();
    }
    applyLineContent() {
        this.lineItem.text = this.cachedLineText;
        this.lineItem.tooltip = `${this.cachedLineTooltip}\n\n单击可切换显示位置`; // ensures tooltip guidance
    }
    refreshVisibility() {
        if (this.extensionVisible && this.displayMode === 'statusBar') {
            this.applyLineContent();
            this.lineItem.show();
        }
        else {
            this.lineItem.hide();
        }
        if (this.extensionVisible) {
            this.toggleItem.show();
        }
        else {
            this.toggleItem.hide();
        }
        if (this.extensionVisible) {
            this.jumpItem.show();
        }
        else {
            this.jumpItem.hide();
        }
        this.visibilityItem.show();
    }
    updateToggleLabel() {
        this.toggleItem.text = this.shortcutsEnabled ? '$(key) 快捷键:开' : '$(circle-slash) 快捷键:关';
    }
    updateVisibilityLabel() {
        this.visibilityItem.text = this.extensionVisible ? '$(eye) SR:开' : '$(eye-closed) SR:关';
    }
}
exports.StatusBarController = StatusBarController;
//# sourceMappingURL=statusBarController.js.map