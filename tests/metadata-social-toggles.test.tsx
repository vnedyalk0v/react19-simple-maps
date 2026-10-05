import { StrictMode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MapWithMetadata } from '../src/index';

const metadata = {
  title: 'My map',
  description: 'A map',
  keywords: ['map'],
  author: 'Me',
  canonicalUrl: '',
};

afterEach(cleanup);

describe('MapWithMetadata social tag updates', () => {
  it('removes and restores each social group when its flag changes', () => {
    const view = (enableOpenGraph: boolean, enableTwitterCards: boolean) => (
      <StrictMode>
        <MapWithMetadata
          metadata={metadata}
          enableOpenGraph={enableOpenGraph}
          enableTwitterCards={enableTwitterCards}
        />
      </StrictMode>
    );
    const { rerender } = render(view(true, true));
    const ogTags = () =>
      document.head.querySelectorAll('meta[property^="og:"]');
    const twitterTags = () =>
      document.head.querySelectorAll('meta[name^="twitter:"]');

    expect(ogTags()).toHaveLength(3);
    expect(twitterTags()).toHaveLength(3);

    rerender(view(false, true));
    expect(ogTags()).toHaveLength(0);
    expect(twitterTags()).toHaveLength(3);
    expect(document.title).toBe('My map');

    rerender(view(true, false));
    expect(ogTags()).toHaveLength(3);
    expect(twitterTags()).toHaveLength(0);

    rerender(view(false, false));
    expect(ogTags()).toHaveLength(0);
    expect(twitterTags()).toHaveLength(0);

    rerender(view(true, true));
    expect(ogTags()).toHaveLength(3);
    expect(twitterTags()).toHaveLength(3);
  });
});
