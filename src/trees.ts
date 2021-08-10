import { Tree } from 'web-tree-sitter';
import Parser = require('web-tree-sitter');
import * as vscode from 'vscode';

export function asPoint(pos: vscode.Position): Parser.Point {
  return { row: pos.line, column: pos.character };
}

export function asPosition(point: Parser.Point): vscode.Position {
  return new vscode.Position(point.row, point.column);
}

export function asRange(node: Parser.SyntaxNode): vscode.Range {
  return new vscode.Range(asPosition(node.startPosition), asPosition(node.endPosition));
}

export default class ProtoTrees {
  private lang: Parser.Language;
  private parser: Parser;
  private docTrees: { [doc: string]: { tree: Tree; version: number } };

  constructor(lang: Parser.Language) {
    this.lang = lang;
    this.parser = new Parser();
    this.parser.setLanguage(lang);
    this.docTrees = {};
  }

  addDoc(doc: vscode.TextDocument) {
    const docUri = doc.uri.toString();
    // doc not exists or doc version lower than current doc version, rebuild tree
    if (!this.docTrees[docUri] || this.docTrees[docUri].version < doc.version) {
      const tree = this.parser.parse(doc.getText());
      this.docTrees[docUri] = { tree, version: doc.version };
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

  query(doc: vscode.TextDocument, source: string): Parser.Query {
    const docId = doc.uri.toString();
    if (!this.docTrees[docId]) {
      this.addDoc(doc);
    }

    return this.lang.query(source);
  }

  get(doc: vscode.TextDocument): Tree {
    const docId: string = doc.uri.toString();
    if (!this.docTrees[docId]) {
      this.addDoc(doc);
    }

    return this.docTrees[docId].tree;
  }
}
