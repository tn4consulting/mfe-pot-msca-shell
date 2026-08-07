// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { getStoredSession } from '@tn4consulting/shared-auth/core';

/**
 * Shell-only: the shell has real sub-routes to guard (`/dashboard`, etc.),
 * so this is a normal route guard. Remotes have no internal routing in
 * this PoT (each exposes a single component), so they check their own
 * claim directly in that component instead -- same principle, different
 * mechanism, see CLAUDE.md.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  return getStoredSession() !== null ? <>{children}</> : <Navigate to="/" replace />;
}
