import * as vscode from 'vscode';
import ProtoTrees from '../trees';
import { asRange } from '../trees';

export default class DefinitionProvider implements vscode.DefinitionProvider {
  constructor(public trees: ProtoTrees) {}
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const sym = document.getText(document.getWordRangeAtPosition(position));
    const root = this.trees.getDoc(document)?.rootNode;
    if (!root) {
      return null;
    }

    return Promise.resolve(
      this.trees
        .query('(message (message_name) @message)')
        .captures(root)
        .filter((c) => c.node.text === sym)
        .map((capture) => new vscode.Location(document.uri, asRange(capture.node)))
    );
  }
}
