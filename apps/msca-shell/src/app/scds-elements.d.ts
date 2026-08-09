import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * Minimal JSX typing for the SCDS custom elements this app renders
 * directly. Confirmed by inspecting `@tn4consulting/shared-ui-scds-core`'s
 * own compiled Stencil metadata: every prop used below is a plain string/
 * boolean prop with a real kebab-case `attribute` mapping, so a plain HTML
 * attribute in JSX is enough. Replaces gcds-elements.d.ts -- GCDS has been
 * removed from the family entirely.
 */
type ScdsElementProps = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'scds-header': ScdsElementProps & { 'app-title'?: string; 'skip-to-href'?: string };
      'scds-user-menu': ScdsElementProps & { name?: string };
      'scds-sidebar': ScdsElementProps & { open?: boolean; label?: string };
      'scds-nav-group': ScdsElementProps & { label?: string; 'icon-name'?: string; expanded?: boolean; disabled?: boolean };
      'scds-nav-link': ScdsElementProps & { href?: string; 'icon-name'?: string; current?: boolean; disabled?: boolean };
      'scds-nav-divider': ScdsElementProps;
      'scds-footer': ScdsElementProps;
      'scds-icon': ScdsElementProps & { name?: string; size?: string; label?: string };
      /**
       * Added for the life-events hub page (LifeEventsHubPage.tsx) -- the
       * shell's first time rendering a card itself, previously only ever
       * rendered inside a remote (see mfe-pot-platform's CLAUDE.md, SCDS
       * section, for why every prop below is a plain string and safe to
       * set as a JSX attribute).
       */
      'scds-card': ScdsElementProps & {
        'card-title'?: string;
        'card-title-tag'?: 'h3' | 'h4' | 'h5' | 'h6';
        description?: string;
        href?: string;
        rel?: string;
        target?: string;
        'img-src'?: string;
        'img-alt'?: string;
        tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
        'tone-label'?: string;
      };
      'scds-heading': ScdsElementProps & { tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' };
      /** Added for LoginPage.tsx's intro copy -- see mfe-pot-dashboard-mfe's own scds-elements.d.ts for the same typing. */
      'scds-text': ScdsElementProps & { tag?: 'p' | 'span'; size?: 'small' | 'base' };
      /** Added for LoginPage.tsx's sign-in CTA -- the shell's first use of scds-button anywhere in the family. */
      'scds-button': ScdsElementProps & {
        variant?: 'primary' | 'secondary';
        size?: 'small' | 'regular';
        type?: 'button' | 'submit' | 'reset';
        disabled?: boolean;
      };
    }
  }
}

export {};
