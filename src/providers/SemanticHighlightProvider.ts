import { readFileSync } from 'fs';
import path = require('path');
import * as vscode from 'vscode';
import ProtoTrees, { asPoint, asRange } from '../trees';

export default class SemanticTokenProvider
  implements vscode.DocumentSemanticTokensProvider, vscode.DocumentRangeSemanticTokensProvider
{
  private highlight: string;

  constructor(public trees: ProtoTrees, public legend: vscode.SemanticTokensLegend) {
    this.highlight = readFileSync(path.resolve(__dirname, '../../assets/highlight.scm')).toString('utf-8');
  }

  provideDocumentRangeSemanticTokens(
    document: vscode.TextDocument,
    range: vscode.Range
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    const tokenBuilder = new vscode.SemanticTokensBuilder(this.legend);
    const root = this.trees.getDoc(document)?.rootNode;
    if (!root) {
      return null;
    }

    this.trees
      .query(this.highlight)
      .captures(root, asPoint(range.start), asPoint(range.end))
      .forEach((capture) => {
        if (this.legend.tokenTypes.includes(capture.name)) {
          tokenBuilder.push(asRange(capture.node), capture.name);
        }
      });
    return tokenBuilder.build();
  }

  provideDocumentSemanticTokens(document: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
    const tokenBuilder = new vscode.SemanticTokensBuilder(this.legend);
    const root = this.trees.getDoc(document)?.rootNode;
    if (!root) {
      return null;
    }

    this.trees
      .query(this.highlight)
      .captures(root)
      .forEach((capture) => {
        if (this.legend.tokenTypes.includes(capture.name)) {
          tokenBuilder.push(asRange(capture.node), capture.name);
        }
      });
    return tokenBuilder.build();
  }
}
