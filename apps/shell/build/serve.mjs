// Dev server for the React shell host -- port 4200, matching the Angular
// dev-server it replaces exactly, so nothing downstream (Playwright
// webServer config, developer muscle memory, every sibling app's dev-default
// remotes map) needs to change. See build.mjs for why the federation build
// (shared react/react-dom chunks + import map) and the standalone main.js
// bundle (react/react-dom marked external, not bundled) are two genuinely
// separate esbuild invocations, not one. esbuild watch-rebuilds both on
// file change; a small built-in static server (no extra dependency) serves
// the output with SPA fallback, mirroring what `@nx/web:file-server` does
// for serve-static.
import { runEsBuildBuilder } from '@softarc/native-federation-esbuild';
import * as esbuild from 'esbuild';
import { createServer } from 'node:http';
import { readFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { extname, join } from 'node:path';

const require = createRequire(import.meta.url);
const outputPath = 'dist/apps/shell/browser';
const port = Number(process.env.SHELL_DEV_PORT ?? 4200);

await rm(outputPath, { recursive: true, force: true });
await mkdir(outputPath, { recursive: true });
await cp('apps/shell/public', outputPath, { recursive: true });
await cp('apps/shell/src/index.html', join(outputPath, 'index.html'));
await cp(require.resolve('es-module-shims'), join(outputPath, 'es-module-shims.js'));

// See build.mjs's equivalent comment: this keeps `needsCommonJsPlugin: true`
// (fixes the shared react chunk missing named exports) without
// `reactFrameworkPlugin()`'s stale React-19 `fileReplacements` paths.
await runEsBuildBuilder('apps/shell/federation.config.mjs', {
  workspaceRoot: process.cwd(),
  outputPath,
  tsConfig: 'apps/shell/tsconfig.app.json',
  packageJson: 'package.json',
  dev: true,
  watch: true,
  adapterConfig: {
    plugins: [],
    frameworks: [{ needsCommonJsPlugin: true }],
  },
});

// `outdir` + `splitting: true`, NOT `outfile` -- see build.mjs's comment
// on the same option for why: `outfile` flattens bootstrap.tsx's dynamic
// import into a single file, hoisting its `react-dom/client` import to
// load before initFederation ever runs.
// See build.mjs's comment on the same options: classic transform sidesteps
// react/jsx-runtime's unresolvable-as-external problem. `@tn4consulting/shared-federation-runtime`
// must be external too -- see build.mjs's comment for the full story
// (otherwise this bundle silently inlines a second, disconnected copy of
// the widget-loader Context objects, and every cross-remote widget
// consumer's `useContext` call reads that copy's `undefined` default).
const mainCtx = await esbuild.context({
  entryPoints: ['apps/shell/src/main.tsx'],
  outdir: outputPath,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  jsx: 'transform',
  jsxFactory: 'React.createElement',
  jsxFragment: 'React.Fragment',
  target: 'es2022',
  sourcemap: true,
  external: ['react', 'react-dom', 'react-dom/client', '@tn4consulting/shared-federation-runtime'],
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
  },
});
await mainCtx.watch();

const CONTENT_TYPES = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${port}`);
  let filePath = join(outputPath, decodeURIComponent(url.pathname));
  if (!existsSync(filePath) || url.pathname.endsWith('/')) {
    filePath = join(outputPath, 'index.html');
  }
  try {
    const body = await readFile(filePath);
    res.setHeader('Content-Type', CONTENT_TYPES[extname(filePath)] ?? 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}).listen(port, () => {
  console.log(`shell dev server listening on http://localhost:${port}`);
});
