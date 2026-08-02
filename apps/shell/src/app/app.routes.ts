import { Route } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { PAYMENT_HISTORY_WIDGET_LOADER, RemoteRouteHost } from '@tn4consulting/shared-federation-runtime';
import { requireSessionGuard } from '@tn4consulting/shared-auth';
import { LoginPage } from './login-page/login-page';

export const appRoutes: Route[] = [
  { path: '', component: LoginPage },
  {
    path: 'dashboard',
    component: RemoteRouteHost,
    data: { remoteName: 'dashboard' },
    canActivate: [requireSessionGuard],
  },
  {
    path: 'employment-life-events',
    component: RemoteRouteHost,
    data: { remoteName: 'employment-life-events' },
    canActivate: [requireSessionGuard],
    providers: [
      {
        // The shell always has a working federation runtime, so it's the
        // one that loads cross-remote widgets and hands them down -- see
        // the sharing-policy note in federation.config.mjs for why
        // employment-life-events can't just call loadRemoteModule itself.
        provide: PAYMENT_HISTORY_WIDGET_LOADER,
        useValue: () =>
          Promise.all([
            loadRemoteModule('dashboard', './PaymentHistoryWidget'),
            loadRemoteModule('dashboard', './RemoteProviders'),
          ]).then(([widgetModule, providersModule]) => ({
            component: widgetModule.DashboardFeaturePaymentHistory,
            providers: providersModule.REMOTE_PROVIDERS ?? [],
          })),
      },
    ],
  },
  {
    path: 'job-bank',
    component: RemoteRouteHost,
    data: { remoteName: 'job-bank' },
    canActivate: [requireSessionGuard],
  },
  {
    path: 'employment-insurance',
    component: RemoteRouteHost,
    data: { remoteName: 'employment-insurance' },
    canActivate: [requireSessionGuard],
  },
];
