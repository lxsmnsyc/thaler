import type * as t from '@babel/types';
import { isNestedExpression } from './checks';

type TypeFilter<K extends t.Node> = (node: t.Node) => node is K;
type TypeCheck<K> = K extends TypeFilter<infer U> ? U : never;

export default function unwrapNode<K extends (node: t.Node) => boolean>(
  node: t.Node,
  key: K,
): TypeCheck<K> | undefined {
  if (key(node)) {
    return node as TypeCheck<K>;
  }
  if (isNestedExpression(node)) {
    return unwrapNode(node.expression, key);
  }
  return undefined;
}
