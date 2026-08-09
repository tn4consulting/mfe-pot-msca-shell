// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { RemoteRouteHost, WidgetRegistry, WidgetRegistryContext } from '@tn4consulting/shared-federation-runtime';
import { LoginPage } from './LoginPage';
import { AuthCallbackPage } from './AuthCallbackPage';
import { LifeEventsHubPage } from './LifeEventsHubPage';
import { RequireSession } from './RequireSession';

/**
 * Every cross-remote widget this shell can hand to a consuming remote, in
 * one flat map keyed by widget id -- replaces the old one-Context-per-
 * widget-type wiring (a separate `<XyzWidgetLoaderContext.Provider>` per
 * route, per widget) with a single `<WidgetRegistryContext.Provider>`
 * wrapping the whole route tree once, below. Providing a descriptor no
 * route ends up consuming is harmless, so adding a widget for a new life
 * event (or any future consumer) never needs new Provider nesting -- just
 * one new entry here. See `@tn4consulting/shared-federation-runtime`'s
 * `useWidgetLoader`/`WidgetRegistryContext` for the consumer side.
 */
const WIDGET_REGISTRY: WidgetRegistry = {
  'payment-history': {
    remoteName: 'dashboard-mfe',
    exposedModule: './PaymentHistoryWidget',
    exportName: 'DashboardFeaturePaymentHistory',
  },
  'job-applications': {
    remoteName: 'job-bank-mfe',
    exposedModule: './JobApplicationsWidget',
    exportName: 'JobApplicationsList',
  },
  'ei-reporting-status': {
    remoteName: 'employment-insurance-mfe',
    exposedModule: './EiReportingStatusWidget',
    exportName: 'ReportingStatus',
  },
};

/**
 * A life event's remote (`life-events-mfe`) is parametric -- one remote,
 * many life events, selected by `:lifeEventId`. The remote must not read
 * this param via its own bundled `useParams()`: `react-router-dom` isn't a
 * federation-shared singleton, so the remote's own copy has a different
 * Context identity than the shell's, and `useParams()` inside the remote
 * would silently resolve to nothing. The shell reads its own route param
 * here and forwards it as a plain prop via `RemoteRouteHost`'s `props`
 * (added to `shared-federation-runtime@2.0.0` specifically for this) --
 * consistent with "every remote is fully self-configuring," just via a
 * prop instead of a Context, since a route param isn't identity-sensitive
 * the way a widget-loader Context is.
 */
function LifeEventsRoute() {
  const { lifeEventId } = useParams<{ lifeEventId: string }>();
  return <RemoteRouteHost remoteName="life-events-mfe" props={{ lifeEventId }} />;
}

export function AppRoutes() {
  return (
    <WidgetRegistryContext.Provider value={WIDGET_REGISTRY}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireSession>
              <RemoteRouteHost remoteName="dashboard-mfe" />
            </RequireSession>
          }
        />
        <Route
          path="/life-events"
          element={
            <RequireSession>
              <LifeEventsHubPage />
            </RequireSession>
          }
        />
        <Route
          path="/life-events/:lifeEventId"
          element={
            <RequireSession>
              <LifeEventsRoute />
            </RequireSession>
          }
        />
        <Route
          path="/job-bank"
          element={
            <RequireSession>
              <RemoteRouteHost remoteName="job-bank-mfe" />
            </RequireSession>
          }
        />
        <Route
          path="/employment-insurance"
          element={
            <RequireSession>
              <RemoteRouteHost remoteName="employment-insurance-mfe" />
            </RequireSession>
          }
        />
      </Routes>
    </WidgetRegistryContext.Provider>
  );
}
