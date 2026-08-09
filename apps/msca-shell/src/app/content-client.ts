import {
  ContentClient,
  FallbackContentClient,
  StaticContentClient,
  StrapiContentClient,
} from '@tn4consulting/shared-content-client';

/**
 * One CMS key per life event's hub tile on LifeEventsHubPage -- title/body
 * shown on the entry-point card, kept out of `life-events-mfe`'s own
 * content (that remote never renders these; the shell needs them without
 * statically importing the remote's code just to show a title). Adding a
 * life event here is a content-only change: new key + fallback JSON entry,
 * no shell code change (see mfe-pot-life-events-mfe's own CLAUDE.md for
 * the matching remote-side authoring surface).
 */
export function hubTileContentKey(lifeEventId: string): string {
  return `life-events.${lifeEventId}.hub-tile`;
}

/**
 * No CMS configured -> the bilingual fallback (`public/assets/content-fallback/<locale>.json`)
 * directly. CMS configured -> Strapi as primary, same fallback backing it
 * up if Strapi is unreachable/missing a key at runtime -- same pattern
 * every other app in the family uses (see e.g. job-bank-mfe's own
 * content-client.ts).
 */
export function createContentClient(strapiBaseUrl: string | undefined, assetBaseUrl: string): ContentClient {
  const fallback = new StaticContentClient(assetBaseUrl);
  return strapiBaseUrl ? new FallbackContentClient(new StrapiContentClient(strapiBaseUrl), fallback) : fallback;
}
