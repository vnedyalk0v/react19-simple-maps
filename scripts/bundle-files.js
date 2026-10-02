import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';

// Include every local static and dynamic dependency once per entrypoint.
export function readBundleFiles(entryPath, files = new Map()) {
  const path = resolve(entryPath);
  if (files.has(path)) return [...files.values()];
  const content = readFileSync(path);
  files.set(path, content);
  if (path.endsWith('.js')) {
    const imports = content
      .toString()
      .matchAll(/(?:from\s*|import\s*(?:\(\s*)?)\s*["'](\.[^"']+)["']/g);
    for (const [, specifier] of imports) {
      readBundleFiles(resolve(dirname(path), specifier), files);
    }
  }
  return [...files.values()];
}
