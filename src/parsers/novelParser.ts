import { NovelChapter } from '../types';
import * as chardet from 'chardet';
import * as iconv from 'iconv-lite';

const chapterPattern = /^(第[\s\S]*?章|Chapter\s+\d+|CHAPTER\s+\d+)/i;

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ParsedNovel {
  lines: string[];
  chapters: NovelChapter[];
}

export class NovelParser {
  parse(content: Buffer | string, fallbackTitle: string): ParsedNovel {
    let text: string;
    
    // 处理编码检测和解码
    if (Buffer.isBuffer(content)) {
      const detectedEncoding = chardet.detect(content) || 'utf-8';
      let encoding = detectedEncoding.toLowerCase();
      // 映射编码格式
      if (encoding.startsWith('gb')) {
        encoding = 'gbk';
      } else if (!iconv.encodingExists(encoding)) {
        encoding = 'utf-8';
      }
      text = iconv.decode(content, encoding);
    } else {
      text = content;
    }
    
    const normalized = text.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const chapters: NovelChapter[] = [];

    let currentChapter: NovelChapter | undefined;
    let buffer: string[] = [];

    const commitCurrent = () => {
      if (currentChapter) {
        currentChapter.lines = buffer.slice();
      }
    };

    lines.forEach((line: string, index: number) => {
      const trimmed = line.trim();
      if (trimmed.length > 0 && chapterPattern.test(trimmed)) {
        commitCurrent();
        currentChapter = {
          id: createId('chapter'),
          title: trimmed,
          startLine: index,
          lines: [],
        };
        chapters.push(currentChapter);
        buffer = [line];
      } else {
        buffer.push(line);
      }
    });

    commitCurrent();

    if (chapters.length === 0) {
      chapters.push({
        id: createId('chapter'),
        title: fallbackTitle,
        startLine: 0,
        lines,
      });
    } else {
      // ensure last chapter has copy of buffer (already committed)
      if (currentChapter && currentChapter.lines.length === 0) {
        currentChapter.lines = buffer.slice();
      }
    }

    return {
      lines,
      chapters,
    };
  }
}
