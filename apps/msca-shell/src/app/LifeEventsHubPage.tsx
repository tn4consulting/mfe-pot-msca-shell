// See App.tsx's own comment on this same import -- required for the
// classic JSX transform this app's tsconfig uses.
import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from '@tn4consulting/shared-i18n';
import type { PageContent } from '@tn4consulting/shared-content-client';
import { assetBaseUrl } from './asset-base-url';
import { createContentClient, hubTileContentKey } from './content-client';
import { runtimeConfig } from '../runtime-config';

/**
 * Which life events get a tile here -- a plain shell-owned list, distinct
 * from `life-events-mfe`'s own internal `definitions/index.ts` registry.
 * The shell never imports that remote's code just to enumerate life
 * events (it's a routed remote, not a statically-composed one); this list
 * plus each id's CMS hub-tile content is all the shell needs to know.
 * Adding a life event here should be the only shell-side change required
 * -- see mfe-pot-life-events-mfe's own CLAUDE.md for the matching
 * remote-side authoring surface.
 */
const LIFE_EVENT_IDS = ['job-loss', 'birth', 'disability'];

const CARD_GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))',
  gap: 'var(--scds-space-4, 1rem)',
};

/**
 * The shell-owned life-events hub: presents ESDC's life-event journeys
 * (each a routed page inside `life-events-mfe`) alongside the family's
 * conventional benefit-administration destinations (dashboard/job bank/EI)
 * -- both sets of entry points on one page, per the demo narrative's
 * "organize around a life event, not separate benefit programs" thesis,
 * without displacing the existing sidebar nav or the `/dashboard`
 * post-login landing page.
 */
export function LifeEventsHubPage() {
  const locale = useLocale();
  const { t } = useTranslations(assetBaseUrl, locale);
  const contentClient = useMemo(() => createContentClient(runtimeConfig.strapiBaseUrl, assetBaseUrl), []);
  const [tiles, setTiles] = useState<Record<string, PageContent>>({});

  useEffect(() => {
    let cancelled = false;
    contentClient.getPageContents(LIFE_EVENT_IDS.map(hubTileContentKey), locale === 'fr' ? 'fr' : 'en').then((content) => {
      if (!cancelled) {
        setTiles(content);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [contentClient, locale]);

  return (
    <>
      <scds-heading tag="h1">{t('lifeEventsHub.heading')}</scds-heading>

      <section>
        <scds-heading tag="h2">{t('lifeEventsHub.lifeEventsHeading')}</scds-heading>
        <div style={CARD_GRID_STYLE}>
          {LIFE_EVENT_IDS.map((lifeEventId) => {
            const tile = tiles[hubTileContentKey(lifeEventId)];
            return (
              <scds-card
                key={lifeEventId}
                card-title={tile?.title ?? lifeEventId}
                card-title-tag="h3"
                description={tile?.body}
                href={`/life-events/${lifeEventId}`}
              />
            );
          })}
        </div>
      </section>

      <section>
        <scds-heading tag="h2">{t('lifeEventsHub.benefitsHeading')}</scds-heading>
        <div style={CARD_GRID_STYLE}>
          <scds-card
            card-title={t('lifeEventsHub.dashboard.title')}
            card-title-tag="h3"
            description={t('lifeEventsHub.dashboard.description')}
            href="/dashboard"
          />
          <scds-card
            card-title={t('lifeEventsHub.jobBank.title')}
            card-title-tag="h3"
            description={t('lifeEventsHub.jobBank.description')}
            href="/job-bank"
          />
          <scds-card
            card-title={t('lifeEventsHub.employmentInsurance.title')}
            card-title-tag="h3"
            description={t('lifeEventsHub.employmentInsurance.description')}
            href="/employment-insurance"
          />
        </div>
      </section>
    </>
  );
}
