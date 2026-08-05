import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * Minimal JSX typing for the GCDS custom elements this app renders
 * directly (no Angular wrapper anymore -- see the Phase 0 spike in
 * mfe-pot-platform's CLAUDE.md/migration plan). Confirmed by inspecting
 * `@gcds-core/components`'s own compiled Stencil metadata directly: every
 * prop used below has a real kebab-case `attribute` mapping the
 * component's own `attributeChangedCallback` watches, so a plain HTML
 * attribute in JSX (not an imperative DOM-property assignment) is enough
 * -- unlike `shared-ui-scds-core`'s array-typed `columns`/`items` props,
 * which genuinely need imperative assignment (see job-bank's
 * FeatureSearch.tsx).
 */
type GcdsElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gcds-header': GcdsElementProps & { 'skip-to-href'?: string };
      'gcds-signature': GcdsElementProps & { type?: string };
      'gcds-top-nav': GcdsElementProps & { label?: string };
      'gcds-nav-link': GcdsElementProps & { href?: string };
      'gcds-container': GcdsElementProps & { size?: string };
      'gcds-footer': GcdsElementProps & { display?: string; 'contextual-heading'?: string };
    }
  }
}

export {};
