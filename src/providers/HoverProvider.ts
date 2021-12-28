import * as vscode from 'vscode';
import { Analyzer } from '../analyzer';

export default class HoverProvider implements vscode.HoverProvider {
  constructor(public analyzer: Analyzer) {}
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const sym = document.getText(document.getWordRangeAtPosition(position));
    const symbols = this.analyzer.discoverProtoSymbols(document.uri.toString(), true);

    const findSym = symbols.filter((s) => s.name === sym).shift();
    if (findSym) {
      const definition = findSym.node.parent!.text;
      const hoverDocument = new vscode.MarkdownString();
      hoverDocument.appendCodeblock(definition, 'proto');
      return new vscode.Hover(hoverDocument);
    }
  }
}
