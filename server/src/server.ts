import {
	createConnection,
	TextDocuments,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';

import {
	TextDocument
} from 'vscode-languageserver-textdocument';

import {
	exec
} from 'child_process';
import {
	join
} from 'path';

// コネクションを作成
const connection = createConnection(ProposedFeatures.all);
// ドキュメントマネージャーを作成
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// ドキュメントの内容
let position = -1;

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: {
				resolveProvider: true
			}
		}
	};
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}
	return result;
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// The example settings
interface ExampleSettings {
	maxNumberOfProblems: number;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}
});

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

let completionItems: CompletionItem[];

documents.onDidChangeContent(async change => {
	getAllIds(change.document);
});

// すべての変数名を取得し、予測候補に格納
const getAllIds = async (textDocument: TextDocument): Promise<void> => {
	const command = `${join(__dirname, 'parse')} ${textDocument.uri.slice(7)} ${position}`;
	const execBuf = exec(command, (err, stdout, stderr) => {
		const candidates: CompletionItem[] = [];
		try {
			const parseTree = JSON.parse(stdout);
			const searchIds = (tree: any) => {
				const keys = Object.keys(tree);
				keys.forEach((key) => {
					const value = tree[key];
					if (typeof value === 'object') {
						searchIds(value);
					} else if (key === 'id' && candidates.findIndex(e => e.data === value) === -1) {
						candidates.push({
							label: value,
							kind: CompletionItemKind.Variable,
							data: value
						});
					}
				});
			};
			searchIds(parseTree);
			console.log(completionItems);
			candidates.push(
				{ label: 'let', kind: CompletionItemKind.Keyword, data: 'let' },
				{ label: 'val', kind: CompletionItemKind.Keyword, data: 'val' },
				{ label: 'in', kind: CompletionItemKind.Keyword, data: 'in' },
				{ label: 'end', kind: CompletionItemKind.Keyword, data: 'end' },
			);
		} catch (e) {
			console.log('構文解析に失敗しました');
			return -1;
		} finally {
			completionItems = candidates;
		}
	});
	execBuf.stdin?.write(textDocument.getText());
	execBuf.stdin?.end();
};

connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {

		position = _textDocumentPosition.position.character;

		// 補完候補があれば返す
		if (completionItems && completionItems.length > 0) {
			return completionItems;
		}
		return [];
	}
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

// ドキュメントイベント(内容の変更やファイルの開閉等)を監視
documents.listen(connection);

// 接続を監視
connection.listen();
