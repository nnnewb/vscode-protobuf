import { readFileSync } from 'fs';
import path = require('path');
import * as vscode from 'vscode';
import { QueryCapture } from 'web-tree-sitter';
import ProtoTrees from '../trees';

export default class SemanticTokenProvider implements vscode.DocumentSemanticTokensProvider {
  private highlight: string;

  constructor(public trees: ProtoTrees, public legend: vscode.SemanticTokensLegend) {
    this.highlight = readFileSync(path.resolve(__dirname, '../../assets/highlight.scm')).toString('utf-8');
  }

  onDidChangeSemanticTokens?: vscode.Event<void> | undefined;

  provideDocumentSemanticTokens(doc: vscode.TextDocument): vscode.ProviderResult<vscode.SemanticTokens> {
    return new Promise((resolve, reject) => {
      let captures: QueryCapture[] = [];
      try {
        captures = this.trees.query(doc, this.highlight).captures(this.trees.get(doc).rootNode);
      } catch (err) {
        reject(err);
      }

      const tokenBuilder = new vscode.SemanticTokensBuilder(this.legend);
      for (const capture of captures) {
        if (this.legend.tokenTypes.includes(capture.name)) {
          tokenBuilder.push(
            new vscode.Range(
              new vscode.Position(capture.node.startPosition.row, capture.node.startPosition.column),
              new vscode.Position(capture.node.endPosition.row, capture.node.endPosition.column)
            ),
            capture.name
          );
          continue;
        }
      }

      const tokens = tokenBuilder.build();
      return resolve(tokens);
    });
  }
}
