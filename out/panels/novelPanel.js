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
exports.NovelPanel = void 0;
const vscode = __importStar(require("vscode"));
class NovelPanel {
    extensionUri;
    view;
    visible = false;
    messageHandler;
    messageSubscription;
    visibilitySubscription;
    state;
    constructor(extensionUri) {
        this.extensionUri = extensionUri;
    }
    resolveWebviewView(webviewView) {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.extensionUri],
        };
        this.registerMessageChannel(webviewView);
        this.visible = webviewView.visible;
        this.updateVisibilityContext();
        this.visibilitySubscription?.dispose();
        this.visibilitySubscription = webviewView.onDidChangeVisibility(() => {
            this.visible = webviewView.visible;
            this.updateVisibilityContext();
        });
        webviewView.onDidDispose(() => {
            if (this.messageSubscription) {
                this.messageSubscription.dispose();
                this.messageSubscription = undefined;
            }
            this.view = undefined;
            this.visible = false;
            this.updateVisibilityContext();
        });
        this.render();
    }
    reveal() {
        vscode.commands.executeCommand("novelNavigator.chapterPanel.focus");
    }
    update(fileName, chapter, highlightLineIndex) {
        this.state = { fileName, chapter, highlightLineIndex };
        this.render();
    }
    showPlaceholder() {
        this.state = undefined;
        this.render();
    }
    hide() {
        this.showPlaceholder();
    }
    toggle() {
        if (this.visible) {
            this.hide();
        }
        else {
            this.reveal();
        }
    }
    isVisible() {
        return this.visible;
    }
    onMessage(handler) {
        this.messageHandler = handler;
        if (this.view) {
            this.registerMessageChannel(this.view);
        }
    }
    dispose() {
        this.messageSubscription?.dispose();
        this.visibilitySubscription?.dispose();
        this.view = undefined;
    }
    registerMessageChannel(target) {
        if (!this.messageHandler) {
            return;
        }
        this.messageSubscription?.dispose();
        this.messageSubscription = target.webview.onDidReceiveMessage((message) => this.messageHandler?.(message));
    }
    render() {
        if (!this.view) {
            return;
        }
        if (!this.state) {
            this.view.title = "小说章节";
            this.view.webview.html = this.renderEmptyHtml();
            return;
        }
        const { fileName, chapter, highlightLineIndex } = this.state;
        this.view.title = chapter?.title ?? fileName;
        this.view.webview.html = this.renderHtml(fileName, chapter, highlightLineIndex);
    }
    updateVisibilityContext() {
        vscode.commands.executeCommand("setContext", "novelNavigator.panelVisible", this.visible);
    }
    renderEmptyHtml() {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<style>
body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background: var(--vscode-editor-background); padding: 16px; }
.empty { color: var(--vscode-descriptionForeground); }
</style>
</head>
<body>
  <div class="empty">请选择左侧的文本文件以查看章节内容。</div>
</body>
</html>`;
    }
    renderHtml(fileName, chapter, highlightLineIndex) {
        const vscodeApi = "acquireVsCodeApi";
        const safeHighlight = chapter.lines.length > 0
            ? Math.min(Math.max(highlightLineIndex, 0), chapter.lines.length - 1)
            : -1;
        const content = chapter.lines
            .map((line, index) => {
            const classes = index === safeHighlight ? "line current" : "line";
            const safeLine = line
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            return `<div class="${classes}" data-index="${index}">${safeLine || "&nbsp;"}</div>`;
        })
            .join("");
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<style>
:root {
  color-scheme: light dark;
}
body {
  font-family: var(--vscode-font-family);
  color: var(--vscode-editor-foreground);
  background: var(--vscode-editor-background);
  padding: 16px;
}
.header {
  font-size: 1.1rem;
  margin-bottom: 12px;
  font-weight: 600;
}
.line {
  padding: 4px 8px;
  border-radius: 4px;
}
.line:nth-child(odd) {
  background-color: rgba(128, 128, 128, 0.08);
}
.line.current {
  background-color: var(--vscode-editor-selectionBackground);
  border-left: 3px solid var(--vscode-focusBorder);
}
</style>
</head>
<body>
  <div class="header">${chapter.title || fileName}</div>
  <div>${content}</div>
<script>
  const vscode = ${vscodeApi}();
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      vscode.postMessage({ type: 'nextLine' });
    } else if (event.key === 'ArrowLeft') {
      vscode.postMessage({ type: 'previousLine' });
    } else if (event.key === 'PageDown') {
      vscode.postMessage({ type: 'nextChapter' });
    } else if (event.key === 'PageUp') {
      vscode.postMessage({ type: 'previousChapter' });
    }
  });
</script>
</body>
</html>`;
    }
}
exports.NovelPanel = NovelPanel;
//# sourceMappingURL=novelPanel.js.map