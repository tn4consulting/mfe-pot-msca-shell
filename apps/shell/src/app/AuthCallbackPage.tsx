// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthSession, storeSession } from '@tn4consulting/shared-auth/core';
import { useLocale, useTranslations } from '@tn4consulting/shared-i18n';
import { runtimeConfig } from '../runtime-config';
import { assetBaseUrl } from './asset-base-url';
import { consumeAuthFlight } from './auth-flight';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  sub: string;
  name: string;
  claims: string[];
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const locale = useLocale();
  const { t } = useTranslations(assetBaseUrl, locale);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function exchangeCode(): Promise<void> {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const flight = consumeAuthFlight();

      if (!code || !flight || state !== flight.state) {
        if (!cancelled) {
          setFailed(true);
        }
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
          if (!cancelled) {
            setFailed(true);
          }
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
        if (!cancelled) {
          navigate('/dashboard');
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    void exchangeCode();
    return () => {
      cancelled = true;
    };
    // Deliberately empty deps -- this exchange is one-shot per mount (the
    // authorization code is one-time-use, per consumeAuthFlight's own
    // doc), not something that should re-run if searchParams/navigate
    // identity happens to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="auth-callback-page">
      {!failed ? (
        <p>{t('authCallback.signingIn')}</p>
      ) : (
        <>
          <h1>{t('authCallback.errorHeading')}</h1>
          <p>{t('authCallback.errorMessage')}</p>
          <button type="button" onClick={() => navigate('/')}>
            {t('authCallback.returnToSignIn')}
          </button>
        </>
      )}
    </section>
  );
}
