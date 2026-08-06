// Production/development build for the React shell host, run via the
// `build` Nx target (nx:run-commands, cwd = repo root). Replaces the
// `@angular-architects/native-federation:build` executor -- this app no
// longer has any Angular in it, so there's no Angular CLI/esbuild adapter
// to delegate to. Mirrors the sibling mfe-pot-job-bank repo's
// apps/job-bank/build/build.mjs, adapted for a HOST rather than a remote --
// see the inline comments below for exactly where and why it differs.
import { runEsBuildBuilder } from '@softarc/native-federation-esbuild';
import * as esbuild from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);

const dev = process.argv.includes('--dev');
const outputPath = 'dist/apps/shell/browser';

// Unlike the Angular executor this replaces, nothing here incrementally
// diffs stale output against a fresh build -- a leftover file from a
// previous (possibly Angular) build would otherwise sit alongside the new
// one indefinitely, and since this directory is also nginx's serve root
// (see the Dockerfile), a stale bundle chunk being reachable is a real
// correctness risk, not just clutter.
await rm(outputPath, { recursive: true, force: true });
await mkdir(outputPath, { recursive: true });

// esbuild has no Angular-CLI-style implicit assets pipeline -- copy
// public/** (i18n JSON, favicon, env.js placeholder) and index.html by
// hand. Must happen before the federation build so remoteEntry.json/
// importmap.json (written into the same outputPath) aren't clobbered.
await cp('apps/shell/public', outputPath, { recursive: true });
await cp('apps/shell/src/index.html', join(outputPath, 'index.html'));

// es-module-shims must be loaded via a plain classic <script> tag (see
// index.html) -- it has to already be active before the `type="module-shim"`
// entry script is even recognized.
await cp(require.resolve('es-module-shims'), join(outputPath, 'es-module-shims.js'));

// federation.config.mjs declares no `exposes` -- the shell is a pure
// federation host, never itself federated into another app -- but this
// step is still required: it's what produces remoteEntry.json/
// importmap.json and the shared react/react-dom chunks every OTHER
// federated remote's shared singleton resolves against, and what makes
// main.tsx's own bare `import ... from 'react-dom/client'` (marked
// external below) resolvable at runtime through the browser's native
// import map once `initFederation()` (see main.tsx) has populated it.
// Deliberately NOT using @softarc/native-federation-esbuild's built-in
// `reactFrameworkPlugin()` wholesale (the default whenever `adapterConfig.frameworks`
// is omitted entirely, not just when explicitly requested) -- its
// hardcoded dev/prod file-replacement map (e.g.
// 'react/cjs/react.production.min.js') is stale against React 19, which
// renamed its production CJS files (dropped the `.min` suffix); confirmed
// directly against a real build ("Could not resolve
// 'node_modules/react/cjs/react.production.min.js'"). `frameworks: [{
// needsCommonJsPlugin: true }]` keeps the one flag that actually matters
// (see job-bank's apps/job-bank/build/build.mjs for the full story) --
// makes `node-modules-bundler.js` load `@chialab/esbuild-plugin-commonjs`
// for the shared react/react-dom chunks, which does real static analysis
// of each CJS module's own exports instead of esbuild's default interop
// (which only synthesizes named exports it can prove are used within the
// same build graph -- a shared chunk built as its own standalone entry
// point has none to find, degrading to a bare `export default`).
const result = await runEsBuildBuilder('apps/shell/federation.config.mjs', {
  workspaceRoot: process.cwd(),
  outputPath,
  tsConfig: 'apps/shell/tsconfig.app.json',
  packageJson: 'package.json',
  dev,
  watch: false,
  adapterConfig: {
    plugins: [],
    frameworks: [{ needsCommonJsPlugin: true }],
  },
});
await result.close();

// Unlike job-bank's "standalone" build (a genuinely separate, fully
// self-contained bundle for non-federated access outside this shell),
// shell has no non-federated mode at all -- it's always the top-level
// host page. Its own main.tsx/bootstrap.tsx bundle still can't just
// `bundle: true` react/react-dom inline the way a plain esbuild build
// normally would: they're federation-shared singletons (see
// federation.config.mjs), resolved at runtime through the same import map
// the federation build above just produced, so this bundle's own React
// instance is the identical one a federated remote's bundle resolves to.
// Bundling a second, disconnected copy inline here would throw "invalid
// hook call" the moment a remote's component -- rendered directly inside
// this same React tree via RemoteRouteHost, not a separate root -- called
// a hook. `external` is the plain esbuild mechanism for "leave this bare
// specifier unresolved in the output, let the runtime's import map handle
// it" -- exactly what native federation's own shimMode already relies on
// for every *shared* dependency inside an exposed bundle; this just
// applies the same idea to the host's own entry point by hand, since
// `runEsBuildBuilder` only externalizes shared deps for modules it
// manages as an expose target, not for an arbitrary plain esbuild call.
//
// `outdir` + `splitting: true`, NOT `outfile` -- confirmed the hard way
// (a real browser, not just a successful build) that `outfile` bundles
// bootstrap.tsx's entire reachable graph into ONE file with no code
// splitting, exactly the same "dynamic import gets flattened" trap
// job-bank's own build.mjs documents for the federation-adapter path:
// bootstrap.tsx's own `import 'react-dom/client'` (only ever meant to run
// *after* main.tsx's `import('./bootstrap')` resolves, i.e. after
// initFederation has populated the import map) got hoisted to a
// top-level static import of the single output file instead, so
// es-module-shims tried to resolve 'react' immediately on page load,
// before initFederation had even run ("Unable to resolve specifier
// 'react'"). `splitting: true` keeps `import('./bootstrap')` a real,
// separately-fetched chunk, deferred until main.tsx's own code actually
// calls it.
// `jsx: 'transform'` (classic), NOT the default 'automatic' -- confirmed
// the hard way against a real browser that automatic's synthesized
// `import ... from 'react/jsx-runtime'` fails to resolve here, same as
// shared-federation-runtime's own identical fix (see that package's
// remote-route-host.tsx for the fuller explanation): 'react/jsx-runtime'
// is never declared as a federation-shared dependency (deliberately, per
// shared-federation-config/react.js's own `includeSecondaries: false`
// policy), and since this whole bundle already treats 'react' itself as
// external, classic transform's plain `React.createElement(...)` calls
// only ever need that one already-resolvable import.
//
// `@tn4consulting/shared-federation-runtime` MUST also be external here,
// same reasoning as react/react-dom above -- confirmed the hard way (a
// real dashboard route, all sibling remotes running) that omitting it
// silently inlines a second, disconnected copy of this bundle's own
// widget-loader Context objects into bootstrap.tsx's output. routes.tsx's
// `<JobApplicationsWidgetLoaderContext.Provider>` then writes into THAT
// copy's `_currentValue`, while a remote's `useJobApplicationsWidgetLoader()`
// (imported via the correctly-shared federation chunk instead) reads off
// the OTHER copy's default (`undefined`) -- no error, no console output,
// just every cross-remote widget silently rendering its "unavailable"
// fallback. The federation build above (runEsBuildBuilder) already
// produces the correct shared chunk + import-map entry for this package;
// this external entry is what makes THIS bundle's own bare import resolve
// through that entry instead of getting bundled inline a second time.
await esbuild.build({
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
  minify: !dev,
  sourcemap: true,
  external: ['react', 'react-dom', 'react-dom/client', '@tn4consulting/shared-federation-runtime'],
  define: {
    'process.env.NODE_ENV': JSON.stringify(dev ? 'development' : 'production'),
  },
});

console.log(`shell built to ${outputPath} (${dev ? 'development' : 'production'})`);
