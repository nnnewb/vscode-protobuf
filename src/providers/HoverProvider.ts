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
    const firstMatch = this.trees
      .query('(message (message_name) @message)')
      .captures(this.trees.get(document).rootNode)
      .filter((c) => c.node.text === sym)[0];

    if (firstMatch) {
      const definition = document.getText(asRange(firstMatch.node.parent!));
      return Promise.resolve(new vscode.Hover('```\n' + definition + '\n```'));
    }
  }
}
