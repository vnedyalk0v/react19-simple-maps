// @vitest-environment node
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readBundleFiles } from '../scripts/bundle-files.js';

describe('published entrypoint size accounting', () => {
  it('includes shared static and dynamic chunks once even through a cycle', () => {
    const directory = mkdtempSync(join(tmpdir(), 'map-bundles-'));
    try {
      const main =
        'import { helper } from "./shared.js";export const lazy=()=>import("./lazy.js");';
      const shared = 'export { lazy } from "./lazy.js";export const helper=1;';
      const lazy = 'export { helper } from "./shared.js";';
      writeFileSync(join(directory, 'index.js'), main);
      writeFileSync(
        join(directory, 'utils.js'),
        'export { helper } from "./shared.js";',
      );
      writeFileSync(join(directory, 'shared.js'), shared);
      writeFileSync(join(directory, 'lazy.js'), lazy);
      expect(
        readBundleFiles(join(directory, 'index.js')).map((content) =>
          content.toString(),
        ),
      ).toEqual([main, shared, lazy]);
      const uniqueFiles = new Map();
      readBundleFiles(join(directory, 'index.js'), uniqueFiles);
      readBundleFiles(join(directory, 'utils.js'), uniqueFiles);
      expect(uniqueFiles.size).toBe(4);
      expect(
        [...uniqueFiles.values()].reduce(
          (total, content) => total + content.length,
          0,
        ),
      ).toBe(
        main.length +
          shared.length +
          lazy.length +
          'export { helper } from "./shared.js";'.length,
      );
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
