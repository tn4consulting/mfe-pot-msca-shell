import { Route } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import {
  EI_REPORTING_STATUS_WIDGET_LOADER,
  JOB_APPLICATIONS_WIDGET_LOADER,
  PAYMENT_HISTORY_WIDGET_LOADER,
  RemoteRouteHost,
} from '@tn4consulting/shared-federation-runtime';
import { requireSessionGuard } from '@tn4consulting/shared-auth';
import { LoginPage } from './login-page/login-page';
import { AuthCallbackPage } from './auth-callback-page/auth-callback-page';

export const appRoutes: Route[] = [
  { path: '', component: LoginPage },
  // No requireSessionGuard -- there is no session yet until this route
  // completes the code exchange with mock-idp.
  { path: 'auth/callback', component: AuthCallbackPage },
  {
    path: 'dashboard',
    component: RemoteRouteHost,
    data: { remoteName: 'dashboard' },
    canActivate: [requireSessionGuard],
    providers: [
      {
        // job-bank's job-applications widget is a React component -- see
        // JobApplicationsList's own doc for why it's zero-prop and
        // therefore has no providers of its own to load alongside it.
        provide: JOB_APPLICATIONS_WIDGET_LOADER,
        useValue: () =>
          loadRemoteModule('job-bank', './JobApplicationsWidget').then((widgetModule) => ({
            kind: 'react' as const,
            component: widgetModule['JobApplicationsList'],
          })),
      },
      {
        // Same component+providers pairing as the payment-history widget
        // below -- employment-insurance's widget injects
        // EMPLOYMENT_INSURANCE_API_CLIENT, so it needs its own
        // environment injector built from its own './RemoteProviders'.
        provide: EI_REPORTING_STATUS_WIDGET_LOADER,
        useValue: () =>
          Promise.all([
            loadRemoteModule('employment-insurance', './EiReportingStatusWidget'),
            loadRemoteModule('employment-insurance', './RemoteProviders'),
          ]).then(async ([widgetModule, providersModule]) => ({
            kind: 'angular' as const,
            component: widgetModule.EmploymentInsuranceFeatureReportingStatus,
            providers: (await providersModule.REMOTE_PROVIDERS) ?? [],
          })),
      },
    ],
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
          ]).then(async ([widgetModule, providersModule]) => ({
            component: widgetModule.DashboardFeaturePaymentHistory,
            // dashboard's REMOTE_PROVIDERS is a Promise (it fetches its own
            // env.js for its BFF/Strapi base URLs) -- see shared-runtime-config's
            // fetchRuntimeConfig and RemoteRouteHost's identical await.
            providers: (await providersModule.REMOTE_PROVIDERS) ?? [],
          })),
      },
    ],
  },
  {
    path: 'job-bank',
    component: RemoteRouteHost,
    data: { remoteName: 'job-bank', remoteKind: 'react' },
    canActivate: [requireSessionGuard],
  },
  {
    path: 'employment-insurance',
    component: RemoteRouteHost,
    data: { remoteName: 'employment-insurance' },
    canActivate: [requireSessionGuard],
  },
];
