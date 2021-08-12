import { SyntaxNode } from 'web-tree-sitter';

export class Message {
  constructor(public node: SyntaxNode) {
    if (node.type !== 'message') {
      throw new Error('unexpected node type, required message node');
    }
  }

  public get name(): string {
    return this.node.firstNamedChild!.text;
  }

  public get fullName(): string {
    const stack: string[] = [];
    for (
      let cur: SyntaxNode | null = this.node;
      cur !== null && cur.type === 'message';
      cur = cur?.parent?.type === 'message_body' ? cur.parent.parent : null
    ) {
      stack.push(cur.firstNamedChild!.text);
    }
    return stack.reverse().join('.');
  }
}
