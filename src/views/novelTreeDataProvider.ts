import * as vscode from 'vscode';
import { NovelFile, NovelFolder } from '../types';
import { NovelStateService } from '../services/novelStateService';

interface FolderItemData {
  type: 'folder';
  folder: NovelFolder;
}

interface FileItemData {
  type: 'file';
  folder: NovelFolder;
  file: NovelFile;
}

export type NovelTreeItemData = FolderItemData | FileItemData;

export class NovelTreeItem extends vscode.TreeItem {
  constructor(readonly data: NovelTreeItemData) {
    super(
      data.type === 'folder' ? data.folder.name : data.file.name,
      data.type === 'folder'
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    );

    if (data.type === 'folder') {
      this.contextValue = 'novelFolder';
      this.iconPath = new vscode.ThemeIcon('library');
    } else {
      this.contextValue = 'novelFile';
      this.iconPath = new vscode.ThemeIcon('book');
      this.command = {
        command: 'novelNavigator.openFile',
        title: '打开文本',
        arguments: [data.folder.id, data.file.id],
      };
    }
  }
}

export class NovelTreeDataProvider implements vscode.TreeDataProvider<NovelTreeItem> {
  private readonly changeEmitter = new vscode.EventEmitter<NovelTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this.changeEmitter.event;

  constructor(private readonly stateService: NovelStateService) {
    this.stateService.onDidChange(() => this.refresh());
  }

  getTreeItem(element: NovelTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: NovelTreeItem | undefined): vscode.ProviderResult<NovelTreeItem[]> {
    if (!element) {
      return this.stateService.getFolders().map(folder => new NovelTreeItem({ type: 'folder', folder }));
    }

    if (element.data.type === 'folder') {
      return element.data.folder.files.map(file => new NovelTreeItem({ type: 'file', folder: element.data.folder, file }));
    }

    return [];
  }

  refresh(): void {
    this.changeEmitter.fire();
  }
}
