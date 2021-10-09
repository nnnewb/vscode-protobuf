import { Range } from 'web-tree-sitter';

export enum SymbolKind {
  message,
  enum,
  rpc,
  service,
  field,
}

export class ProtoSymbol {
  /**
   * 有语义的符号
   *
   * @param name 名称
   * @param kind 符号类型
   * @param type 数据类型
   * @param scope 上下文空间，仅对嵌套message有效
   * @param source 源文件绝对路径
   */
  constructor(
    public name: string,
    public kind: SymbolKind,
    public type: string,
    public pkg: string,
    public scope: string,
    public source: string,
    public range: Range
  ) {}

  /**
   * 符号的全称 {scope}.{name}
   */
  get fullIdent(): string {
    if (this.scope) {
      return `${this.scope}.${this.name}`;
    } else {
      return this.name;
    }
  }
}
