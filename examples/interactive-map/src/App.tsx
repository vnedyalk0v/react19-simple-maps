import React, { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  createCoordinates,
  createScaleExtent,
  createTranslateExtent,
} from '@vnedyalk0v/react19-simple-maps';
import type { Position } from '@vnedyalk0v/react19-simple-maps';

/**
 * Interactive Map Showcase
 *
 * Shows key features of @vnedyalk0v/react19-simple-maps:
 * ✨ Easy zoom/pan ✨ Click interactions ✨ Multiple projections
 * ✨ Custom markers ✨ Hover effects ✨ Quick navigation
 */
const App: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [projection, setProjection] = useState<
    'geoEqualEarth' | 'geoMercator' | 'geoNaturalEarth1'
  >('geoEqualEarth');
  const [showCities, setShowCities] = useState(true);
  const [position, setPosition] = useState<Position>({
    coordinates: createCoordinates(0, 0),
    zoom: 1,
  });

  // Cities with more data to showcase markers
  const cities = [
    {
      name: 'New York',
      coordinates: createCoordinates(-74.006, 40.7128),
      population: '8.3M',
    },
    {
      name: 'London',
      coordinates: createCoordinates(-0.1276, 51.5074),
      population: '9.0M',
    },
    {
      name: 'Tokyo',
      coordinates: createCoordinates(139.6917, 35.6895),
      population: '37.4M',
    },
    {
      name: 'Paris',
      coordinates: createCoordinates(2.3522, 48.8566),
      population: '2.1M',
    },
    {
      name: 'Sydney',
      coordinates: createCoordinates(151.2093, -33.8688),
      population: '5.3M',
    },
    {
      name: 'São Paulo',
      coordinates: createCoordinates(-46.6333, -23.5505),
      population: '12.3M',
    },
  ];

  // Quick navigation presets
  const quickNav = [
    { name: 'World', center: createCoordinates(0, 0), zoom: 1 },
    { name: 'Europe', center: createCoordinates(10, 50), zoom: 3 },
    { name: 'Asia', center: createCoordinates(100, 30), zoom: 2.5 },
    { name: 'Americas', center: createCoordinates(-80, 20), zoom: 2 },
  ];

  const handleCountryClick = (name: string) => {
    setSelectedCountry(name);
  };

  const handleCountryEnter = (name: string) => {
    setHoveredCountry(name);
  };

  const handleCountryLeave = () => {
    setHoveredCountry(null);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>🗺️ Interactive Map Showcase</h1>
      <p>Built with @vnedyalk0v/react19-simple-maps - See our key features!</p>

      {/* Quick Controls */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div>
          <label>Projection: </label>
          <select
            value={projection}
            onChange={(e) =>
              setProjection(
                e.target.value as
                  | 'geoEqualEarth'
                  | 'geoMercator'
                  | 'geoNaturalEarth1',
              )
            }
            style={{ padding: '0.5rem', borderRadius: '4px' }}
          >
            <option value="geoEqualEarth">Equal Earth</option>
            <option value="geoMercator">Mercator</option>
            <option value="geoNaturalEarth1">Natural Earth</option>
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={showCities}
            onChange={(e) => setShowCities(e.target.checked)}
          />
          Show Cities
        </label>

        {quickNav.map((nav) => (
          <button
            key={nav.name}
            onClick={() =>
              setPosition({ coordinates: nav.center, zoom: nav.zoom })
            }
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #2196f3',
              background: '#e3f2fd',
              cursor: 'pointer',
              color: '#1976d2',
            }}
          >
            {nav.name}
          </button>
        ))}
      </div>

      {/* Selection Info */}
      <div style={{ marginBottom: '1rem', minHeight: '5.5rem' }}>
        {hoveredCountry && !selectedCountry && (
          <div
            style={{
              background: '#fff3e0',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              fontSize: '0.9rem',
              marginBottom: '0.5rem',
            }}
          >
            Hovering: {hoveredCountry}
          </div>
        )}

        {selectedCountry && (
          <div
            style={{
              background: '#e3f2fd',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: selectedCity ? '0.5rem' : 0,
            }}
          >
            <h3>Selected Country: {selectedCountry}</h3>
          </div>
        )}

        {selectedCity && (
          <div
            style={{
              background: '#e8f5e8',
              padding: '1rem',
              borderRadius: '8px',
            }}
          >
            <h3>Selected City: {selectedCity}</h3>
            <p>
              Population:{' '}
              {cities.find((c) => c.name === selectedCity)?.population}
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          padding: '1rem',
          marginBottom: '2rem',
        }}
      >
        <ComposableMap projection={projection} width={800} height={500}>
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={setPosition}
            enableZoom={true}
            minZoom={0.5}
            maxZoom={8}
            scaleExtent={createScaleExtent(0.5, 8)}
            enablePan={true}
            translateExtent={createTranslateExtent(
              createCoordinates(-2000, -1000),
              createCoordinates(2000, 1000),
            )}
          >
            <Geographies geography="https://unpkg.com/world-atlas@2.0.2/countries-50m.json">
              {({ geographies, borders }) => {
                const overlayCountryNames = new Set(
                  [selectedCountry, hoveredCountry].filter(
                    (name): name is string => Boolean(name),
                  ),
                );

                const baseGeographies = geographies.filter((geo) => {
                  const countryName = geo.properties?.name || 'Unknown';
                  return !overlayCountryNames.has(countryName);
                });

                const hoveredOverlayCountry =
                  hoveredCountry && hoveredCountry !== selectedCountry
                    ? hoveredCountry
                    : null;

                const hoveredGeography = hoveredOverlayCountry
                  ? geographies.find(
                      (geo) =>
                        (geo.properties?.name || 'Unknown') ===
                        hoveredOverlayCountry,
                    )
                  : null;

                const selectedOverlayCountry = selectedCountry;

                const selectedGeography = selectedOverlayCountry
                  ? geographies.find(
                      (geo) =>
                        (geo.properties?.name || 'Unknown') ===
                        selectedOverlayCountry,
                    )
                  : null;

                return (
                  <>
                    {baseGeographies.map((geo) => {
                      const name = geo.properties?.name || 'Unknown';

                      return (
                        <Geography
                          key={`${geo.id ?? 'unknown'}-${name}`}
                          geography={geo}
                          onClick={() => handleCountryClick(name)}
                          onMouseEnter={() => handleCountryEnter(name)}
                          onMouseLeave={handleCountryLeave}
                          style={{
                            default: {
                              fill: '#e0e0e0',
                              outline: 'none',
                            },
                            hover: {
                              fill: '#42a5f5',
                              outline: 'none',
                              cursor: 'pointer',
                            },
                            pressed: {
                              fill: '#1976d2',
                              outline: 'none',
                            },
                          }}
                        />
                      );
                    })}
                    {borders ? (
                      <path
                        d={borders}
                        fill="none"
                        stroke="#FFFFFF"
                        strokeWidth={0.5}
                        pointerEvents="none"
                      />
                    ) : null}
                    {hoveredGeography && hoveredOverlayCountry ? (
                      <Geography
                        key={`hovered-${hoveredOverlayCountry}`}
                        geography={hoveredGeography}
                        onClick={() =>
                          handleCountryClick(hoveredOverlayCountry)
                        }
                        onMouseEnter={() =>
                          handleCountryEnter(hoveredOverlayCountry)
                        }
                        onMouseLeave={handleCountryLeave}
                        style={{
                          default: {
                            fill: '#42a5f5',
                            outline: 'none',
                            stroke: '#1e88e5',
                            strokeWidth: 1,
                          },
                          hover: {
                            fill: '#42a5f5',
                            outline: 'none',
                            stroke: '#1e88e5',
                            strokeWidth: 1,
                            cursor: 'pointer',
                          },
                          pressed: {
                            fill: '#1976d2',
                            outline: 'none',
                            stroke: '#1565c0',
                            strokeWidth: 1,
                          },
                        }}
                      />
                    ) : null}
                    {selectedGeography && selectedOverlayCountry ? (
                      <Geography
                        key={`selected-${selectedOverlayCountry}`}
                        geography={selectedGeography}
                        onClick={() =>
                          handleCountryClick(selectedOverlayCountry)
                        }
                        onMouseEnter={() =>
                          handleCountryEnter(selectedOverlayCountry)
                        }
                        onMouseLeave={handleCountryLeave}
                        style={{
                          default: {
                            fill: '#1976d2',
                            outline: 'none',
                            stroke: '#0d47a1',
                            strokeWidth: 1.2,
                          },
                          hover: {
                            fill: '#1976d2',
                            outline: 'none',
                            stroke: '#0d47a1',
                            strokeWidth: 1.2,
                            cursor: 'pointer',
                          },
                          pressed: {
                            fill: '#1565c0',
                            outline: 'none',
                            stroke: '#0d47a1',
                            strokeWidth: 1.2,
                          },
                        }}
                      />
                    ) : null}
                  </>
                );
              }}
            </Geographies>

            {showCities &&
              cities.map((city) => (
                <Marker key={city.name} coordinates={city.coordinates}>
                  <circle
                    r={selectedCity === city.name ? 8 : 5}
                    fill={selectedCity === city.name ? '#1976d2' : '#f44336'}
                    stroke="#fff"
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedCity(
                        selectedCity === city.name ? null : city.name,
                      );
                    }}
                  />
                  <text
                    textAnchor="middle"
                    y={-10}
                    style={{
                      fontFamily: 'system-ui',
                      fontSize: '12px',
                      fill: '#333',
                      pointerEvents: 'none',
                    }}
                  >
                    {city.name}
                  </text>
                </Marker>
              ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      <div
        style={{
          background: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          padding: '1rem',
          borderRadius: '8px',
        }}
      >
        <h3>🎮 Interactive Features</h3>
        <ul>
          <li>
            <strong>Scroll</strong> to zoom in/out
          </li>
          <li>
            <strong>Click and drag</strong> to pan around
          </li>
          <li>
            <strong>Hover countries</strong> to see hover effects
          </li>
          <li>
            <strong>Click countries</strong> to select them
          </li>
          <li>
            <strong>Click cities</strong> to highlight them
          </li>
          <li>
            <strong>Change projections</strong> to see different map views
          </li>
          <li>
            <strong>Toggle cities</strong> to show/hide markers
          </li>
          <li>
            <strong>Quick navigation</strong> to jump to regions
          </li>
        </ul>

        <h4>✨ Key Package Features Showcased:</h4>
        <ul>
          <li>
            🗺️ <strong>Multiple Projections</strong> - Equal Earth, Mercator,
            Natural Earth
          </li>
          <li>
            🎯 <strong>Interactive Markers</strong> - Custom city markers with
            data
          </li>
          <li>
            🖱️ <strong>Hover Effects</strong> - Real-time country highlighting
          </li>
          <li>
            🔍 <strong>Zoom & Pan</strong> - Smooth navigation with default
            behavior
          </li>
          <li>
            📍 <strong>Click Interactions</strong> - Country and city selection
          </li>
          <li>
            ⚡ <strong>Performance</strong> - Optimized rendering with React 19
          </li>
        </ul>

        <p>
          <strong>~300 lines of code</strong> for all these features! Our
          package handles the complexity.
        </p>
      </div>
    </div>
  );
};

export default App;
