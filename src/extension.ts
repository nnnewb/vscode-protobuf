// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import path = require('path');
import * as vscode from 'vscode';
import Parser = require('web-tree-sitter');
import { Analyzer } from './analyzer';
import CompletionItemProvider from './providers/CompletionItemProvider';
import DefinitionProvider from './providers/DefinitionProvider';
import DocumentSymbolProvider from './providers/DocumentSymbolProvider';
import HoverProvider from './providers/HoverProvider';
import SemanticTokenProvider from './providers/SemanticHighlightProvider';
import ProtoTrees from './trees';

let trees: ProtoTrees | null = null;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  // register semantic tokens provider
  const tokenTypes = [
    'type',
    'enum',
    'class',
    'function',
    'comment',
    'string',
    'number',
    'keyword',
    'parameter',
    'member',
    'property',
    'enumMember',
    'namespace',
  ];
  const modifiers = ['definition', 'deprecated', 'documentation'];
  const selector: vscode.DocumentSelector = { language: 'proto', scheme: 'file' };
  const legend = new vscode.SemanticTokensLegend(tokenTypes, modifiers);

  await Parser.init();
  console.log('tree-sitter initialized');

  const lang = await Parser.Language.load(path.resolve(__dirname, '../assets/tree-sitter-proto.wasm'));
  console.log('tree-sitter-proto.wasm loaded');
  trees = new ProtoTrees(lang);

  vscode.workspace.onDidOpenTextDocument(function (doc) {
    if (doc.languageId === 'proto') {
      trees?.addDoc(doc);
    }
  });
  vscode.workspace.onDidCloseTextDocument(function (doc) {
    if (doc.languageId === 'proto') {
      trees?.dropDoc(doc.uri.toString());
    }
  });
  vscode.workspace.onDidChangeTextDocument(function (ev) {
    if (ev.document.languageId === 'proto') {
      trees?.editDoc(ev);
    }
  });

  for (const editor of vscode.window.visibleTextEditors) {
    if (editor.document.languageId === 'proto') {
      trees.addDoc(editor.document);
    }
  }

  const configuration = vscode.workspace.getConfiguration('protobuf');
  const globalAnalyzer = new Analyzer(trees, { importPaths: configuration.get('importPath', []) });

  const semanticHighlightProvider = new SemanticTokenProvider(trees, legend);
  context.subscriptions.push(
    vscode.languages.registerDocumentSemanticTokensProvider(selector, semanticHighlightProvider, legend),
    vscode.languages.registerDocumentRangeSemanticTokensProvider(selector, semanticHighlightProvider, legend)
  );

  const definitionProvider = new DefinitionProvider(globalAnalyzer);
  context.subscriptions.push(vscode.languages.registerDefinitionProvider(selector, definitionProvider));

  const documentSymbolProvider = new DocumentSymbolProvider(trees);
  context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider(selector, documentSymbolProvider));

  const hoverProvider = new HoverProvider(trees);
  context.subscriptions.push(vscode.languages.registerHoverProvider(selector, hoverProvider));

  const completionProvider = new CompletionItemProvider(trees, globalAnalyzer);
  context.subscriptions.push(vscode.languages.registerCompletionItemProvider(selector, completionProvider));

  console.log('extension activated!');
}

// this method is called when your extension is deactivated
export function deactivate() {}
