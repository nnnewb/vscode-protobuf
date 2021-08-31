import * as vscode from 'vscode';
import ProtoTrees, { asRange } from '../trees';

export default class HoverProvider implements vscode.HoverProvider {
  constructor(public trees: ProtoTrees) {}
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    const sym = document.getText(document.getWordRangeAtPosition(position));
    const root = this.trees.getDoc(document)?.rootNode;
    if (!root) {
      return null;
    }

    const firstMatch = this.trees
      .query('(message (message_name) @message)')
      .captures(root)
      .filter((c) => c.node.text === sym)[0];

    if (firstMatch) {
      const definition = document.getText(asRange(firstMatch.node.parent!));
      const hoverDocument = new vscode.MarkdownString();
      hoverDocument.appendCodeblock(definition, 'proto');
      return new vscode.Hover(hoverDocument);
    }
  }
}
