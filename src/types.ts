export interface NovelChapter {
  id: string;
  title: string;
  startLine: number;
  lines: string[];
}

export interface NovelFile {
  id: string;
  name: string;
  originalUri?: string;
  lines: string[];
  chapters: NovelChapter[];
  lastLineIndex?: number;
  lastChapterIndex?: number;
}

export interface NovelFolder {
  id: string;
  name: string;
  files: NovelFile[];
}

export interface LibraryState {
  folders: NovelFolder[];
}

export type DisplayMode = 'statusBar' | 'panel';
