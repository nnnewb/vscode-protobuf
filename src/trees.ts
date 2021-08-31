import { Tree } from 'web-tree-sitter';
import Parser = require('web-tree-sitter');
import * as vscode from 'vscode';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

export function asPoint(pos: vscode.Position): Parser.Point {
  return { row: pos.line, column: pos.character };
}

export function asPosition(point: Parser.Point): vscode.Position {
  return new vscode.Position(point.row, point.column);
}

export function asRange(node: Parser.SyntaxNode): vscode.Range {
  return new vscode.Range(asPosition(node.startPosition), asPosition(node.endPosition));
}

export default class ProtoTrees implements Iterable<Tree> {
  private lang: Parser.Language;
  private parser: Parser;
  private docTrees: { [doc: string]: { tree: Tree; version: number } };

  constructor(lang: Parser.Language) {
    this.lang = lang;
    this.parser = new Parser();
    this.parser.setLanguage(lang);
    this.docTrees = {};
  }

  *[Symbol.iterator](): Iterator<Tree, any, undefined> {
    for (const key in this.docTrees) {
      if (Object.prototype.hasOwnProperty.call(this.docTrees, key)) {
        const tree = this.docTrees[key];
        yield tree.tree;
      }
    }
  }

  addDoc(uri: string, content: string, version: number): void;
  addDoc(doc: vscode.TextDocument): void;
  addDoc(doc: string | vscode.TextDocument, content?: string, version?: number): void {
    // check overload function signature
    let docUri = '';
    if (typeof doc === 'string') {
      docUri = doc;
      if (content === undefined || version === undefined) {
        throw new Error('content and version are required parameters');
      }
    } else {
      docUri = doc.uri.toString();
      content = doc.getText();
      version = doc.version;
    }

    // doc not exists or doc version lower than current doc version, rebuild tree
    if (!this.docTrees[docUri] || this.docTrees[docUri].version < version) {
      const tree = this.parser.parse(content);
      this.docTrees[docUri] = { tree, version };
    }
  }

  editDoc(edit: vscode.TextDocumentChangeEvent) {
    const doc = edit.document;
    const contentChanges = edit.contentChanges;
    const docId = doc.uri.toString();

    // if doc not exist, parse and cache it.
    if (!this.docTrees[docId]) {
      this.addDoc(doc);
      return;
    }

    // cached tree newer than mentioned
    if (doc.version < this.docTrees[docId].version) {
      return;
    }

    // find modified content range and apply to old tree
    const old = this.docTrees[docId].tree;
    for (const ev of contentChanges) {
      const startIndex = ev.rangeOffset;
      const oldEndIndex = ev.rangeOffset + ev.rangeLength;
      const newEndIndex = ev.rangeOffset + ev.text.length;

      old.edit({
        startIndex,
        oldEndIndex,
        newEndIndex,
        startPosition: asPoint(doc.positionAt(startIndex)),
        oldEndPosition: asPoint(doc.positionAt(oldEndIndex)),
        newEndPosition: asPoint(doc.positionAt(newEndIndex)),
      });

      // build new tree
      const newTree = this.parser.parse(doc.getText(), old);
      this.docTrees[docId] = { tree: newTree, version: doc.version };
    }
  }

  dropDoc(docUri: string) {
    if (this.docTrees[docUri]) {
      this.docTrees[docUri].tree.delete();
      delete this.docTrees[docUri];
    }
  }

  delete() {
    for (const doc in this.docTrees) {
      this.docTrees[doc].tree.delete();
    }
    this.docTrees = {};
    this.parser.delete();
  }

  query(source: string): Parser.Query {
    return this.lang.query(source);
  }

  getDoc(doc: vscode.TextDocument): Tree | null;
  getDoc(uri: string): Tree | null;
  getDoc(doc: vscode.TextDocument | string): Tree | null {
    let docId: string;
    if (typeof doc === 'string') {
      docId = doc;
    } else {
      docId = doc.uri.toString();
    }

    if (!this.docTrees[docId]) {
      if (typeof doc === 'string') {
        const content = readFileSync(fileURLToPath(docId)).toString('utf-8');
        this.addDoc(docId, content, 1);
      } else {
        this.addDoc(doc);
      }
    }

    return this.docTrees[docId].tree || null;
  }

  walk(doc: vscode.TextDocument): Parser.TreeCursor {
    const docId: string = doc.uri.toString();
    if (!this.docTrees[docId]) {
      this.addDoc(doc);
    }

    return this.docTrees[docId].tree.walk();
  }
}
