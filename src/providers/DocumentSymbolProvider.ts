import * as vscode from 'vscode';
import { Analyzer } from '../analyzer';
import { SymbolKind } from '../analyzer/symbol';
import ProtoTrees from '../trees';
import { asRange } from '../trees';

export default class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  constructor(public analyzer: Analyzer) {}

  provideDocumentSymbols(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
    const symbols = this.analyzer.discoverProtoSymbols(document.uri.toString(), false);

    return Promise.resolve(
      symbols
        .filter((sym) => sym.kind !== SymbolKind.field)
        .map((sym): vscode.DocumentSymbol => {
          switch (sym.kind) {
            case SymbolKind.enum:
              return new vscode.DocumentSymbol(
                sym.name,
                '',
                vscode.SymbolKind.Enum,
                asRange(sym.node),
                asRange(sym.node)
              );
            case SymbolKind.message:
              return new vscode.DocumentSymbol(
                sym.name,
                '',
                vscode.SymbolKind.Struct,
                asRange(sym.node),
                asRange(sym.node)
              );
            case SymbolKind.rpc:
              return new vscode.DocumentSymbol(
                sym.name,
                '',
                vscode.SymbolKind.Method,
                asRange(sym.node),
                asRange(sym.node)
              );
            case SymbolKind.service:
              return new vscode.DocumentSymbol(
                sym.name,
                '',
                vscode.SymbolKind.Class,
                asRange(sym.node),
                asRange(sym.node)
              );
            default:
              throw Error('unexpected symbol kind');
          }
        })
    );
    // this.trees
    //   .query('(message (message_name) @struct)\n(rpc (rpc_name) @method)')
    //   .captures(root)
    //   .map(function (capture) {
    //     let kind: vscode.SymbolKind = vscode.SymbolKind.Struct;
    //     if (capture.name === 'method') {
    //       kind = vscode.SymbolKind.Method;
    //     }

    //     return new vscode.DocumentSymbol(capture.node.text, '', kind, asRange(capture.node), asRange(capture.node));
    //   })
    // );
  }
}
