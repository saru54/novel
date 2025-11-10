import * as vscode from "vscode";
import { NovelChapter } from "../types";

interface PanelState {
  fileName: string;
  chapter: NovelChapter;
  highlightLineIndex: number;
}

export class NovelPanel
  implements vscode.WebviewViewProvider, vscode.Disposable
{
  private view: vscode.WebviewView | undefined;
  private visible = false;
  private messageHandler: ((message: unknown) => void) | undefined;
  private messageSubscription: vscode.Disposable | undefined;
  private visibilitySubscription: vscode.Disposable | undefined;
  private state: PanelState | undefined;

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void | Thenable<void> {
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

  reveal(): void {
    vscode.commands.executeCommand("novelNavigator.chapterPanel.focus");
  }

  update(
    fileName: string,
    chapter: NovelChapter,
    highlightLineIndex: number
  ): void {
    this.state = { fileName, chapter, highlightLineIndex };
    this.render();
  }

  showPlaceholder(): void {
    this.state = undefined;
    this.render();
  }

  hide(): void {
    this.showPlaceholder();
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.reveal();
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  onMessage(handler: (message: unknown) => void): void {
    this.messageHandler = handler;
    if (this.view) {
      this.registerMessageChannel(this.view);
    }
  }

  dispose(): void {
    this.messageSubscription?.dispose();
    this.visibilitySubscription?.dispose();
    this.view = undefined;
  }

  private registerMessageChannel(target: vscode.WebviewView): void {
    if (!this.messageHandler) {
      return;
    }
    this.messageSubscription?.dispose();
    this.messageSubscription = target.webview.onDidReceiveMessage((message) =>
      this.messageHandler?.(message)
    );
  }

  private render(): void {
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
    this.view.webview.html = this.renderHtml(
      fileName,
      chapter,
      highlightLineIndex
    );
  }

  private updateVisibilityContext(): void {
    vscode.commands.executeCommand(
      "setContext",
      "novelNavigator.panelVisible",
      this.visible
    );
  }

  private renderEmptyHtml(): string {
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

  private renderHtml(
    fileName: string,
    chapter: NovelChapter,
    highlightLineIndex: number
  ): string {
    const vscodeApi = "acquireVsCodeApi";
    const safeHighlight =
      chapter.lines.length > 0
        ? Math.min(Math.max(highlightLineIndex, 0), chapter.lines.length - 1)
        : -1;
    const content = chapter.lines
      .map((line, index) => {
        const classes = index === safeHighlight ? "line current" : "line";
        const safeLine = line
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<div class="${classes}" data-index="${index}">${
          safeLine || "&nbsp;"
        }</div>`;
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
