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
exports.NovelStateService = void 0;
const vscode = __importStar(require("vscode"));
const STORAGE_KEY = 'novelNavigator.libraryState';
function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
class NovelStateService {
    context;
    state;
    changeEmitter = new vscode.EventEmitter();
    onDidChange = this.changeEmitter.event;
    constructor(context) {
        this.context = context;
        this.state = this.context.globalState.get(STORAGE_KEY) ?? { folders: [] };
    }
    getFolders() {
        return this.state.folders;
    }
    getFolder(folderId) {
        return this.state.folders.find(folder => folder.id === folderId);
    }
    getFile(folderId, fileId) {
        const folder = this.getFolder(folderId);
        return folder?.files.find(file => file.id === fileId);
    }
    createFolder(name) {
        const folder = { id: createId('folder'), name, files: [] };
        this.state.folders.push(folder);
        this.persist();
        return folder;
    }
    renameFolder(folderId, name) {
        const folder = this.getFolder(folderId);
        if (!folder) {
            return;
        }
        folder.name = name;
        this.persist();
    }
    removeFolder(folderId) {
        const previousLength = this.state.folders.length;
        this.state.folders = this.state.folders.filter(folder => folder.id !== folderId);
        if (this.state.folders.length !== previousLength) {
            this.persist();
        }
    }
    addImportedFiles(folderId, importedFiles) {
        const folder = this.getFolder(folderId);
        if (!folder) {
            throw new Error('Folder not found');
        }
        const newFiles = importedFiles.map(file => ({
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
    deleteFile(folderId, fileId) {
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
    updateFileProgress(folderId, fileId, lineIndex, chapterIndex) {
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
    persist() {
        this.context.globalState.update(STORAGE_KEY, this.state);
        this.changeEmitter.fire();
    }
}
exports.NovelStateService = NovelStateService;
//# sourceMappingURL=novelStateService.js.map