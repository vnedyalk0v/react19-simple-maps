// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MapWithMetadata from '../src/components/MapWithMetadata';

const metadata = {
  title: 'My map',
  description: 'A map',
  keywords: ['map'],
  author: 'Me',
  canonicalUrl: '',
};

function jsonLd(html: string): unknown {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  return match?.[1] ? JSON.parse(match[1]) : null;
}

describe('MapWithMetadata presets', () => {
  it('builds countryMap structured data from presetArgs', () => {
    const html = renderToString(
      <MapWithMetadata
        metadata={metadata}
        preset="countryMap"
        presetArgs={['France']}
      />,
    );
    expect(jsonLd(html)).toMatchObject({
      name: 'France Map',
      about: { '@type': 'Country', name: 'France' },
    });
    expect(html).not.toContain('Default');
  });

  it('builds cityMap structured data with the optional country', () => {
    const html = renderToString(
      <MapWithMetadata
        metadata={metadata}
        preset="cityMap"
        presetArgs={['Paris', 'France']}
      />,
    );
    expect(jsonLd(html)).toMatchObject({
      name: 'Paris City Map',
      about: {
        '@type': 'City',
        name: 'Paris',
        containedInPlace: { '@type': 'Country', name: 'France' },
      },
    });
  });

  it('builds dataVisualization structured data from presetArgs', () => {
    const html = renderToString(
      <MapWithMetadata
        metadata={metadata}
        preset="dataVisualization"
        presetArgs={['Population']}
      />,
    );
    expect(jsonLd(html)).toMatchObject({
      '@type': 'Dataset',
      name: 'Population Geographic Dataset',
    });
  });

  it('falls back to preset text built from presetArgs for empty fields', () => {
    const html = renderToString(
      <MapWithMetadata
        metadata={{ ...metadata, title: '', description: '' }}
        preset="countryMap"
        presetArgs={['France']}
      />,
    );
    expect(html).toContain(
      '<title>France Map - Interactive Geographic Data</title>',
    );
    expect(html).toContain(
      'Explore France with detailed geographic information',
    );
  });

  it.each(['countryMap', 'cityMap', 'dataVisualization'] as const)(
    'does not invent placeholder content for %s without presetArgs',
    (preset) => {
      const html = renderToString(
        <MapWithMetadata
          metadata={{ ...metadata, title: '', description: '' }}
          preset={preset}
        />,
      );
      expect(html).not.toContain('Default');
      expect(jsonLd(html)).toBeNull();
    },
  );

  it('keeps the static worldMap preset unchanged', () => {
    const html = renderToString(<MapWithMetadata metadata={metadata} />);
    expect(jsonLd(html)).toMatchObject({
      '@type': 'Map',
      name: 'Interactive World Map',
    });
    expect(html).toContain('<title>My map</title>');
  });
});
