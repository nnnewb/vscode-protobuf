import * as vscode from 'vscode';
import { Definition, Location, LocationLink, Position, ProviderResult, TextDocument } from 'vscode';
import { Analyzer } from '../analyzer';
import ProtoTrees from '../trees';
import { asRange } from '../trees';

export default class DefinitionProvider implements vscode.DefinitionProvider {
  constructor(public analyzer: Analyzer) {}
  provideDefinition(document: TextDocument, position: Position): ProviderResult<Definition | LocationLink[]> {
    const sym = document.getText(document.getWordRangeAtPosition(position));
    const root = this.analyzer.trees.getDoc(document)?.rootNode;
    if (!root) {
      return null;
    }

    return Promise.resolve(
      this.analyzer.trees
        .query('(message (message_name) @message)')
        .captures(root)
        .filter((c) => c.node.text === sym)
        .map((capture) => new Location(document.uri, asRange(capture.node)))
    );
  }
}
