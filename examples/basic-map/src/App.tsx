import React, { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  createCoordinates,
} from '@vnedyalk0v/react19-simple-maps';
import type { Feature, Geometry } from 'geojson';

// World geography data pinned to an exact version to avoid redirect-related fetch issues
const geoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

// Major cities
const cities = [
  { name: 'New York', coordinates: createCoordinates(-74.006, 40.7128) },
  { name: 'London', coordinates: createCoordinates(-0.1276, 51.5074) },
  { name: 'Tokyo', coordinates: createCoordinates(139.6917, 35.6895) },
];

/**
 * Basic World Map Example
 *
 * This is a simple example showing how to use react19-simple-maps
 * to display a world map with clickable countries and city markers.
 */
const App: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const handleGeographyClick = (
    _event: React.MouseEvent<SVGPathElement>,
    data?: {
      geography: Feature<Geometry>;
      centroid: [number, number] | null;
      bounds: [[number, number], [number, number]] | null;
      coordinates: [number, number] | null;
    },
  ) => {
    // Support both old and new API
    const geography = data?.geography;
    const countryName = geography
      ? geography.properties?.NAME || geography.properties?.name || 'Unknown'
      : 'Unknown';

    setSelectedCountry(countryName);

    // Demonstrate new enhanced geographic data access when available
    if (data) {
      console.log('🗺️ Enhanced Geography Data:');
      console.log('Selected country:', countryName);
      console.log('Centroid coordinates:', data.centroid);
      console.log('Bounding box:', data.bounds);
      console.log('Best coordinates:', data.coordinates);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Basic World Map</h1>
        <p>A simple example using react19-simple-maps v2.0.3</p>
        {selectedCountry && (
          <div className="status">
            Selected: <strong>{selectedCountry}</strong>
          </div>
        )}
      </div>

      <div className="map-container">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{
            scale: 147,
            center: createCoordinates(0, 0),
          }}
          width={800}
          height={500}
        >
          <Geographies geography={geoUrl}>
            {({ geographies, borders }) => {
              if (!geographies || geographies.length === 0) {
                return (
                  <text x="400" y="250" textAnchor="middle" fill="red">
                    No geography data
                  </text>
                );
              }

              const selectedGeography = selectedCountry
                ? geographies.find((geo) => {
                    const countryName =
                      geo.properties?.NAME || geo.properties?.name;
                    return countryName === selectedCountry;
                  })
                : null;

              const regularGeographies = selectedCountry
                ? geographies.filter((geo) => {
                    const countryName =
                      geo.properties?.NAME || geo.properties?.name;
                    return countryName !== selectedCountry;
                  })
                : geographies;

              return (
                <>
                  {regularGeographies.map((geo, index) => {
                    const countryName =
                      geo.properties?.NAME || geo.properties?.name;

                    return (
                      <Geography
                        key={countryName || geo.id || index}
                        geography={geo}
                        onClick={handleGeographyClick}
                        style={{
                          default: {
                            fill: '#D6D6DA',
                            outline: 'none',
                          },
                          hover: {
                            fill: '#F53',
                            outline: 'none',
                            cursor: 'pointer',
                          },
                          pressed: {
                            fill: '#E42',
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
                  {selectedGeography ? (
                    <Geography
                      key={`selected-${selectedCountry}`}
                      geography={selectedGeography}
                      onClick={handleGeographyClick}
                      style={{
                        default: {
                          fill: '#B3D9FF',
                          outline: 'none',
                          stroke: '#4A90E2',
                          strokeWidth: 1.2,
                        },
                        hover: {
                          fill: '#B3D9FF',
                          outline: 'none',
                          stroke: '#4A90E2',
                          strokeWidth: 1.2,
                          cursor: 'pointer',
                        },
                        pressed: {
                          fill: '#9CCBFF',
                          outline: 'none',
                          stroke: '#4A90E2',
                          strokeWidth: 1.2,
                        },
                      }}
                    />
                  ) : null}
                </>
              );
            }}
          </Geographies>

          {/* City markers */}
          {cities.map((city) => (
            <Marker key={city.name} coordinates={city.coordinates}>
              <circle
                r={4}
                fill="#F53"
                stroke="#fff"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
              />
              <text
                textAnchor="middle"
                y={-10}
                style={{
                  fontFamily: 'system-ui',
                  fontSize: '12px',
                  fill: '#333',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                }}
              >
                {city.name}
              </text>
            </Marker>
          ))}
        </ComposableMap>
      </div>

      <div className="info">
        <h3>How to use</h3>
        <ul>
          <li>Click on any country to select it</li>
          <li>The selected country will be highlighted in blue</li>
          <li>City markers show major cities around the world</li>
        </ul>
      </div>
    </div>
  );
};

export default App;
