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
exports.NovelTreeDataProvider = exports.NovelTreeItem = void 0;
const vscode = __importStar(require("vscode"));
class NovelTreeItem extends vscode.TreeItem {
    data;
    constructor(data) {
        super(data.type === 'folder' ? data.folder.name : data.file.name, data.type === 'folder'
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None);
        this.data = data;
        if (data.type === 'folder') {
            this.contextValue = 'novelFolder';
            this.iconPath = new vscode.ThemeIcon('library');
        }
        else {
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
exports.NovelTreeItem = NovelTreeItem;
class NovelTreeDataProvider {
    stateService;
    changeEmitter = new vscode.EventEmitter();
    onDidChangeTreeData = this.changeEmitter.event;
    constructor(stateService) {
        this.stateService = stateService;
        this.stateService.onDidChange(() => this.refresh());
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return this.stateService.getFolders().map(folder => new NovelTreeItem({ type: 'folder', folder }));
        }
        if (element.data.type === 'folder') {
            return element.data.folder.files.map(file => new NovelTreeItem({ type: 'file', folder: element.data.folder, file }));
        }
        return [];
    }
    refresh() {
        this.changeEmitter.fire();
    }
}
exports.NovelTreeDataProvider = NovelTreeDataProvider;
//# sourceMappingURL=novelTreeDataProvider.js.map