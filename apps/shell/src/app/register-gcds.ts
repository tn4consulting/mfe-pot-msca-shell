// Registers the GCDS custom elements once, as a side effect. Shell is
// never itself federated (no `exposes` in federation.config.mjs), so
// unlike job-bank's register-scds.ts this only ever needs importing from
// bootstrap.tsx's own single entry point. Stencil's own loader guards
// against double-registering (customElements.get(tag) ||
// customElements.define(...)), so this is harmless even if it somehow
// runs twice.
//
// Not marked as a federation-shared singleton in federation.config.mjs
// (unlike the old Angular version's @gcds-core/components-angular, which
// had to be shared to avoid two federated bundles' wrapper CLASSES
// colliding -- NG0912). The underlying custom elements are already
// safely idempotent on their own, and nothing about a duplicate copy
// across independently-bundled apps causes a correctness problem in a
// framework with no per-bundle component-identity concept -- see
// mfe-pot-platform's CLAUDE.md GCDS section for the original NG0912
// rationale, which no longer applies once nothing uses the Angular
// wrapper.
import { defineCustomElements } from '@gcds-core/components/loader';

defineCustomElements();
