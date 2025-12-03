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

export default [
  // UMD build for browsers
  {
    input: 'src/index.ts',
    external,
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
    output: {
      name: 'reactSimpleMaps',
      file: pkg.browser,
      format: 'umd',
      exports: 'named', // Ensure named exports are preserved
      extend: true,
      sourcemap: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        'react/jsx-runtime': 'React',
        'd3-geo': 'd3',
        'd3-zoom': 'd3',
        'd3-selection': 'd3',
        'd3-color': 'd3',
        'd3-interpolate': 'd3',
        'topojson-client': 'topojson',
      },
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false,
        exportConditions: ['import', 'module', 'browser', 'default'],
        mainFields: ['browser', 'module', 'main'],
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        compilerOptions: {
          declaration: false,
          declarationMap: false,
          sourceMap: true,
          noEmit: false,
        },
      }),
      terser({
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction
            ? [
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
              ]
            : [],
          dead_code: true,
          unused: true,
          side_effects: false,
          passes: 1, // Reduce passes for UMD to preserve exports
          toplevel: false, // Don't mangle top-level for UMD
          // Remove module: true - not compatible with UMD
          // Additional optimizations for React 19
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
          unsafe_comps: false,
          unsafe_math: false,
          unsafe_proto: false,
          unsafe_regexp: false,
          unsafe_undefined: false,
        },
        mangle: {
          toplevel: false, // Don't mangle top-level for UMD exports
          // Remove module: true - not compatible with UMD
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
        // Remove toplevel and module flags - not compatible with UMD
      }),
    ],
  },
  // ESM and CJS builds for Node.js
  {
    input: 'src/index.ts',
    external,
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      tryCatchDeoptimization: false,
    },
    output: [
      {
        file: pkg.main,
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
        interop: 'auto',
      },
      {
        file: pkg.module,
        format: 'es',
        sourcemap: true,
      },
    ],
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
      ...(isProduction
        ? [
            terser({
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
                // Additional optimizations for React 19
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
            }),
          ]
        : []),
    ],
  },
  // Type definitions bundle
  {
    input: 'dist/types/index.d.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
];
