import * as vscode from 'vscode';
import { SyntaxNode } from 'web-tree-sitter';
import { Analyzer } from '../analyzer';
import { SymbolKind } from '../analyzer/symbol';
import ProtoTrees, { asPoint, asRange } from '../trees';
import Tokenizer, { Token } from '../utils/tokenizer';
import { createCompletionOption, scalarTypes, keywords, documentOptions, fieldOptions } from './builtins';

export default class CompletionItemProvider implements vscode.CompletionItemProvider {
  constructor(public trees: ProtoTrees, public analyzer: Analyzer) {}

  requestResponseType(document: vscode.TextDocument): vscode.CompletionItem[] {
    const symbols = this.analyzer.discoverProtoSymbols(document.uri.toString(), true);
    return [
      ...symbols
        .filter((sym) => sym.kind === SymbolKind.message)
        .map((sym) => createCompletionOption(sym.name, vscode.CompletionItemKind.Struct)),
    ];
  }

  fieldType(document: vscode.TextDocument): vscode.CompletionItem[] {
    const symbols = this.analyzer.discoverProtoSymbols(document.uri.toString(), true);

    return [
      ...symbols
        .filter((sym) => sym.kind === SymbolKind.enum)
        .map((sym) => createCompletionOption(sym.name, vscode.CompletionItemKind.Enum)),

      ...symbols
        .filter((sym) => sym.kind === SymbolKind.message)
        .map((sym) => createCompletionOption(sym.name, vscode.CompletionItemKind.Struct)),
      ...scalarTypes,
    ];
  }

  fieldHeading(document: vscode.TextDocument): vscode.CompletionItem[] {
    return [keywords.option, keywords.optional, keywords.repeated].concat(this.fieldType(document));
  }

  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] {
    if (this.analyzer.config.importPaths.length === 0) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
      this.analyzer.config.importPaths.push(workspaceFolder!.uri.fsPath);
    }

    const node = this.trees.getDoc(document)?.rootNode.namedDescendantForPosition(asPoint(position));
    if (!node) {
      return [];
    }

    const currentScope = node.type;
    const parentScope = node.parent?.type;
    console.log(`current ast scope ${currentScope}, parent ast scope ${parentScope}`);

    const ctx = node.text;
    console.log(`current completion context: ${ctx}`);

    const prev = findPreviousToken(document.getText(asRange(node)), node, document.offsetAt(position));
    console.log(`prev token is ${prev?.tok}`);

    const completionResults: vscode.CompletionItem[] = [];
    switch (node.type) {
      case 'source_file':
        if (!prev || prev.tok === '}' || prev.tok === ';') {
          completionResults.push(
            keywords.syntax,
            keywords.package,
            keywords.import,
            keywords.option,
            keywords.message,
            keywords.enum
          );
        } else if (prev.tok === 'option') {
          completionResults.push(...documentOptions);
        }
        break;
      case 'message_body':
        if (
          prev?.tok === ';' ||
          prev?.tok === '{' ||
          prev?.tok === 'repeated' ||
          prev?.tok === 'optional' ||
          prev?.tok === '}'
        ) {
          // 光标在空的 message 内，或 field、嵌套的 message 后
          if (prev.tok === ';' || prev.tok === '{' || prev.tok === '}') {
            completionResults.push(keywords.optional, keywords.repeated, keywords.option);
          }
          completionResults.push(...this.fieldType(document));
        }
        break;
      case 'field':
        if (!prev) {
          // 光标在 field 起始位置
          completionResults.push(...this.fieldHeading(document));
        } else if (prev.tok === 'optional' || prev.tok === 'repeated') {
          // 光标在 optional/repeated 关键字之后
          completionResults.push(...this.fieldType(document));
        }
        break;
      case 'field_options':
      case 'field_option':
        if (!prev || prev.tok === ',') {
          // 光标在一个 field option 的起始位置
          completionResults.push(...fieldOptions);
        }
        break;
      case 'service':
        break;
      case 'rpc':
        if (prev?.tok === '(') {
          completionResults.push(...this.requestResponseType(document));
        }
        break;
      case 'block_lit':
        break;
      case 'ERROR':
        if (parentScope === 'field' && prev && (prev.tok === '[' || prev.tok === '(')) {
          // 猜测是未完成的 field_options 子树
          // 光标在 field_options 中的起始位置
          completionResults.push(...fieldOptions);
        } else if (parentScope === 'message_body' && !prev) {
          // 猜测是未完成的 field 子树起始位置，后继节点不符合语法结构造成解析出 ERROR。
          completionResults.push(...this.fieldHeading(document));
        } else if (parentScope === 'service' && prev?.tok === '(') {
          completionResults.push(...this.requestResponseType(document));
        }
        break;

      default:
        break;
    }

    return completionResults;
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
