import * as vscode from 'vscode';
import { NovelStateService, ImportedFile } from './services/novelStateService';
import { NovelParser } from './parsers/novelParser';
import { NovelTreeDataProvider, NovelTreeItem } from './views/novelTreeDataProvider';
import { NavigationController, NavigationSnapshot } from './controllers/navigationController';
import { StatusBarController } from './controllers/statusBarController';
import { Buffer } from 'buffer';
import { NovelPanel } from './panels/novelPanel';
import { DisplayMode, NovelFolder, NovelFile } from './types';

const ENABLED_KEY = 'novelNavigator.extensionEnabled';
const DISPLAY_MODE_KEY = 'novelNavigator.displayModePref';
const SHORTCUTS_KEY = 'novelNavigator.shortcutsPref';
const SESSION_STATE_KEY = 'novelNavigator.sessionState';

type NavigatorSessionState = NavigationSnapshot;

let navigation: NavigationController | undefined;
let statusBar: StatusBarController | undefined;
let panel: NovelPanel | undefined;
let extensionContext: vscode.ExtensionContext | undefined;
let sessionState: NavigatorSessionState | undefined;

let extensionEnabled = true;
let displayMode: DisplayMode = 'statusBar';
let shortcutsEnabled = false;
let cachedShortcutsState = false;

