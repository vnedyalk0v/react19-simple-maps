// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MapWithMetadata } from '../src/index';

const metadata = {
  title: 'Regional map',
  description: 'Selected geographic features',
  keywords: ['regions', 'map'],
  author: 'Map author',
  canonicalUrl: 'https://example.com/map',
};

function jsonLd(html: string): unknown {
  const data = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];
  return data ? JSON.parse(data) : null;
}

function expectPageMetadata(html: string) {
  expect(html).not.toMatch(/name="(?:geo\.[^"]+|ICBM)"/);
  expect(html).toContain('<title>Regional map</title>');
  expect(html).toContain(
    '<meta name="description" content="Selected geographic features"/>',
  );
  expect(html).toContain('<meta name="keywords" content="regions, map"/>');
  expect(html).toContain('<meta name="author" content="Map author"/>');
  expect(html).toContain(
    '<link rel="canonical" href="https://example.com/map"/>',
  );
  expect(html).toContain('property="og:title" content="Regional map"');
  expect(html).toContain('name="twitter:title" content="Regional map"');
}

describe('MapWithMetadata geographic metadata', () => {
  it('preserves country metadata without assigning a fixed world location', () => {
    const html = renderToString(
      <MapWithMetadata
        metadata={metadata}
        preset="countryMap"
        presetArgs={['France']}
      />,
    );
    expectPageMetadata(html);
    expect(jsonLd(html)).toMatchObject({
      '@type': 'Map',
      name: 'France Map',
      about: { '@type': 'Country', name: 'France' },
    });
  });

  it('preserves city metadata without assigning a fixed world location', () => {
    const html = renderToString(
      <MapWithMetadata
        metadata={metadata}
        preset="cityMap"
        presetArgs={['Paris', 'France']}
      />,
    );
    expectPageMetadata(html);
    expect(jsonLd(html)).toMatchObject({
      '@type': 'Map',
      name: 'Paris City Map',
      about: {
        '@type': 'City',
        name: 'Paris',
        containedInPlace: { '@type': 'Country', name: 'France' },
      },
    });
  });

  it('preserves custom page metadata and the default structured data', () => {
    const html = renderToString(<MapWithMetadata metadata={metadata} />);
    expectPageMetadata(html);
    expect(jsonLd(html)).toMatchObject({
      '@type': 'Map',
      name: 'Interactive World Map',
    });
  });
});
