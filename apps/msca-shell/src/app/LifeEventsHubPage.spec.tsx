import * as React from 'react';
import { render, waitFor } from '@testing-library/react';
import { LifeEventsHubPage } from './LifeEventsHubPage';

jest.mock('./asset-base-url', () => ({ assetBaseUrl: 'http://localhost:4200/' }));

const getPageContentsMock = jest.fn();
jest.mock('./content-client', () => ({
  hubTileContentKey: (id: string) => `life-events.${id}.hub-tile`,
  createContentClient: () => ({ getPageContents: getPageContentsMock }),
}));

describe('LifeEventsHubPage', () => {
  beforeEach(() => {
    getPageContentsMock.mockReset().mockResolvedValue({
      'life-events.job-loss.hub-tile': { key: 'life-events.job-loss.hub-tile', title: 'You lost your job', body: '...' },
      'life-events.birth.hub-tile': { key: 'life-events.birth.hub-tile', title: 'You had a baby', body: '...' },
      'life-events.disability.hub-tile': { key: 'life-events.disability.hub-tile', title: 'You have a disability', body: '...' },
    });
  });

  it('renders a life-event card per registered life event, linking to its routed page', async () => {
    // card-title/description are attributes passed to scds-card, not
    // light-DOM text -- with register-scds unmocked but no real Stencil
    // hydration triggered here, they never render as visible text, so
    // this asserts on the attributes directly (same convention as
    // mfe-pot-dashboard-mfe's own ConsiderThisList.spec.tsx).
    const { container } = render(<LifeEventsHubPage />);

    await waitFor(() =>
      expect(container.querySelector('scds-card[card-title="You lost your job"]')).not.toBeNull(),
    );
    const cards = Array.from(container.querySelectorAll('scds-card')).map((el) => ({
      title: el.getAttribute('card-title'),
      href: el.getAttribute('href'),
    }));

    expect(cards).toEqual(
      expect.arrayContaining([
        { title: 'You lost your job', href: '/life-events/job-loss' },
        { title: 'You had a baby', href: '/life-events/birth' },
        { title: 'You have a disability', href: '/life-events/disability' },
      ]),
    );
  });

  it('also presents the conventional benefit-administration destinations, unchanged', () => {
    const { container } = render(<LifeEventsHubPage />);

    const hrefs = Array.from(container.querySelectorAll('scds-card')).map((el) => el.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/dashboard', '/job-bank', '/employment-insurance']));
  });

  it('falls back to the bare life-event id if its hub-tile content has not resolved yet', () => {
    getPageContentsMock.mockReturnValue(new Promise(() => undefined));
    const { container } = render(<LifeEventsHubPage />);

    const titles = Array.from(container.querySelectorAll('scds-card')).map((el) => el.getAttribute('card-title'));
    expect(titles).toEqual(expect.arrayContaining(['job-loss', 'birth', 'disability']));
  });
});
