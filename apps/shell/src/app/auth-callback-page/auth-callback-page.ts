import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoPipe } from '@tn4consulting/shared-i18n';
import { AuthSession, storeSession } from '@tn4consulting/shared-auth';
import { runtimeConfig } from '../../runtime-config';
import { consumeAuthFlight } from '../auth-flight';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  sub: string;
  name: string;
  claims: string[];
}

/**
 * Completes the OIDC-shaped code exchange with mock-idp: validates the
 * `state` returned against the flight state stored before the redirect
 * (the CSRF check), exchanges the code + PKCE `code_verifier` for an
 * access token, and stores the resulting AuthSession -- the shell never
 * decodes the token itself, it only ever takes `/token`'s plaintext
 * `sub`/`name`/`claims` fields and treats `access_token` as an opaque
 * bearer credential to forward. See mfe-pot's plan doc for the full
 * design rationale.
 */
@Component({
  selector: 'msca-auth-callback-page',
  standalone: true,
  imports: [TranslocoPipe],
  templateUrl: './auth-callback-page.html',
  styleUrl: './auth-callback-page.css',
})
export class AuthCallbackPage implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected failed = false;

  async ngOnInit(): Promise<void> {
    const queryParams = this.route.snapshot.queryParamMap;
    const code = queryParams.get('code');
    const state = queryParams.get('state');
    const flight = consumeAuthFlight();

    if (!code || !flight || state !== flight.state) {
      this.failed = true;
      return;
    }

    try {
      const response = await fetch(`${runtimeConfig.mockIdpBaseUrl}/token`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${window.location.origin}/auth/callback`,
          code_verifier: flight.codeVerifier,
        }),
      });
      if (!response.ok) {
        this.failed = true;
        return;
      }

      const body = (await response.json()) as TokenResponse;
      const now = Date.now();
      const session: AuthSession = {
        sub: body.sub,
        name: body.name,
        claims: body.claims,
        issuedAt: now,
        expiresAt: now + body.expires_in * 1000,
        accessToken: body.access_token,
      };
      storeSession(session);
      this.router.navigateByUrl('/dashboard');
    } catch {
      this.failed = true;
    }
  }

  protected returnToSignIn(): void {
    this.router.navigateByUrl('/');
  }
}
