import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@tn4consulting/shared-i18n';
import { getStoredSession } from '@tn4consulting/shared-auth';
import { runtimeConfig } from '../../runtime-config';
import { computePkceChallenge, generateRandomToken, storeAuthFlight } from '../auth-flight';
import { redirectTo } from '../browser-redirect';

const CLIENT_ID = 'mfe-pot-shell';

/**
 * Redirects to mock-idp's `/authorize` -- an OIDC-shaped
 * authorization-code + PKCE flow standing in for a real IBM Verify SaaS
 * redirect (see mfe-pot's plan doc for the full design rationale). The
 * actual session is only established once `/auth/callback` completes the
 * code exchange.
 */
@Component({
  selector: 'msca-login-page',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './login-page.html',
  styleUrl: './login-page.css',
})
export class LoginPage implements OnInit {
  private readonly router = inject(Router);

  ngOnInit(): void {
    if (getStoredSession() !== null) {
      this.router.navigateByUrl('/dashboard');
    }
  }

  protected async signIn(): Promise<void> {
    const state = generateRandomToken();
    const codeVerifier = generateRandomToken();
    const { codeChallenge, codeChallengeMethod } = await computePkceChallenge(codeVerifier);
    storeAuthFlight({ state, codeVerifier });

    const redirectUri = `${window.location.origin}/auth/callback`;
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
    });
    redirectTo(`${runtimeConfig.mockIdpBaseUrl}/authorize?${params.toString()}`);
  }
}