export function activate(context: vscode.ExtensionContext): void {
	extensionContext = context;
	extensionEnabled = context.globalState.get<boolean>(ENABLED_KEY) ?? true;
	displayMode = context.globalState.get<DisplayMode>(DISPLAY_MODE_KEY) ?? 'statusBar';
	cachedShortcutsState = context.globalState.get<boolean>(SHORTCUTS_KEY) ?? false;
	shortcutsEnabled = cachedShortcutsState;
	sessionState = context.globalState.get<NavigatorSessionState>(SESSION_STATE_KEY);

	const stateService = new NovelStateService(context);
	const parser = new NovelParser();

	statusBar = new StatusBarController();
	panel = new NovelPanel(context.extensionUri);
	navigation = new NavigationController(stateService, statusBar, panel);
	navigation.setDisplayMode(displayMode);

	const panelRegistration = vscode.window.registerWebviewViewProvider(
		'novelNavigator.chapterPanel',
		panel,
		{
			webviewOptions: {
				retainContextWhenHidden: true,
			},
		},
	);

	const treeDataProvider = new NovelTreeDataProvider(stateService);
	const treeView = vscode.window.createTreeView<NovelTreeItem>('novelNavigator.library', {
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

	context.subscriptions.push(
		vscode.commands.registerCommand('novelNavigator.createFolder', async () => {
			if (!ensureExtensionActive()) {
				return;
			}
			const folderName = await vscode.window.showInputBox({
				title: '新建小说文件夹',
				prompt: '请输入文件夹名称',
				ignoreFocusOut: true,
			});
			if (!folderName) {
				return;
			}
			stateService.createFolder(folderName.trim());
			vscode.window.showInformationMessage(`已创建文件夹“${folderName}”`);
		}),

		vscode.commands.registerCommand('novelNavigator.importTextFiles', async () => {
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

			const imported: ImportedFile[] = [];
			for (const uri of files) {
				try {
					const data = await vscode.workspace.fs.readFile(uri);
					const buffer = Buffer.from(data);
					const parsed = parser.parse(buffer, uri.path.split('/').pop() ?? '未命名文本');
					imported.push({
						fileName: uri.path.split('/').pop() ?? '未命名文本',
						lines: parsed.lines,
						chapters: parsed.chapters,
						originalUri: uri.toString(),
					});
				} catch (error) {
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
		}),

		vscode.commands.registerCommand('novelNavigator.openFile', (folderId: string, fileId: string) => {
			if (!ensureExtensionActive()) {
				return;
			}
			navigation?.setActiveFile(folderId, fileId);
		}),

		vscode.commands.registerCommand('novelNavigator.nextLine', () => {
			if (!ensureExtensionActive()) {
				return;
			}
			navigation?.nextLine();
		}),

		vscode.commands.registerCommand('novelNavigator.previousLine', () => {
			if (!ensureExtensionActive()) {
				return;
			}
			navigation?.previousLine();
		}),

		vscode.commands.registerCommand('novelNavigator.nextChapter', () => {
			if (!ensureExtensionActive()) {
				return;
			}
			navigation?.nextChapter();
		}),

		vscode.commands.registerCommand('novelNavigator.previousChapter', () => {
			if (!ensureExtensionActive()) {
				return;
			}
			navigation?.previousChapter();
		}),

		vscode.commands.registerCommand('novelNavigator.toggleExtensionEnabled', () => {
			setExtensionEnabled(!extensionEnabled);
		}),

		vscode.commands.registerCommand('novelNavigator.toggleDisplayMode', () => {
			if (!extensionEnabled) {
				vscode.window.showInformationMessage('请先通过状态栏的导航按钮重新启用小说导航。');
				return;
			}
			setDisplayMode(displayMode === 'statusBar' ? 'panel' : 'statusBar');
		}),

		vscode.commands.registerCommand('novelNavigator.jumpToPosition', async () => {
			if (!ensureExtensionActive()) {
				return;
			}
			if (!navigation) {
				vscode.window.showInformationMessage('小说导航尚未初始化。');
				return;
			}
			await navigation.promptJumpToChapterLine();
		}),

		vscode.commands.registerCommand('novelNavigator.deleteFolder', async (item?: NovelTreeItem) => {
			if (!ensureExtensionActive()) {
				return;
			}
			const folder = resolveFolderTarget(item, treeView, stateService);
			if (!folder) {
				vscode.window.showInformationMessage('请选择要删除的文件夹。');
				return;
			}

				const confirm = await vscode.window.showWarningMessage(
					`确认删除文件夹“${folder.name}”及其所有文本吗？`,
					{ modal: true },
					'删除',
				);
				if (confirm !== '删除') {
					return;
				}

				stateService.removeFolder(folder.id);
				const snapshot = navigation?.getStateSnapshot();
				if (snapshot && snapshot.folderId === folder.id) {
					navigation?.clear();
				}
				vscode.window.showInformationMessage(`已删除文件夹“${folder.name}”。`);
			}),

			vscode.commands.registerCommand('novelNavigator.deleteFile', async (item?: NovelTreeItem) => {
				if (!ensureExtensionActive()) {
					return;
				}
				const context = resolveFileTarget(item, treeView, stateService);
				if (!context) {
					vscode.window.showInformationMessage('请选择要删除的文本。');
					return;
				}

				const confirm = await vscode.window.showWarningMessage(
					`确认删除文本“${context.file.name}”吗？`,
					{ modal: true },
					'删除',
				);
				if (confirm !== '删除') {
					return;
				}

				stateService.deleteFile(context.folder.id, context.file.id);
				const snapshot = navigation?.getStateSnapshot();
				if (snapshot && snapshot.folderId === context.folder.id && snapshot.fileId === context.file.id) {
					navigation?.clear();
				}
				vscode.window.showInformationMessage(`已删除文本“${context.file.name}”。`);
			}),

		vscode.commands.registerCommand('novelNavigator.toggleShortcuts', () => {
			if (!extensionEnabled) {
				vscode.window.showInformationMessage('小说导航已隐藏，无法切换快捷键。');
				return;
			}
			setShortcutsPreference(!cachedShortcutsState);
		}),
	);

	context.subscriptions.push({
		dispose: () => {
			applyShortcutsState(false);
		},
	});
}

export function deactivate(): void {
	if (navigation && extensionEnabled) {
		saveSessionState(true);
	}
	navigation = undefined;
	statusBar = undefined;
	panel = undefined;
}

async function pickTargetFolder(
	stateService: NovelStateService,
	treeView: vscode.TreeView<NovelTreeItem>,
): Promise<string | undefined> {
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

	const pick = await vscode.window.showQuickPick(
		folders.map(folder => ({ label: folder.name, value: folder.id })),
		{
			title: '选择导入目标文件夹',
			placeHolder: '请选择一个文件夹用于存放导入的文本',
		},
	);
	return pick?.value;
}

function initializeContexts(): void {
	vscode.commands.executeCommand('setContext', 'novelNavigator.panelVisible', false);
	vscode.commands.executeCommand('setContext', 'novelNavigator.hasSelection', false);
}

function setExtensionEnabled(enabled: boolean): void {
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
	} else {
		applyShortcutsState(false);
		statusBar?.setDisplayMode(displayMode);
		navigation?.clear();
	}
}

function setDisplayMode(mode: DisplayMode): void {
	displayMode = mode;
	extensionContext?.globalState.update(DISPLAY_MODE_KEY, mode);
	updateDisplayModeContext();
	statusBar?.setDisplayMode(mode);
	navigation?.setDisplayMode(mode);
}

function applyShortcutsState(enabled: boolean): void {
	const active = enabled && extensionEnabled;
	shortcutsEnabled = active;
	statusBar?.setShortcutsEnabled(active);
	vscode.commands.executeCommand('setContext', 'novelNavigator.shortcutsEnabled', active);
}

function setShortcutsPreference(enabled: boolean): void {
	cachedShortcutsState = enabled;
	extensionContext?.globalState.update(SHORTCUTS_KEY, cachedShortcutsState);
	applyShortcutsState(enabled);
}

function saveSessionState(force = false): void {
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

function restoreSessionState(): void {
	if (!extensionEnabled || !navigation) {
		return;
	}
	const stored = sessionState ?? extensionContext?.globalState.get<NavigatorSessionState>(SESSION_STATE_KEY);
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

function ensureExtensionActive(): boolean {
	if (extensionEnabled) {
		return true;
	}
	vscode.window.showInformationMessage('小说导航已隐藏，请点击状态栏中的导航按钮重新启用。');
	return false;
}

function updateDisplayModeContext(): void {
	vscode.commands.executeCommand('setContext', 'novelNavigator.displayMode', displayMode);
}

function resolveFolderTarget(
	item: NovelTreeItem | undefined,
	treeView: vscode.TreeView<NovelTreeItem>,
	stateService: NovelStateService,
): NovelFolder | undefined {
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

function resolveFileTarget(
	item: NovelTreeItem | undefined,
	treeView: vscode.TreeView<NovelTreeItem>,
	stateService: NovelStateService,
): { folder: NovelFolder; file: NovelFile } | undefined {
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