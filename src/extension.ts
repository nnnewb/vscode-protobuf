// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import SemanticTokenProvider from './providers/SemanticHighlightProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('activated!');

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
  const provider = new SemanticTokenProvider(legend);

  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(selector, provider, legend));
}

// this method is called when your extension is deactivated
export function deactivate() {}
