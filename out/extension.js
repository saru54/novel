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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const novelStateService_1 = require("./services/novelStateService");
const novelParser_1 = require("./parsers/novelParser");
const novelTreeDataProvider_1 = require("./views/novelTreeDataProvider");
const navigationController_1 = require("./controllers/navigationController");
const statusBarController_1 = require("./controllers/statusBarController");
const buffer_1 = require("buffer");
const novelPanel_1 = require("./panels/novelPanel");
const ENABLED_KEY = 'novelNavigator.extensionEnabled';
const DISPLAY_MODE_KEY = 'novelNavigator.displayModePref';
const SHORTCUTS_KEY = 'novelNavigator.shortcutsPref';
const SESSION_STATE_KEY = 'novelNavigator.sessionState';
let navigation;
let statusBar;
let panel;
let extensionContext;
let sessionState;
let extensionEnabled = true;
let displayMode = 'statusBar';
let shortcutsEnabled = false;
let cachedShortcutsState = false;
function activate(context) {
    extensionContext = context;
    extensionEnabled = context.globalState.get(ENABLED_KEY) ?? true;
    displayMode = context.globalState.get(DISPLAY_MODE_KEY) ?? 'statusBar';
    cachedShortcutsState = context.globalState.get(SHORTCUTS_KEY) ?? false;
    shortcutsEnabled = cachedShortcutsState;
    sessionState = context.globalState.get(SESSION_STATE_KEY);
    const stateService = new novelStateService_1.NovelStateService(context);
    const parser = new novelParser_1.NovelParser();
    statusBar = new statusBarController_1.StatusBarController();
    panel = new novelPanel_1.NovelPanel(context.extensionUri);
    navigation = new navigationController_1.NavigationController(stateService, statusBar, panel);
    navigation.setDisplayMode(displayMode);
    const panelRegistration = vscode.window.registerWebviewViewProvider('novelNavigator.chapterPanel', panel, {
        webviewOptions: {
            retainContextWhenHidden: true,
        },
    });
    const treeDataProvider = new novelTreeDataProvider_1.NovelTreeDataProvider(stateService);
    const treeView = vscode.window.createTreeView('novelNavigator.library', {
        treeDataProvider,
        showCollapseAll: false,
    });
    navigation.registerTreeView(treeView);
    if (navigation) {
        context.subscriptions.push(navigation.onDidChange(() => saveSessionState()));
    }
    initializeContexts();
    statusBar.setDisplayMode(displayMode);
    setDisplayMode(displayMode);
    setExtensionEnabled(extensionEnabled);
    context.subscriptions.push(treeView, navigation, statusBar, panel, panelRegistration);
    context.subscriptions.push(vscode.commands.registerCommand('novelNavigator.createFolder', async () => {
        if (!ensureExtensionActive()) {
            return;
        }
        const folderName = await vscode.window.showInputBox({
            title: '新建文件夹',
            prompt: '请输入文件夹名称',
            ignoreFocusOut: true,
        });
        if (!folderName) {
            return;
        }
        stateService.createFolder(folderName.trim());
        vscode.window.showInformationMessage(`已创建文件夹“${folderName}”`);
    }), vscode.commands.registerCommand('novelNavigator.importTextFiles', async () => {
        if (!ensureExtensionActive()) {
            return;
        }
        const targetFolderId = await pickTargetFolder(stateService, treeView);
        if (!targetFolderId) {
            return;
        }
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: true,
            filters: {
                文本: ['txt', 'md'],
                所有文件: ['*'],
            },
            title: '导入小说文本',
        });
        if (!files || files.length === 0) {
            return;
        }
        const imported = [];
        for (const uri of files) {
            try {
                const data = await vscode.workspace.fs.readFile(uri);
                const buffer = buffer_1.Buffer.from(data);
                const parsed = parser.parse(buffer, uri.path.split('/').pop() ?? '未命名文本');
                imported.push({
                    fileName: uri.path.split('/').pop() ?? '未命名文本',
                    lines: parsed.lines,
                    chapters: parsed.chapters,
                    originalUri: uri.toString(),
                });
            }
            catch (error) {
                console.error(error);
                vscode.window.showWarningMessage(`导入文件失败: ${uri.fsPath}`);
            }
        }
        if (imported.length === 0) {
            return;
        }
        const newFiles = stateService.addImportedFiles(targetFolderId, imported);
        if (newFiles.length > 0) {
            navigation?.setActiveFile(targetFolderId, newFiles[0].id);
        }
        vscode.window.showInformationMessage(`成功导入 ${imported.length} 个文本文件。`);
    }), vscode.commands.registerCommand('novelNavigator.openFile', (folderId, fileId) => {
        if (!ensureExtensionActive()) {
            return;
        }
        navigation?.setActiveFile(folderId, fileId);
    }), vscode.commands.registerCommand('novelNavigator.nextLine', () => {
        if (!ensureExtensionActive()) {
            return;
        }
        navigation?.nextLine();
    }), vscode.commands.registerCommand('novelNavigator.previousLine', () => {
        if (!ensureExtensionActive()) {
            return;
        }
        navigation?.previousLine();
    }), vscode.commands.registerCommand('novelNavigator.nextChapter', () => {
        if (!ensureExtensionActive()) {
            return;
        }
        navigation?.nextChapter();
    }), vscode.commands.registerCommand('novelNavigator.previousChapter', () => {
        if (!ensureExtensionActive()) {
            return;
        }
        navigation?.previousChapter();
    }), vscode.commands.registerCommand('novelNavigator.toggleExtensionEnabled', () => {
        setExtensionEnabled(!extensionEnabled);
    }), vscode.commands.registerCommand('novelNavigator.toggleDisplayMode', () => {
        if (!extensionEnabled) {
            vscode.window.showInformationMessage('请先通过状态栏的导航按钮重新启用SR-Novel。');
            return;
        }
        setDisplayMode(displayMode === 'statusBar' ? 'panel' : 'statusBar');
    }), vscode.commands.registerCommand('novelNavigator.jumpToPosition', async () => {
        if (!ensureExtensionActive()) {
            return;
        }
        if (!navigation) {
            vscode.window.showInformationMessage('SR-Novel尚未初始化。');
            return;
        }
        await navigation.promptJumpToChapterLine();
    }), vscode.commands.registerCommand('novelNavigator.deleteFolder', async (item) => {
        if (!ensureExtensionActive()) {
            return;
        }
        const folder = resolveFolderTarget(item, treeView, stateService);
        if (!folder) {
            vscode.window.showInformationMessage('请选择要删除的文件夹。');
            return;
        }
        const confirm = await vscode.window.showWarningMessage(`确认删除文件夹“${folder.name}”及其所有文本吗？`, { modal: true }, '删除');
        if (confirm !== '删除') {
            return;
        }
        stateService.removeFolder(folder.id);
        const snapshot = navigation?.getStateSnapshot();
        if (snapshot && snapshot.folderId === folder.id) {
            navigation?.clear();
        }
        vscode.window.showInformationMessage(`已删除文件夹“${folder.name}”。`);
    }), vscode.commands.registerCommand('novelNavigator.deleteFile', async (item) => {
        if (!ensureExtensionActive()) {
            return;
        }
        const context = resolveFileTarget(item, treeView, stateService);
        if (!context) {
            vscode.window.showInformationMessage('请选择要删除的文本。');
            return;
        }
        const confirm = await vscode.window.showWarningMessage(`确认删除文本“${context.file.name}”吗？`, { modal: true }, '删除');
        if (confirm !== '删除') {
            return;
        }
        stateService.deleteFile(context.folder.id, context.file.id);
        const snapshot = navigation?.getStateSnapshot();
        if (snapshot && snapshot.folderId === context.folder.id && snapshot.fileId === context.file.id) {
            navigation?.clear();
        }
        vscode.window.showInformationMessage(`已删除文本“${context.file.name}”。`);
    }), vscode.commands.registerCommand('novelNavigator.toggleShortcuts', () => {
        if (!extensionEnabled) {
            vscode.window.showInformationMessage('SR-Novel已隐藏，无法切换快捷键。');
            return;
        }
        setShortcutsPreference(!cachedShortcutsState);
    }));
    context.subscriptions.push({
        dispose: () => {
            applyShortcutsState(false);
        },
    });
}
function deactivate() {
    if (navigation && extensionEnabled) {
        saveSessionState(true);
    }
    navigation = undefined;
    statusBar = undefined;
    panel = undefined;
}
async function pickTargetFolder(stateService, treeView) {
    const folders = stateService.getFolders();
    if (folders.length === 0) {
        const created = await vscode.window.showInputBox({
            title: '当前没有文件夹，创建一个新的文件夹',
            prompt: '请输入文件夹名称',
            ignoreFocusOut: true,
        });
        if (!created) {
            return undefined;
        }
        const folder = stateService.createFolder(created.trim());
        return folder.id;
    }
    const selected = treeView.selection?.[0];
    if (selected?.data.type === 'folder') {
        return selected.data.folder.id;
    }
    if (selected?.data.type === 'file') {
        return selected.data.folder.id;
    }
    const pick = await vscode.window.showQuickPick(folders.map(folder => ({ label: folder.name, value: folder.id })), {
        title: '选择导入目标文件夹',
        placeHolder: '请选择一个文件夹用于存放导入的文本',
    });
    return pick?.value;
}
function initializeContexts() {
    vscode.commands.executeCommand('setContext', 'novelNavigator.panelVisible', false);
    vscode.commands.executeCommand('setContext', 'novelNavigator.hasSelection', false);
}
function setExtensionEnabled(enabled) {
    if (!enabled) {
        saveSessionState(true);
    }
    extensionEnabled = enabled;
    extensionContext?.globalState.update(ENABLED_KEY, enabled);
    statusBar?.setExtensionVisible(enabled);
    vscode.commands.executeCommand('setContext', 'novelNavigator.extensionEnabled', enabled);
    updateDisplayModeContext();
    if (enabled) {
        applyShortcutsState(cachedShortcutsState);
        statusBar?.setDisplayMode(displayMode);
        navigation?.setDisplayMode(displayMode);
        restoreSessionState();
    }
    else {
        applyShortcutsState(false);
        statusBar?.setDisplayMode(displayMode);
        navigation?.clear();
    }
}
function setDisplayMode(mode) {
    displayMode = mode;
    extensionContext?.globalState.update(DISPLAY_MODE_KEY, mode);
    updateDisplayModeContext();
    statusBar?.setDisplayMode(mode);
    navigation?.setDisplayMode(mode);
}
function applyShortcutsState(enabled) {
    const active = enabled && extensionEnabled;
    shortcutsEnabled = active;
    statusBar?.setShortcutsEnabled(active);
    vscode.commands.executeCommand('setContext', 'novelNavigator.shortcutsEnabled', active);
}
function setShortcutsPreference(enabled) {
    cachedShortcutsState = enabled;
    extensionContext?.globalState.update(SHORTCUTS_KEY, cachedShortcutsState);
    applyShortcutsState(enabled);
}
function saveSessionState(force = false) {
    if (!extensionContext || !navigation) {
        return;
    }
    if (!force && !extensionEnabled) {
        return;
    }
    const snapshot = navigation.getStateSnapshot();
    sessionState = snapshot;
    extensionContext.globalState.update(SESSION_STATE_KEY, snapshot);
}
function restoreSessionState() {
    if (!extensionEnabled || !navigation) {
        return;
    }
    const stored = sessionState ?? extensionContext?.globalState.get(SESSION_STATE_KEY);
    if (!stored) {
        navigation.clear();
        return;
    }
    const restored = navigation.restoreState(stored);
    if (!restored) {
        sessionState = undefined;
        extensionContext?.globalState.update(SESSION_STATE_KEY, undefined);
        navigation.clear();
    }
}
function ensureExtensionActive() {
    if (extensionEnabled) {
        return true;
    }
    vscode.window.showInformationMessage('SR-Novel已隐藏，请点击状态栏中的导航按钮重新启用。');
    return false;
}
function updateDisplayModeContext() {
    vscode.commands.executeCommand('setContext', 'novelNavigator.displayMode', displayMode);
}
function resolveFolderTarget(item, treeView, stateService) {
    if (item && item.data.type === 'folder') {
        return stateService.getFolder(item.data.folder.id);
    }
    const selected = treeView.selection?.[0];
    if (selected && selected.data.type === 'folder') {
        return stateService.getFolder(selected.data.folder.id);
    }
    if (selected && selected.data.type === 'file') {
        return stateService.getFolder(selected.data.folder.id);
    }
    return undefined;
}
function resolveFileTarget(item, treeView, stateService) {
    if (item && item.data.type === 'file') {
        const data = item.data;
        const folder = stateService.getFolder(data.folder.id);
        const file = folder?.files.find(f => f.id === data.file.id);
        if (folder && file) {
            return { folder, file };
        }
    }
    const selected = treeView.selection?.[0];
    if (selected && selected.data.type === 'file') {
        const data = selected.data;
        const folder = stateService.getFolder(data.folder.id);
        const file = folder?.files.find(f => f.id === data.file.id);
        if (folder && file) {
            return { folder, file };
        }
    }
    return undefined;
}
//# sourceMappingURL=extension.js.map