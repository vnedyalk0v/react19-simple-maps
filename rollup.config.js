import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { dts } from 'rollup-plugin-dts';

import pkg from './package.json' with { type: 'json' };

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  'react/jsx-runtime',
];

const isProduction = process.env.NODE_ENV === 'production';

// Shared terser config for production ESM builds
const esmTerserConfig = {
  compress: {
    drop_console: true,
    drop_debugger: true,
    pure_funcs: [
      'console.log',
      'console.warn',
      'console.info',
      'console.debug',
      'console.trace',
      'console.group',
      'console.groupEnd',
      'console.groupCollapsed',
      'console.time',
      'console.timeEnd',
      'console.timeLog',
      'console.count',
      'console.countReset',
      'console.clear',
      'console.table',
      'console.dir',
      'console.dirxml',
      'console.assert',
    ],
    dead_code: true,
    unused: true,
    side_effects: false,
    passes: 2,
    keep_fargs: false,
    reduce_vars: true,
    reduce_funcs: true,
    collapse_vars: true,
    join_vars: true,
    sequences: true,
    properties: true,
    conditionals: true,
    comparisons: true,
    evaluate: true,
    booleans: true,
    loops: true,
    hoist_funs: true,
    hoist_vars: false,
    if_return: true,
    inline: true,
    unsafe: false,
  },
  mangle: {
    toplevel: true,
    module: true,
    properties: {
      regex: /^_/,
    },
  },
  format: {
    comments: false,
    beautify: false,
    ascii_only: false,
    semicolons: true,
  },
};

export default [
  // ESM build (main entry)
  {
    input: 'src/index.ts',
    external,
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      resolve({
        preferBuiltins: false,
        exportConditions: ['import', 'module', 'default'],
        mainFields: ['module', 'main'],
      }),
      commonjs({
        ignoreDynamicRequires: true,
      }),
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          declaration: false,
          declarationMap: false,
          sourceMap: true,
          noEmit: false,
        },
      }),
      ...(isProduction ? [terser(esmTerserConfig)] : []),
    ],
  },
  // ESM build for utils subpath export
  {
    input: 'src/utils/index.ts',
    external,
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
    output: {
      file: 'dist/utils.js',
      format: 'es',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    plugins: [
      resolve({
        preferBuiltins: false,
        exportConditions: ['import', 'module', 'default'],
        mainFields: ['module', 'main'],
      }),
      commonjs({
        ignoreDynamicRequires: true,
      }),
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          declaration: false,
          declarationMap: false,
          sourceMap: true,
          noEmit: false,
        },
      }),
      ...(isProduction ? [terser(esmTerserConfig)] : []),
    ],
  },
  // Type definitions bundle (main entry)
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
  // Type definitions bundle (utils subpath)
  {
    input: 'dist/types/utils/index.d.ts',
    output: {
      file: 'dist/utils.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
];
