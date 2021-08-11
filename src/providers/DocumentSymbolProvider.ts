import * as vscode from 'vscode';
import ProtoTrees from '../trees';
import { asRange } from '../trees';

export default class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  constructor(public trees: ProtoTrees) {}

  provideDocumentSymbols(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
    return Promise.resolve(
      this.trees
        .query('(message (message_name) @struct)\n(rpc (rpc_name) @method)')
        .captures(this.trees.get(document).rootNode)
        .map(function (capture) {
          let kind: vscode.SymbolKind = vscode.SymbolKind.Struct;
          if (capture.name === 'method') {
            kind = vscode.SymbolKind.Method;
          }

          return new vscode.DocumentSymbol(capture.node.text, '', kind, asRange(capture.node), asRange(capture.node));
        })
    );
  }
}
