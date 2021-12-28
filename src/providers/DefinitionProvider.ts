import * as vscode from 'vscode';
import { Definition, Location, LocationLink, Position, ProviderResult, TextDocument } from 'vscode';
import { Analyzer } from '../analyzer';
import { asPosition } from '../trees';

export default class DefinitionProvider implements vscode.DefinitionProvider {
  constructor(public analyzer: Analyzer) {}
  provideDefinition(document: TextDocument, position: Position): ProviderResult<Definition | LocationLink[]> {
    const sym = document.getText(document.getWordRangeAtPosition(position));
    const symbols = this.analyzer.discoverProtoSymbols(document.uri.toString(), true);

    return symbols
      .filter((s) => s.name === sym)
      .map((s) => new Location(vscode.Uri.parse(s.source), asPosition(s.range.startPosition)));
  }
}
