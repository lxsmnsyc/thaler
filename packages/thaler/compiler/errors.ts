import type * as babel from '@babel/core';

export function unexpectedType<T>(
  path: babel.NodePath<T>,
  received: string,
  expected: string,
): Error {
  return path.buildCodeFrameError(
    `Unexpected '${received}' (Expected: ${expected})`,
  );
}

export function unexpectedArgumentLength<T>(
  path: babel.NodePath<T>,
  received: number,
  expected: number,
): Error {
  return path.buildCodeFrameError(
    `Unexpected argument length of ${received} (Expected: ${expected})`,
  );
}
