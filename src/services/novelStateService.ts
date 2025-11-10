import * as vscode from 'vscode';
import { LibraryState, NovelChapter, NovelFile, NovelFolder } from '../types';

const STORAGE_KEY = 'novelNavigator.libraryState';

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ImportedFile {
  fileName: string;
  lines: string[];
  chapters: NovelChapter[];
  originalUri?: string;
}

export class NovelStateService {
  private state: LibraryState;
  private readonly changeEmitter = new vscode.EventEmitter<void>();

  readonly onDidChange = this.changeEmitter.event;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.state = this.context.globalState.get<LibraryState>(STORAGE_KEY) ?? { folders: [] };
  }

  getFolders(): NovelFolder[] {
    return this.state.folders;
  }

  getFolder(folderId: string): NovelFolder | undefined {
    return this.state.folders.find(folder => folder.id === folderId);
  }

  getFile(folderId: string, fileId: string): NovelFile | undefined {
    const folder = this.getFolder(folderId);
    return folder?.files.find(file => file.id === fileId);
  }

  createFolder(name: string): NovelFolder {
    const folder: NovelFolder = { id: createId('folder'), name, files: [] };
    this.state.folders.push(folder);
    this.persist();
    return folder;
  }

  renameFolder(folderId: string, name: string): void {
    const folder = this.getFolder(folderId);
    if (!folder) {
      return;
    }
    folder.name = name;
    this.persist();
  }

  removeFolder(folderId: string): void {
    const previousLength = this.state.folders.length;
    this.state.folders = this.state.folders.filter(folder => folder.id !== folderId);
    if (this.state.folders.length !== previousLength) {
      this.persist();
    }
  }

  addImportedFiles(folderId: string, importedFiles: ImportedFile[]): NovelFile[] {
    const folder = this.getFolder(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }
    const newFiles: NovelFile[] = importedFiles.map(file => ({
      id: createId('file'),
      name: file.fileName,
      originalUri: file.originalUri,
      lines: file.lines,
      chapters: file.chapters,
      lastLineIndex: 0,
      lastChapterIndex: 0,
    }));
    folder.files.push(...newFiles);
    this.persist();
    return newFiles;
  }

  deleteFile(folderId: string, fileId: string): void {
    const folder = this.getFolder(folderId);
    if (!folder) {
      return;
    }
    const previousLength = folder.files.length;
    folder.files = folder.files.filter(file => file.id !== fileId);
    if (folder.files.length !== previousLength) {
      this.persist();
    }
  }

  updateFileProgress(folderId: string, fileId: string, lineIndex: number, chapterIndex: number): void {
    const file = this.getFile(folderId, fileId);
    if (!file) {
      return;
    }

    if (file.lastLineIndex === lineIndex && file.lastChapterIndex === chapterIndex) {
      return;
    }

    file.lastLineIndex = lineIndex;
    file.lastChapterIndex = chapterIndex;
    this.persist();
  }

  private persist(): void {
    this.context.globalState.update(STORAGE_KEY, this.state);
    this.changeEmitter.fire();
  }
}
