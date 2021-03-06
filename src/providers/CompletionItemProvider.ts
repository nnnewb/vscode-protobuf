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
          // ??????????????? message ????????? field???????????? message ???
          if (prev.tok === ';' || prev.tok === '{' || prev.tok === '}') {
            completionResults.push(keywords.optional, keywords.repeated, keywords.option);
          }
          completionResults.push(...this.fieldType(document));
        }
        break;
      case 'field':
        if (!prev) {
          // ????????? field ????????????
          completionResults.push(...this.fieldHeading(document));
        } else if (prev.tok === 'optional' || prev.tok === 'repeated') {
          // ????????? optional/repeated ???????????????
          completionResults.push(...this.fieldType(document));
        }
        break;
      case 'field_options':
      case 'field_option':
        if (!prev || prev.tok === ',') {
          // ??????????????? field option ???????????????
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
          // ????????????????????? field_options ??????
          // ????????? field_options ??????????????????
          completionResults.push(...fieldOptions);
        } else if (parentScope === 'message_body' && !prev) {
          // ????????????????????? field ????????????????????????????????????????????????????????????????????? ERROR???
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
