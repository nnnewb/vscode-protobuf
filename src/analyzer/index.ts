import ProtoTrees from '../trees';
import { ProtoSymbol, SymbolKind } from './symbol';
import path = require('path');
import { existsSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { Tree } from 'web-tree-sitter';
import { getFullScope } from '../utils/wrapper';

export interface AnalyzerConfig {
  importPaths: string[];
}

export class Analyzer {
  constructor(public trees: ProtoTrees, public config: AnalyzerConfig) {}

  /**
   * 解析import路径
   * @param target import的路径
   * @returns 解析结果，最终存在并使用的文件路径
   */
  private resolveImportPath(src: string, target: string): string | null {
    const sourceDir = path.dirname(path.resolve(fileURLToPath(src)));
    for (const p of this.config.importPaths.concat([sourceDir])) {
      const resolved = path.resolve(p, target);
      if (existsSync(resolved)) {
        return resolved;
      }
    }
    return null;
  }

  /**
   * 查找所有导入的符号
   * @param tree 需要解析import语句的语法树
   * @returns 所有被导入的语法树
   */
  private findImportSymbols(fileUri: string, tree: Tree): ProtoSymbol[] {
    const importedSymbols: ProtoSymbol[] = [];

    // resolve import statement in source file
    for (const capture of this.trees.query('(import path: (string) @ip)').captures(tree.rootNode)) {
      const imported = this.resolveImportPath(fileUri, capture.node.text.replace(/^["']/, '').replace(/['"]$/, ''));
      if (!imported) {
        console.log(`resolve import ${capture.node.text} failed`);
        continue;
      }

      const uri = pathToFileURL(imported).toString();
      const importedTree = this.trees.getDoc(uri);
      if (!importedTree) {
        continue;
      }

      // do parse recursively
      importedSymbols.push(...this.findLocalSymbols(uri, importedTree), ...this.findImportSymbols(uri, importedTree));
    }

    return importedSymbols;
  }

  /**
   * 查找所有定义在语法树中的本地符号
   * @param uri 源码uri
   * @param tree 需要解析的语法树
   * @returns 所有本地符号
   */
  private findLocalSymbols(uri: string, tree: Tree): ProtoSymbol[] {
    const symbols: ProtoSymbol[] = [];
    const kindMapping: Record<string, SymbolKind> = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      enum_name: SymbolKind.enum,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      message_name: SymbolKind.message,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      rpc_name: SymbolKind.rpc,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      service_name: SymbolKind.service,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      field_name: SymbolKind.field,
    };

    let packageName = '';
    const packageCaptures = this.trees
      .query('(package package_name: (full_ident) @package_name)')
      .captures(tree.rootNode);
    if (packageCaptures.length > 0) {
      packageName = packageCaptures[0].node.text;
    }

    const captures = this.trees
      .query('[(message_name) (enum_name) (rpc_name) (service_name) (field_name)] @name')
      .captures(tree.rootNode);

    for (const capture of captures) {
      symbols.push(
        new ProtoSymbol(
          capture.node.text,
          kindMapping[capture.node.type],
          '',
          packageName,
          capture.node.type === 'message_name' ? getFullScope(capture.node.parent!) : '',
          uri,
          {
            startIndex: capture.node.startIndex,
            endIndex: capture.node.endIndex,
            startPosition: capture.node.startPosition,
            endPosition: capture.node.endPosition,
          },
          capture.node
        )
      );
    }

    return symbols;
  }

  /**
   * 查询源码文件中所有可见符号
   * @param uri 源码文件uri
   * @param imported 是否包括导入的符号
   * @returns 所有源码中的可见符号
   */
  discoverProtoSymbols(uri: string, imported: boolean): ProtoSymbol[] {
    const tree = this.trees.getDoc(uri);
    if (!tree) {
      return [];
    }

    if (imported) {
      return [...this.findLocalSymbols(uri, tree), ...this.findImportSymbols(uri, tree)];
    } else {
      return this.findLocalSymbols(uri, tree);
    }
  }
}
