import * as vscode from 'vscode';
import { NovelStateService } from '../services/novelStateService';
import { NovelTreeItem } from '../views/novelTreeDataProvider';
import { NovelFile, NovelFolder, DisplayMode } from '../types';
import { StatusBarController } from './statusBarController';
import { NovelPanel } from '../panels/novelPanel';

export interface NavigationSnapshot {
  folderId: string;
  fileId: string;
  lineIndex: number;
}

export class NavigationController implements vscode.Disposable {
  private treeView?: vscode.TreeView<NovelTreeItem>;
  private currentFolderId?: string;
  private currentFileId?: string;
  private currentLineIndex = 0;
  private currentChapterIndex = 0;
  private displayMode: DisplayMode = 'statusBar';

  private readonly disposables: vscode.Disposable[] = [];
  private readonly stateEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.stateEmitter.event;

  constructor(
    private readonly stateService: NovelStateService,
    private readonly statusBar: StatusBarController,
    private readonly panel: NovelPanel,
  ) {
    this.disposables.push(
      this.stateService.onDidChange(() => this.handleStateChange()),
      this.stateEmitter,
    );
    this.panel.onMessage(message => this.handlePanelMessage(message));
  }

  setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    if (mode === 'panel') {
      if (this.currentFolderId && this.currentFileId) {
        this.panel.reveal();
      } else {
        this.panel.showPlaceholder();
      }
    } else {
      this.panel.showPlaceholder();
    }
  }

  registerTreeView(treeView: vscode.TreeView<NovelTreeItem>): void {
    this.treeView = treeView;
    this.disposables.push(
      treeView.onDidChangeSelection(event => {
        const item = event.selection[0];
        if (!item) {
          return;
        }
        if (item.data.type === 'file') {
          this.setActiveFile(item.data.folder.id, item.data.file.id);
        }
      }),
    );
  }

  setActiveFile(folderId: string, fileId: string): void {
    const file = this.stateService.getFile(folderId, fileId);
    if (!file) {
      vscode.window.showWarningMessage('无法找到选中的文本文件。');
      return;
    }

    this.currentFolderId = folderId;
    this.currentFileId = fileId;
    const restoredLine = this.restoreLineIndex(file);
    this.currentLineIndex = restoredLine;
    this.currentChapterIndex = this.findChapterIndexForLine(file, this.currentLineIndex);

    this.updateContexts(true);
    this.updateUi();
    if (this.displayMode === 'panel') {
      this.panel.reveal();
    }
  }

  nextLine(): void {
    this.moveLine(1);
  }

  previousLine(): void {
    this.moveLine(-1);
  }

  nextChapter(): void {
    this.moveChapter(1);
  }

  previousChapter(): void {
    this.moveChapter(-1);
  }

  async promptJumpToChapterLine(): Promise<void> {
    const file = this.getCurrentFile();
    if (!file) {
      vscode.window.showInformationMessage('请选择一个小说文本后再使用跳转功能。');
      return;
    }

    if (file.chapters.length === 0) {
      vscode.window.showInformationMessage('当前文本暂无可跳转的章节。');
      return;
    }

    type ChapterPickItem = vscode.QuickPickItem & { index: number; totalLines: number };
    const items: ChapterPickItem[] = file.chapters.map((chapter, index) => {
      const totalLines = chapter.lines.length > 0
        ? chapter.lines.length
        : Math.max(file.lines.length - chapter.startLine, 1);
      return {
        label: `${index + 1}. ${chapter.title}`,
        description: totalLines > 0 ? `共 ${totalLines} 行` : undefined,
        index,
        totalLines,
      };
    });

    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: '选择要跳转的章节',
      title: '跳转章节',
    });

    if (!picked) {
      return;
    }

    const input = await vscode.window.showInputBox({
      title: '跳转行（可选）',
      prompt: '输入章节内的行号（留空则跳至章节开头）',
      placeHolder: `1-${picked.totalLines}`,
      validateInput: value => {
        if (!value || value.trim().length === 0) {
          return null;
        }
        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed < 1) {
          return '请输入大于等于 1 的整数';
        }
        return null;
      },
    });

    if (input === undefined) {
      return;
    }

    let lineNumber: number | undefined;
    if (input && input.trim().length > 0) {
      lineNumber = Number(input.trim());
    }

    this.jumpToChapterLine(picked.index, lineNumber);
  }

  clear(): void {
    this.currentFolderId = undefined;
    this.currentFileId = undefined;
    this.currentLineIndex = 0;
    this.currentChapterIndex = 0;
    this.statusBar.clearLine();
    this.panel.showPlaceholder();
    this.updateContexts(false);
    this.emitStateChange();
  }

  dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
  }

  getStateSnapshot(): NavigationSnapshot | undefined {
    if (!this.currentFolderId || !this.currentFileId) {
      return undefined;
    }
    return {
      folderId: this.currentFolderId,
      fileId: this.currentFileId,
      lineIndex: this.currentLineIndex,
    };
  }

  restoreState(snapshot: NavigationSnapshot): boolean {
    const file = this.stateService.getFile(snapshot.folderId, snapshot.fileId);
    if (!file) {
      return false;
    }

    this.currentFolderId = snapshot.folderId;
    this.currentFileId = snapshot.fileId;

    if (file.lines.length === 0) {
      this.currentLineIndex = 0;
      this.currentChapterIndex = 0;
    } else {
      const clampedLine = Math.min(Math.max(snapshot.lineIndex, 0), file.lines.length - 1);
      this.currentLineIndex = clampedLine;
      this.currentChapterIndex = this.findChapterIndexForLine(file, this.currentLineIndex);
    }

    this.updateContexts(true);
    this.updateUi();
    if (this.displayMode === 'panel') {
      this.panel.reveal();
    }
    return true;
  }

  private moveLine(delta: number): void {
    const file = this.getCurrentFile();
    if (!file) {
      return;
    }

    if (file.lines.length === 0) {
      return;
    }

    const targetIndex = this.currentLineIndex + delta;
    if (targetIndex < 0 || targetIndex >= file.lines.length) {
      return;
    }

    this.currentLineIndex = targetIndex;
    this.currentChapterIndex = this.findChapterIndexForLine(file, this.currentLineIndex);
    this.updateUi();
  }

  private moveChapter(delta: number): void {
    const file = this.getCurrentFile();
    if (!file) {
      return;
    }

    const targetIndex = this.currentChapterIndex + delta;
    if (targetIndex < 0 || targetIndex >= file.chapters.length) {
      return;
    }

    this.currentChapterIndex = targetIndex;
    const chapterLine = file.chapters[targetIndex].startLine;
    this.currentLineIndex = file.lines.length > 0 ? Math.min(Math.max(chapterLine, 0), file.lines.length - 1) : 0;
    this.updateUi();
  }

  private jumpToChapterLine(chapterIndex: number, lineNumber?: number): void {
    const file = this.getCurrentFile();
    if (!file) {
      return;
    }

    if (file.lines.length === 0 || file.chapters.length === 0) {
      return;
    }

    if (chapterIndex < 0 || chapterIndex >= file.chapters.length) {
      vscode.window.showWarningMessage('无效的章节编号。');
      return;
    }

    const chapter = file.chapters[chapterIndex];
    this.currentChapterIndex = chapterIndex;

    let targetLine = chapter.startLine;
    if (lineNumber !== undefined) {
      const totalLines = chapter.lines.length > 0
        ? chapter.lines.length
        : Math.max(file.lines.length - chapter.startLine, 1);
      const offset = Math.min(Math.max(lineNumber - 1, 0), totalLines - 1);
      targetLine = Math.min(chapter.startLine + offset, file.lines.length - 1);
    }

    this.currentLineIndex = Math.min(Math.max(targetLine, 0), file.lines.length - 1);
    this.updateUi();
  }

  private findChapterIndexForLine(file: NovelFile, lineIndex: number): number {
    const chapters = file.chapters;
    for (let i = chapters.length - 1; i >= 0; i -= 1) {
      if (lineIndex >= chapters[i].startLine) {
        return i;
      }
    }
    return 0;
  }

  private getCurrentFile(): NovelFile | undefined {
    if (!this.currentFolderId || !this.currentFileId) {
      return undefined;
    }
    return this.stateService.getFile(this.currentFolderId, this.currentFileId);
  }

  private getCurrentFolder(): NovelFolder | undefined {
    if (!this.currentFolderId) {
      return undefined;
    }
    return this.stateService.getFolder(this.currentFolderId);
  }

  private updateUi(): void {
    const file = this.getCurrentFile();
    if (!file) {
      this.clear();
      return;
    }

    const chapter = file.chapters[this.currentChapterIndex];
    const line = file.lines[this.currentLineIndex] ?? '';

    const chapterToShow = chapter ?? file.chapters[0];
    const highlight = chapterToShow ? this.currentLineIndex - (chapterToShow.startLine ?? 0) : 0;

    this.statusBar.setLine(line, chapterToShow?.title ?? file.name);
    this.panel.update(file.name, chapterToShow ?? {
      id: file.id,
      title: file.name,
      startLine: 0,
      lines: file.lines,
    }, Math.max(highlight, 0));
    this.persistProgress();
    this.emitStateChange();
  }

  private updateContexts(hasSelection: boolean): void {
    vscode.commands.executeCommand('setContext', 'novelNavigator.hasSelection', hasSelection);
  }

  private handleStateChange(): void {
    if (!this.currentFolderId || !this.currentFileId) {
      return;
    }
    const folder = this.getCurrentFolder();
    const file = this.getCurrentFile();
    if (!folder || !file) {
      this.clear();
    } else {
      this.currentChapterIndex = this.findChapterIndexForLine(file, this.currentLineIndex);
      this.updateUi();
    }
  }

  private handlePanelMessage(message: unknown): void {
    if (!message || typeof message !== 'object') {
      return;
    }
    const payload = message as { type?: string };
    switch (payload.type) {
      case 'nextLine':
        this.nextLine();
        break;
      case 'previousLine':
        this.previousLine();
        break;
      case 'nextChapter':
        this.nextChapter();
        break;
      case 'previousChapter':
        this.previousChapter();
        break;
      default:
        break;
    }
  }

  private emitStateChange(): void {
    this.stateEmitter.fire();
  }

  private restoreLineIndex(file: NovelFile): number {
    if (file.lines.length === 0) {
      return 0;
    }

    const storedLine = file.lastLineIndex ?? file.chapters[0]?.startLine ?? 0;
    const clampedLine = Math.min(Math.max(storedLine, 0), file.lines.length - 1);
    return clampedLine;
  }

  private persistProgress(): void {
    if (!this.currentFolderId || !this.currentFileId) {
      return;
    }
    this.stateService.updateFileProgress(
      this.currentFolderId,
      this.currentFileId,
      this.currentLineIndex,
      this.currentChapterIndex,
    );
  }
}
