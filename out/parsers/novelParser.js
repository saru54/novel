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
exports.NovelParser = void 0;
const chardet = __importStar(require("chardet"));
const iconv = __importStar(require("iconv-lite"));
const chapterPattern = /^(第[\s\S]*?章|Chapter\s+\d+|CHAPTER\s+\d+)/i;
function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
class NovelParser {
    parse(content, fallbackTitle) {
        let text;
        // 处理编码检测和解码
        if (Buffer.isBuffer(content)) {
            const detectedEncoding = chardet.detect(content) || 'utf-8';
            let encoding = detectedEncoding.toLowerCase();
            // 映射编码格式
            if (encoding.startsWith('gb')) {
                encoding = 'gbk';
            }
            else if (!iconv.encodingExists(encoding)) {
                encoding = 'utf-8';
            }
            text = iconv.decode(content, encoding);
        }
        else {
            text = content;
        }
        const normalized = text.replace(/\r\n/g, '\n');
        const lines = normalized.split('\n');
        const chapters = [];
        let currentChapter;
        let buffer = [];
        const commitCurrent = () => {
            if (currentChapter) {
                currentChapter.lines = buffer.slice();
            }
        };
        lines.forEach((line, index) => {
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
            }
            else {
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
        }
        else {
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
exports.NovelParser = NovelParser;
//# sourceMappingURL=novelParser.js.map