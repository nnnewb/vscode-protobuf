import { create } from 'domain';
import * as vscode from 'vscode';
import { SyntaxNode } from 'web-tree-sitter';
import ProtoTrees, { asPoint, asRange } from '../trees';
import Tokenizer, { Token } from '../utils/tokenizer';
import { Message } from '../utils/wrapper';

const kwSyntax = createCompletionOption('syntax', vscode.CompletionItemKind.Keyword);
const kwPackage = createCompletionOption('package', vscode.CompletionItemKind.Keyword);
const kwOption = createCompletionOption('option', vscode.CompletionItemKind.Keyword);
const kwImport = createCompletionOption('import', vscode.CompletionItemKind.Keyword);
const kwMessage = createCompletionOption('message', vscode.CompletionItemKind.Keyword);
const kwEnum = createCompletionOption('enum', vscode.CompletionItemKind.Keyword);
const kwReserved = createCompletionOption('reserved', vscode.CompletionItemKind.Keyword);
const kwRpc = createCompletionOption('rpc', vscode.CompletionItemKind.Keyword);

const kwRepeated = createCompletionOption('repeated', vscode.CompletionItemKind.Keyword);
const kwOptional = createCompletionOption('optional', vscode.CompletionItemKind.Keyword);

let scalarTypes = [
  createCompletionOption('bool', vscode.CompletionItemKind.Keyword, ``),
  createCompletionOption(
    'int32',
    vscode.CompletionItemKind.Keyword,
    `Uses variable-length encoding. 
Inefficient for encoding negative numbers – if your field is likely to have 
negative values, use sint32 instead.`
  ),
  createCompletionOption(
    'int64',
    vscode.CompletionItemKind.Keyword,
    `Uses variable-length encoding. 
Inefficient for encoding negative numbers – if your field is likely to have 
negative values, use sint64 instead.    
    `
  ),
  createCompletionOption('uint32', vscode.CompletionItemKind.Keyword, `Uses variable-length encoding.`),
  createCompletionOption('uint64', vscode.CompletionItemKind.Keyword, `Uses variable-length encoding.`),
  createCompletionOption(
    'sint32',
    vscode.CompletionItemKind.Keyword,
    `Uses variable-length encoding. 
Signed int value. 
These more efficiently encode negative numbers than regular int32s.    
    `
  ),
  createCompletionOption(
    'sint64',
    vscode.CompletionItemKind.Keyword,
    `Uses variable-length encoding. 
Signed int value. 
These more efficiently encode negative numbers than regular int64s.    
    `
  ),
  createCompletionOption(
    'fixed32',
    vscode.CompletionItemKind.Keyword,
    `Always four bytes. 
More efficient than uint32 if values are often greater than 2^28.    
    `
  ),
  createCompletionOption(
    'fixed64',
    vscode.CompletionItemKind.Keyword,
    `Always eight bytes. 
More efficient than uint64 if values are often greater than 2^56.    
    `
  ),
  createCompletionOption('sfixed32', vscode.CompletionItemKind.Keyword, `Always four bytes.`),
  createCompletionOption('sfixed64', vscode.CompletionItemKind.Keyword, `Always eight bytes.`),
  createCompletionOption('float', vscode.CompletionItemKind.Keyword, ``),
  createCompletionOption('double', vscode.CompletionItemKind.Keyword, ``),
  createCompletionOption(
    'string',
    vscode.CompletionItemKind.Keyword,
    `A string must always contain UTF-8 encoded or 7-bit ASCII text.`
  ),
  createCompletionOption('bytes', vscode.CompletionItemKind.Keyword, `May contain any arbitrary sequence of bytes.`),
];

function createCompletionOption(
  label: string | vscode.CompletionItemLabel,
  kind: vscode.CompletionItemKind | undefined,
  documentation?: string | vscode.MarkdownString
): vscode.CompletionItem {
  const item = new vscode.CompletionItem(label, kind);
  item.documentation = documentation;
  return item;
}

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

    const availableTypes = this.trees
      .query('(message) @msg')
      .captures(this.trees.get(document).rootNode)
      .map((capture) => new Message(capture.node))
      .map((msg) => new vscode.CompletionItem(msg.fullName, vscode.CompletionItemKind.Struct));
    availableTypes.push(...scalarTypes);

    const completionResults: vscode.CompletionItem[] = [];
    switch (node.type) {
      case 'message_body':
        if (
          prev?.tok === ';' ||
          prev?.tok === '{' ||
          prev?.tok === 'repeated' ||
          prev?.tok === 'optional' ||
          prev?.tok === '}'
        ) {
          if (prev.tok === ';' || prev.tok === '{' || prev.tok === '}') {
            completionResults.push(kwOptional, kwRepeated);
          }
          completionResults.push(...availableTypes);
        }
        break;
      case 'field':
        if (!prev) {
          // TODO types & optional/repeated & option
          completionResults.push(kwOptional, kwRepeated, ...availableTypes);
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

    return Promise.resolve(completionResults);
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
