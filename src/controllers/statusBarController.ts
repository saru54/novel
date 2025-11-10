import * as vscode from 'vscode';
import { DisplayMode } from '../types';

function truncate(text: string, max = 40): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 3)}...`;
}

export class StatusBarController implements vscode.Disposable {
  private readonly lineItem: vscode.StatusBarItem;
  private readonly toggleItem: vscode.StatusBarItem;
  private readonly visibilityItem: vscode.StatusBarItem;
  private readonly jumpItem: vscode.StatusBarItem;
  private shortcutsEnabled = false;
  private extensionVisible = true;
  private displayMode: DisplayMode = 'panel';
  private cachedLineText = '$(book) 尚未选择文本';
  private cachedLineTooltip = '选择小说文本后将在此显示当前句子';

  constructor() {
    this.lineItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.toggleItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    this.visibilityItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
    this.jumpItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 97);

    this.lineItem.command = 'novelNavigator.toggleDisplayMode';
    this.lineItem.tooltip = '选择小说文本后将在此显示当前句子';

    this.toggleItem.command = 'novelNavigator.toggleShortcuts';
    this.toggleItem.tooltip = '切换行快捷键 (Left/Right, Ctrl+Left/Right) 切换视图位置(Ctrl + Alt + M)';
    this.updateToggleLabel();

    this.visibilityItem.command = 'novelNavigator.toggleExtensionEnabled';
    this.visibilityItem.tooltip = '显示/隐藏小说导航';
    this.updateVisibilityLabel();

    this.jumpItem.command = 'novelNavigator.jumpToPosition';
    this.jumpItem.tooltip = '跳转至指定章节或章节内的行';
    this.jumpItem.text = '$(milestone) 跳转';

    this.refreshVisibility();
  }

  setLine(text: string, chapterTitle?: string): void {
    const display = text.trim().length === 0 ? '（空行）' : text.trim();
    this.cachedLineText = `$(book) ${truncate(display)}`;
    this.cachedLineTooltip = chapterTitle ? `${chapterTitle}\n\n${display}` : display;
    this.applyLineContent();
  }

  clearLine(): void {
    this.cachedLineText = '$(book) 尚未选择文本';
    this.cachedLineTooltip = '选择小说文本后将在此显示当前句子';
    this.applyLineContent();
  }

  setShortcutsEnabled(enabled: boolean): void {
    this.shortcutsEnabled = enabled;
    this.updateToggleLabel();
  }

  setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    this.refreshVisibility();
  }

  setExtensionVisible(visible: boolean): void {
    this.extensionVisible = visible;
    this.updateVisibilityLabel();
    this.refreshVisibility();
  }

  dispose(): void {
    this.lineItem.dispose();
    this.toggleItem.dispose();
    this.visibilityItem.dispose();
    this.jumpItem.dispose();
  }

  private applyLineContent(): void {
    this.lineItem.text = this.cachedLineText;
    this.lineItem.tooltip = `${this.cachedLineTooltip}\n\n单击可切换显示位置`; // ensures tooltip guidance
  }

  private refreshVisibility(): void {
    if (this.extensionVisible && this.displayMode === 'statusBar') {
      this.applyLineContent();
      this.lineItem.show();
    } else {
      this.lineItem.hide();
    }

    if (this.extensionVisible) {
      this.toggleItem.show();
    } else {
      this.toggleItem.hide();
    }

    if (this.extensionVisible) {
      this.jumpItem.show();
    } else {
      this.jumpItem.hide();
    }

    this.visibilityItem.show();
  }

  private updateToggleLabel(): void {
    this.toggleItem.text = this.shortcutsEnabled ? '$(key) 快捷键:开' : '$(circle-slash) 快捷键:关';
  }

  private updateVisibilityLabel(): void {
    this.visibilityItem.text = this.extensionVisible ? '$(eye) SR:开' : '$(eye-closed) SR:关';
  }
}
