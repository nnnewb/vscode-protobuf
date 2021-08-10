import { readFileSync } from 'fs';
import path = require('path');
import * as vscode from 'vscode';
import ProtoTrees, { asRange } from '../trees';

export default class SemanticTokenProvider implements vscode.DocumentSemanticTokensProvider {
  private highlight: string;

  constructor(public trees: ProtoTrees, public legend: vscode.SemanticTokensLegend) {
    this.highlight = readFileSync(path.resolve(__dirname, '../../assets/highlight.scm')).toString('utf-8');
  }

  provideDocumentSemanticTokens(doc: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
    const tokenBuilder = new vscode.SemanticTokensBuilder(this.legend);
    this.trees
      .query(doc, this.highlight)
      .captures(this.trees.get(doc).rootNode)
      .forEach((capture) => {
        if (this.legend.tokenTypes.includes(capture.name)) {
          tokenBuilder.push(asRange(capture.node), capture.name);
        }
      });
    return Promise.resolve(tokenBuilder.build());
  }
}
