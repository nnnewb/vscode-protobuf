import * as vscode from 'vscode';
import { Point, SyntaxNode } from 'web-tree-sitter';
import ProtoTrees from '../trees';

function asPosition(point: Point): vscode.Position {
  return new vscode.Position(point.row, point.column);
}

function asRange(node: SyntaxNode): vscode.Range {
  return new vscode.Range(asPosition(node.startPosition), asPosition(node.endPosition));
}

export default class DefinitionProvider implements vscode.DefinitionProvider {
  constructor(public trees: ProtoTrees) {}
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.ProviderResult<vscode.Definition | vscode.LocationLink[]> {
    const sym = document.getText(document.getWordRangeAtPosition(position));
    return Promise.resolve(
      this.trees
        .query(document, '(message (message_name) @message)')
        .captures(this.trees.get(document).rootNode)
        .filter((c) => c.node.text === sym)
        .map((capture) => new vscode.Location(document.uri, asRange(capture.node)))
    );
  }
}
