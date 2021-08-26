import { SyntaxNode } from 'web-tree-sitter';

export function getFullName(node: SyntaxNode) {
  if (node.type !== 'message' && node.type !== 'enum') {
    throw new Error('unexpected node type, required message node');
  }

  const stack: string[] = [];

  for (
    let cur: SyntaxNode | null = node;
    cur !== null && (cur.type === 'message' || cur.type === 'enum');
    cur = cur?.parent?.type === 'message_body' ? cur.parent.parent : null
  ) {
    stack.push(cur.firstNamedChild!.text);
  }

  return stack.reverse().join('.');
}
