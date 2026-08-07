// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredSession } from '@tn4consulting/shared-auth/core';
import { useLocale, useTranslations } from '@tn4consulting/shared-i18n';
import { runtimeConfig } from '../runtime-config';
import { assetBaseUrl } from './asset-base-url';
import { computePkceChallenge, generateRandomToken, storeAuthFlight } from './auth-flight';
import { redirectTo } from './browser-redirect';

const CLIENT_ID = 'mfe-pot-msca-shell';

export function LoginPage() {
  const navigate = useNavigate();
  const locale = useLocale();
  const { t } = useTranslations(assetBaseUrl, locale);

  useEffect(() => {
    if (getStoredSession() !== null) {
      navigate('/dashboard');
    }
  }, [navigate]);

  async function signIn(): Promise<void> {
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

  return (
    <section className="login-page">
      <h1>{t('login.heading')}</h1>
      <p>{t('login.intro')}</p>
      <button type="button" onClick={() => void signIn()}>
        {t('login.signInButton')}
      </button>
    </section>
  );
}
