import * as vscode from 'vscode';
import { Point, SyntaxNode } from 'web-tree-sitter';
import ProtoTrees, { asPoint, asRange } from '../trees';
import Tokenizer, { Token } from '../utils/tokenizer';

export default class CompletionItemProvider implements vscode.CompletionItemProvider {
  constructor(public trees: ProtoTrees) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>> {
    const node = this.trees.get(document).rootNode.namedDescendantForPosition(asPoint(position));
    console.log(`scope is ${node.type}`);

    const prev = findPreviousToken(document.getText(asRange(node)), node, document.offsetAt(position));
    console.log(`prev token is ${prev?.tok}`);

    switch (node.type) {
      case 'message_body':
        if (prev?.tok === 'repeated' || prev?.tok === 'optional' || prev?.tok === ';' || prev?.tok === '{') {
          // TODO types
          return Promise.resolve([
            new vscode.CompletionItem('int32', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('int64', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('sint32', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('sint64', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('fixed32', vscode.CompletionItemKind.Keyword),
            new vscode.CompletionItem('fixed64', vscode.CompletionItemKind.Keyword),
          ]);
        }
        break;
      case 'field':
        if (!prev) {
          // TODO types & optional/repeated & option
        }
        break;
      case 'service':
        break;
      case 'rpc':
        break;
      case 'block_lit':
        break;

      default:
        break;
    }

    return Promise.resolve([]);
  }
}

function findPreviousToken(source: string, node: SyntaxNode, caretOffset: number): Token | null {
  const tokenizer = new Tokenizer(source, true);
  const stack: Token[] = [];

  for (let tok = tokenizer.next(); tok !== null; tok = tokenizer.next()) {
    if (tok.offset + node.startIndex > caretOffset) {
      break;
    }
    stack.push(tok);
  }

  const top = stack[stack.length - 2];
  return top || null;
}
