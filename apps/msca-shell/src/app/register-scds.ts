// Registers SCDS custom elements once, as a side effect. Shell is never
// itself federated (no `exposes` in federation.config.mjs), so this only
// ever needs importing from AppFrame.tsx's own module. Stencil's own
// loader guards against double-registering (customElements.get(tag) ||
// customElements.define(...)), so this is harmless even if it somehow
// runs twice. Replaces register-gcds.ts -- GCDS has been removed from the
// family entirely; shell now depends directly on
// @tn4consulting/shared-ui-scds-core for the first time (previously only
// dashboard/job-bank/employment-insurance did, for scds-card/
// scds-multi-column-list -- shell renders none of those, but does render
// the new scds-header/scds-sidebar/scds-footer/etc. app-frame components).
import { defineCustomElements } from '@tn4consulting/shared-ui-scds-core/loader';

defineCustomElements();
