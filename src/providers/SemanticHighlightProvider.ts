import { readFileSync } from 'fs';
import path = require('path');
import * as vscode from 'vscode';
import Parser = require('web-tree-sitter');

export default class SemanticTokenProvider implements vscode.DocumentSemanticTokensProvider {
  private parser: Parser | null = null;
  private highlight: string;

  constructor(public legend: vscode.SemanticTokensLegend) {
    Parser.init()
      .then(() => {
        Parser.Language.load(path.resolve(__dirname, '../../assets/tree-sitter-proto.wasm'))
          .then((lang) => {
            this.parser = new Parser();
            this.parser.setLanguage(lang);
          })
          .catch(console.error);
      })
      .catch(console.error);
    this.highlight = readFileSync(path.resolve(__dirname, '../../assets/highlight.scm')).toString('utf-8');
  }

  onDidChangeSemanticTokens?: vscode.Event<void> | undefined;

  provideDocumentSemanticTokens(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.SemanticTokens> {
    const tree = this.parser?.parse(document.getText());
    try {
      const query: Parser.Query = this.parser?.getLanguage().query(this.highlight);
      const captures = query.captures(tree!.rootNode);

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
      return Promise.resolve(tokens);
    } catch (err) {
      console.error(err);
      return Promise.reject(err);
    }
  }
}
