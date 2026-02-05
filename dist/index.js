'use strict';

var jsxRuntime = require('react/jsx-runtime');
var React = require('react');
var d3Geo = require('d3-geo');
var reactDom = require('react-dom');
var topojsonClient = require('topojson-client');
var d3Zoom = require('d3-zoom');
var d3Selection = require('d3-selection');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var React__default = /*#__PURE__*/_interopDefault(React);
var d3Geo__namespace = /*#__PURE__*/_interopNamespace(d3Geo);

// Helper functions to create branded types
const createLongitude = (value) => value;
const createLatitude = (value) => value;
const createCoordinates$1 = (lon, lat) => [
    createLongitude(lon),
    createLatitude(lat),
];
const createScaleExtent = (min, max) => [min, max];
const createTranslateExtent = (topLeft, bottomRight) => [topLeft, bottomRight];
const createRotationAngles = (x, y, z) => [x, y, z];
const createParallels = (p1, p2) => [p1, p2];
const createGraticuleStep = (x, y) => [x, y];
// Convenience functions for ZoomableGroup configuration
const createZoomConfig = (minZoom, maxZoom) => ({
    minZoom,
    maxZoom,
    scaleExtent: createScaleExtent(minZoom, maxZoom),
    enableZoom: true,
});
const createPanConfig = (bounds) => ({
    translateExtent: createTranslateExtent(bounds[0], bounds[1]),
    enablePan: true,
});
const createZoomPanConfig = (minZoom, maxZoom, bounds) => ({
    ...createZoomConfig(minZoom, maxZoom),
    ...createPanConfig(bounds),
});

/**
 * Calculates coordinates from zoom transform
 * @param w - Width of the map
 * @param h - Height of the map
 * @param t - Zoom transform object
 * @returns Branded coordinates
 */
function getCoords(w, h, t) {
    const xOffset = (w * t.k - w) / 2;
    const yOffset = (h * t.k - h) / 2;
    const lon = w / 2 - (xOffset + t.x) / t.k;
    const lat = h / 2 - (yOffset + t.y) / t.k;
    return createCoordinates$1(lon, lat);
}

/**
 * Creates a standardized geography fetch error
 * @param type - Error type
 * @param message - Error message
 * @param url - URL that caused the error (optional)
 * @param originalError - Original error that caused this error (optional)
 * @returns GeographyError instance
 */
function createGeographyFetchError(type, message, url, originalError) {
    const error = new Error(message);
    error.name = 'GeographyError';
    error.type = type;
    error.timestamp = new Date().toISOString();
    if (url) {
        error.geography = url;
    }
    if (originalError) {
        error.cause = originalError;
        if (originalError.stack) {
            error.stack = originalError.stack;
        }
        error.details = {
            originalMessage: originalError.message,
            originalName: originalError.name,
        };
    }
    return error;
}

/**
 * Simple URL validation to avoid circular dependency
 * @param url - URL to validate
 * @returns Validated URL string
 */
function validateURL(url) {
    if (!url || typeof url !== 'string') {
        throw new Error('URL must be a non-empty string');
    }
    // Basic URL validation
    try {
        new URL(url);
        return url.trim();
    }
    catch {
        throw new Error('Invalid URL format');
    }
}
const DEFAULT_GEOGRAPHY_FETCH_CONFIG = {
    TIMEOUT_MS: 10000, // 10 seconds
    MAX_RESPONSE_SIZE: 50 * 1024 * 1024, // 50MB
    ALLOWED_CONTENT_TYPES: ['application/json', 'application/geo+json']};
// Current active configuration (defaults to secure)
let GEOGRAPHY_FETCH_CONFIG = DEFAULT_GEOGRAPHY_FETCH_CONFIG;
/**
 * Checks if a hostname is a private IP address
 * @param hostname - The hostname to check
 * @returns True if the hostname is a private IP address
 */
function isPrivateIPAddress(hostname) {
    // Skip non-IP hostnames
    if (!hostname || hostname === 'localhost') {
        return false;
    }
    // IPv4 private ranges
    const ipv4PrivateRanges = [
        /^10\./, // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
        /^192\.168\./, // 192.168.0.0/16
        /^127\./, // 127.0.0.0/8 (loopback)
        /^169\.254\./, // 169.254.0.0/16 (link-local)
    ];
    // Check IPv4 private ranges
    for (const range of ipv4PrivateRanges) {
        if (range.test(hostname)) {
            return true;
        }
    }
    // IPv6 private ranges (simplified check)
    const ipv6PrivateRanges = [
        /^::1$/, // ::1 (loopback)
        /^fe80:/, // fe80::/10 (link-local)
        /^fc00:/, // fc00::/7 (unique local)
        /^fd00:/, // fd00::/8 (unique local)
    ];
    // Check IPv6 private ranges
    for (const range of ipv6PrivateRanges) {
        if (range.test(hostname)) {
            return true;
        }
    }
    return false;
}
/**
 * Validates a geography URL for security and format compliance
 * @param url - The URL to validate
 * @throws {Error} If the URL is invalid or insecure
 */
function validateGeographyUrl(url) {
    // Use comprehensive URL validation from input-validation module
    const validatedUrl = validateURL(url);
    try {
        const parsedUrl = new URL(validatedUrl);
        // Strict HTTPS-only mode
        {
            if (parsedUrl.protocol !== 'https:') {
                throw createGeographyFetchError('SECURITY_ERROR', `Strict HTTPS-only mode: ${parsedUrl.protocol} is not allowed. Only HTTPS is permitted.`, url);
            }
        }
        // Additional security checks for localhost access
        if (parsedUrl.hostname === 'localhost' ||
            parsedUrl.hostname === '127.0.0.1') {
            if (process.env.NODE_ENV === 'production') {
                throw createGeographyFetchError('SECURITY_ERROR', 'Localhost access is not allowed in production', url);
            }
        }
        // Validate against private IP ranges (additional security)
        if (isPrivateIPAddress(parsedUrl.hostname)) {
            throw createGeographyFetchError('SECURITY_ERROR', `Access to private IP address ${parsedUrl.hostname} is not allowed`, url);
        }
    }
    catch (error) {
        if (error instanceof TypeError) {
            throw createGeographyFetchError('VALIDATION_ERROR', `Invalid URL format: ${url}`, url, error);
        }
        throw error;
    }
}
/**
 * Validates response content type
 * @param response - The fetch response to validate
 * @throws {Error} If content type is invalid
 */
function validateContentType(response) {
    const contentType = response.headers.get('content-type');
    if (!contentType) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'Missing Content-Type header');
    }
    const isValidType = GEOGRAPHY_FETCH_CONFIG.ALLOWED_CONTENT_TYPES.some((type) => contentType.toLowerCase().includes(type));
    if (!isValidType) {
        throw createGeographyFetchError('VALIDATION_ERROR', `Invalid content type: ${contentType}. Expected one of: ${GEOGRAPHY_FETCH_CONFIG.ALLOWED_CONTENT_TYPES.join(', ')}`);
    }
}
/**
 * Validates response size to prevent memory issues
 * @param response - The fetch response to validate
 * @throws {Error} If response is too large
 */
async function validateResponseSize(response) {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (size > GEOGRAPHY_FETCH_CONFIG.MAX_RESPONSE_SIZE) {
            throw createGeographyFetchError('VALIDATION_ERROR', `Response too large: ${size} bytes. Maximum allowed: ${GEOGRAPHY_FETCH_CONFIG.MAX_RESPONSE_SIZE} bytes`);
        }
    }
}
/**
 * Validates that the parsed data is a valid geography object
 * @param data - The parsed JSON data to validate
 * @throws {Error} If data is not a valid geography object
 */
function validateGeographyData(data) {
    if (!data || typeof data !== 'object') {
        throw createGeographyFetchError('VALIDATION_ERROR', 'Invalid geography data: not a valid object');
    }
    const obj = data;
    if (!obj.type ||
        (obj.type !== 'Topology' && obj.type !== 'FeatureCollection')) {
        throw createGeographyFetchError('VALIDATION_ERROR', `Invalid geography data: expected Topology or FeatureCollection, got ${obj.type}`);
    }
}

/**
 * Known SRI hashes for common geography data sources
 * These hashes are automatically generated and verified
 * Run 'npm run generate-sri' to update these hashes
 */
const KNOWN_GEOGRAPHY_SRI = {
    // World Atlas from unpkg.com - Countries data
    'https://unpkg.com/world-atlas@2/countries-110m.json': {
        algorithm: 'sha384',
        hash: 'sha384-yOCJ+8ShBm8UDqtAVtAvxTDDf4gXo5edxl/YG0FmVC5OTmqVLl7utuVGBDEeZWHf',
        enforceIntegrity: true,
    },
    'https://unpkg.com/world-atlas@2/countries-50m.json': {
        algorithm: 'sha384',
        hash: 'sha384-Aw4s9pX1PTPntIYkZ/qV9IYiF5Gv8eTl6Dd/TT56zfO1Wwd+owFwYUuuXNUMrWkc',
        enforceIntegrity: true,
    },
    // World Atlas from unpkg.com - Land data
    'https://unpkg.com/world-atlas@2/land-110m.json': {
        algorithm: 'sha384',
        hash: 'sha384-5oFOGoMd0tkagYW08lVco4uAi7XDEDBwBxOdeKx+SA1ihbsHiR/aFAJGretluTzG',
        enforceIntegrity: true,
    },
    'https://unpkg.com/world-atlas@2/land-50m.json': {
        algorithm: 'sha384',
        hash: 'sha384-c0VeCJd1wVbV5WQZNjf1hcMqPr9QXweEArnbdgS1k75TBNjta2M/NddyAulA/Glb',
        enforceIntegrity: true,
    },
};
const DEFAULT_SRI_CONFIG = {
    enforceForKnownSources: true,
    customSRIMap: {},
};
let currentSRIConfig = DEFAULT_SRI_CONFIG;
/**
 * Calculate SHA hash of data
 * @param data - Data to hash
 * @param algorithm - Hash algorithm to use
 * @returns Promise resolving to base64-encoded hash
 */
async function calculateHash(data, algorithm) {
    // Use Web Crypto API (available in browsers and Node.js 16+)
    const hashBuffer = await globalThis.crypto.subtle.digest(algorithm, data);
    const hashArray = new Uint8Array(hashBuffer);
    // Convert to base64 (browser-compatible)
    let hashBase64;
    if (typeof globalThis.btoa !== 'undefined') {
        // Browser environment
        hashBase64 = globalThis.btoa(String.fromCharCode(...hashArray));
    }
    else {
        // Node.js environment - use manual base64 encoding
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        while (i < hashArray.length) {
            const a = hashArray[i++] || 0;
            const b = i < hashArray.length ? hashArray[i++] || 0 : 0;
            const c = i < hashArray.length ? hashArray[i++] || 0 : 0;
            const bitmap = (a << 16) | (b << 8) | c;
            result += chars.charAt((bitmap >> 18) & 63);
            result += chars.charAt((bitmap >> 12) & 63);
            result +=
                i - 2 < hashArray.length ? chars.charAt((bitmap >> 6) & 63) : '=';
            result += i - 1 < hashArray.length ? chars.charAt(bitmap & 63) : '=';
        }
        hashBase64 = result;
    }
    return hashBase64;
}
/**
 * Validate ArrayBuffer integrity using SRI
 * @param arrayBuffer - Data to validate
 * @param url - URL of the resource
 * @param expectedSRI - Expected SRI configuration
 * @returns Promise that resolves if validation passes, throws if it fails
 */
async function validateSRIFromArrayBuffer(arrayBuffer, url, expectedSRI) {
    // Calculate hash based on algorithm
    const algorithmMap = {
        sha256: 'SHA-256',
        sha384: 'SHA-384',
        sha512: 'SHA-512',
    };
    const calculatedHash = await calculateHash(arrayBuffer, algorithmMap[expectedSRI.algorithm]);
    const expectedHash = expectedSRI.hash.replace(`${expectedSRI.algorithm}-`, '');
    if (calculatedHash !== expectedHash) {
        const sriError = new Error(`Subresource Integrity check failed for ${url}. Expected ${expectedSRI.algorithm}-${expectedHash}, got ${expectedSRI.algorithm}-${calculatedHash}`);
        sriError.expectedHash = expectedSRI.hash;
        sriError.calculatedHash = `${expectedSRI.algorithm}-${calculatedHash}`;
        sriError.algorithm = expectedSRI.algorithm;
        throw createGeographyFetchError('SECURITY_ERROR', sriError.message, url, sriError);
    }
}
/**
 * Check if SRI validation is required for a URL
 * @param url - URL to check
 * @returns SRI configuration if validation is required, null otherwise
 */
function getSRIForUrl(url) {
    // Check custom SRI map first
    if (currentSRIConfig.customSRIMap[url]) {
        return currentSRIConfig.customSRIMap[url];
    }
    // Check known sources
    if (KNOWN_GEOGRAPHY_SRI[url] && currentSRIConfig.enforceForKnownSources) {
        return KNOWN_GEOGRAPHY_SRI[url];
    }
    return null;
}

/**
 * Creates fetch options with security headers and timeout
 * @param signal - AbortController signal for timeout
 * @returns Fetch options object
 */
function createSecureFetchOptions(signal) {
    return {
        signal,
        headers: {
            Accept: GEOGRAPHY_FETCH_CONFIG.ALLOWED_CONTENT_TYPES.join(', '),
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
        // Security headers
        mode: 'cors',
        credentials: 'omit', // Don't send credentials
    };
}
/**
 * Creates an abort controller with timeout
 * @param timeoutMs - Timeout in milliseconds
 * @returns Object with controller and cleanup function
 */
function createTimeoutController(timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeoutMs);
    return {
        controller,
        cleanup: () => clearTimeout(timeoutId),
    };
}
/**
 * Handles fetch errors and converts them to geography-specific errors
 * @param error - The original error
 * @param url - The URL that was being fetched
 * @returns A GeographyError
 */
function handleFetchError(error, url) {
    if (error instanceof Error) {
        if (error.name === 'AbortError') {
            return createGeographyFetchError('GEOGRAPHY_LOAD_ERROR', `Request timeout after ${GEOGRAPHY_FETCH_CONFIG.TIMEOUT_MS}ms`, url, error);
        }
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return createGeographyFetchError('GEOGRAPHY_LOAD_ERROR', `Network error: Unable to fetch geography from ${url}`, url, error);
        }
        if (error.message.includes('Invalid geography data')) {
            return createGeographyFetchError('GEOGRAPHY_PARSE_ERROR', error.message, url, error);
        }
    }
    // Re-throw if it's already a GeographyError
    if (error instanceof Error && 'type' in error) {
        return error;
    }
    // Default error
    return createGeographyFetchError('GEOGRAPHY_LOAD_ERROR', error instanceof Error ? error.message : 'Unknown error occurred', url, error instanceof Error ? error : undefined);
}
/**
 * Parses JSON response with proper error handling
 * @param response - The fetch response
 * @param url - The URL for error context
 * @returns Parsed geography data
 */
async function parseGeographyResponse(response, url) {
    try {
        const data = await response.json();
        validateGeographyData(data);
        return data;
    }
    catch (jsonError) {
        if (jsonError instanceof SyntaxError) {
            throw createGeographyFetchError('GEOGRAPHY_PARSE_ERROR', 'Invalid JSON format in geography data', url, jsonError);
        }
        throw jsonError;
    }
}
/**
 * Parses JSON from ArrayBuffer with proper error handling
 * @param arrayBuffer - The response data as ArrayBuffer
 * @param url - The URL for error context
 * @returns Parsed geography data
 */
async function parseGeographyFromArrayBuffer(arrayBuffer, url) {
    try {
        const text = new TextDecoder().decode(arrayBuffer);
        const data = JSON.parse(text);
        validateGeographyData(data);
        return data;
    }
    catch (jsonError) {
        if (jsonError instanceof SyntaxError) {
            throw createGeographyFetchError('GEOGRAPHY_PARSE_ERROR', 'Invalid JSON format in geography data', url, jsonError);
        }
        throw jsonError;
    }
}
/**
 * Secure, cached geography fetching with comprehensive validation
 * This function is cached using React's cache() for optimal performance
 */
const fetchGeographiesCache = React.cache(async (url) => {
    // Validate URL before making request
    validateGeographyUrl(url);
    // Check if SRI validation is required
    const sriConfig = getSRIForUrl(url);
    // Create timeout controller
    const { controller, cleanup } = createTimeoutController(GEOGRAPHY_FETCH_CONFIG.TIMEOUT_MS);
    try {
        // Make secure fetch request
        const response = await fetch(url, createSecureFetchOptions(controller.signal));
        cleanup();
        // Validate response
        if (!response.ok) {
            throw createGeographyFetchError('GEOGRAPHY_LOAD_ERROR', `HTTP ${response.status}: ${response.statusText}`, url);
        }
        // Validate content type and size
        validateContentType(response);
        await validateResponseSize(response);
        // Handle SRI validation and parsing in one step to avoid response body consumption issues
        if (sriConfig) {
            // Read response body once as ArrayBuffer
            const arrayBuffer = await response.arrayBuffer();
            // Validate SRI hash
            await validateSRIFromArrayBuffer(arrayBuffer, url, sriConfig);
            // Parse JSON from ArrayBuffer
            return await parseGeographyFromArrayBuffer(arrayBuffer, url);
        }
        else {
            // No SRI validation needed, parse normally
            return await parseGeographyResponse(response, url);
        }
    }
    catch (error) {
        cleanup();
        throw handleFetchError(error, url);
    }
});

/**
 * Checks if the input is a string (URL)
 * @param geo - Geography data or URL
 * @returns True if input is a string
 */
function isString(geo) {
    return typeof geo === 'string';
}
/**
 * Extracts features from topology data
 * @param topology - Topology object
 * @param parseGeographies - Optional parser function
 * @returns Array of features
 */
function extractFeaturesFromTopology(topology, parseGeographies) {
    const objectKeys = Object.keys(topology.objects);
    if (objectKeys.length === 0) {
        return [];
    }
    // Get the first object (usually countries, states, etc.)
    const firstObjectKey = objectKeys[0];
    if (!firstObjectKey) {
        return [];
    }
    const geometryObject = topology.objects[firstObjectKey];
    if (!geometryObject) {
        return [];
    }
    const featureCollection = topojsonClient.feature(topology, geometryObject);
    const features = 'features' in featureCollection ? featureCollection.features || [] : [];
    return parseGeographies ? parseGeographies(features) : features;
}
/**
 * Extracts features from FeatureCollection
 * @param featureCollection - FeatureCollection object
 * @param parseGeographies - Optional parser function
 * @returns Array of features
 */
function extractFeaturesFromCollection(featureCollection, parseGeographies) {
    const features = featureCollection.features || [];
    return parseGeographies ? parseGeographies(features) : features;
}
/**
 * Extracts features from various geography data formats
 * @param geographies - Geography data (Topology, FeatureCollection, or Feature array)
 * @param parseGeographies - Optional parser function for features
 * @returns Array of features
 */
function getFeatures(geographies, parseGeographies) {
    // Handle array of features
    if (Array.isArray(geographies)) {
        return parseGeographies ? parseGeographies(geographies) : geographies;
    }
    // Handle Topology
    if (geographies.type === 'Topology') {
        return extractFeaturesFromTopology(geographies, parseGeographies);
    }
    // Handle FeatureCollection
    if (geographies.type === 'FeatureCollection') {
        return extractFeaturesFromCollection(geographies, parseGeographies);
    }
    return [];
}
/**
 * Extracts mesh data from topology for borders and outlines
 * @param topology - Topology object
 * @returns Mesh data with outline and borders, or null if not available
 */
function extractMeshFromTopology(topology) {
    const objectKeys = Object.keys(topology.objects);
    if (objectKeys.length === 0) {
        return null;
    }
    const firstObjectKey = objectKeys[0];
    if (!firstObjectKey) {
        return null;
    }
    const geometryObject = topology.objects[firstObjectKey];
    if (!geometryObject) {
        return null;
    }
    try {
        // Generate outline (exterior boundaries)
        const outline = topojsonClient.mesh(topology, geometryObject, (a, b) => a === b);
        // Generate borders (interior boundaries)
        const borders = topojsonClient.mesh(topology, geometryObject, (a, b) => a !== b);
        return { outline, borders };
    }
    catch {
        return null;
    }
}
/**
 * Extracts mesh data from geography data
 * @param geographies - Geography data (only Topology supports mesh)
 * @returns Mesh data or null
 */
function getMesh(geographies) {
    // Only Topology supports mesh generation
    if (geographies &&
        typeof geographies === 'object' &&
        !Array.isArray(geographies) &&
        'type' in geographies &&
        geographies.type === 'Topology') {
        return extractMeshFromTopology(geographies);
    }
    return null;
}
/**
 * Prepares mesh data by generating SVG paths
 * @param outline - Outline geometry
 * @param borders - Borders geometry
 * @param path - D3 path generator
 * @returns Object with SVG path strings
 */
function prepareMesh(outline, borders, path) {
    const result = {};
    if (outline) {
        const outlinePath = path(outline);
        if (outlinePath) {
            result.outline = outlinePath;
        }
    }
    if (borders) {
        const bordersPath = path(borders);
        if (bordersPath) {
            result.borders = bordersPath;
        }
    }
    return result;
}
/**
 * Prepares features by generating SVG paths for each feature
 * @param features - Array of features to prepare
 * @param path - D3 path generator
 * @returns Array of prepared features with SVG paths
 */
function prepareFeatures(features, path) {
    if (!features || features.length === 0) {
        return [];
    }
    return features
        .map((feature) => {
        const svgPath = path(feature);
        if (!svgPath) {
            return null;
        }
        return {
            ...feature,
            svgPath,
        };
    })
        .filter((feature) => feature !== null);
}
/**
 * Creates a connector path between two coordinates
 * @param start - Starting coordinates [longitude, latitude]
 * @param end - Ending coordinates [longitude, latitude]
 * @param curve - D3 curve function for path interpolation
 * @returns SVG path string
 */
function createConnectorPath(start, end, curve) {
    // Type guard for curve function
    if (typeof curve !== 'function') {
        return '';
    }
    try {
        // Use type assertion for D3 curve - this is a known external API
        const curveFactory = curve;
        const line = curveFactory()
            .x((d) => d[0])
            .y((d) => d[1]);
        return line([start, end]) || '';
    }
    catch {
        return '';
    }
}

// Re-export utilities from focused modules
// Utility functions to create enhanced geography errors
function createGeographyError(type, message, geography, details) {
    const error = new Error(message);
    error.type = type;
    if (details)
        error.details = details;
    return error;
}

const DEFAULT_VALIDATION_CONFIG = {
    maxStringLength: 10000,
    maxArrayLength: 1000,
    maxObjectDepth: 10,
};
let currentValidationConfig = DEFAULT_VALIDATION_CONFIG;
/**
 * Sanitize string input to prevent injection attacks
 * @param input - String to sanitize
 * @param allowHTML - Whether to allow HTML content
 * @returns Sanitized string
 */
function sanitizeString(input, allowHTML = false) {
    if (typeof input !== 'string') {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `Expected string, got ${typeof input}`);
    }
    // Check length limits
    if (input.length > currentValidationConfig.maxStringLength) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `String too long: ${input.length} characters (max: ${currentValidationConfig.maxStringLength})`);
    }
    let sanitized = input;
    if (!allowHTML) {
        // Remove HTML tags and entities
        sanitized = sanitized
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&[^;]+;/g, '') // Remove HTML entities
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/data:/gi, '') // Remove data: URLs
            .replace(/vbscript:/gi, ''); // Remove vbscript: URLs
    }
    // Remove null bytes and control characters (excluding common whitespace)
    // eslint-disable-next-line no-control-regex
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return sanitized;
}
/**
 * Validate numeric input with range checking
 * @param input - Number to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validated number
 */
function validateNumber(input, min = -Infinity, max = Infinity) {
    if (typeof input !== 'number') {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `Expected number, got ${typeof input}`);
    }
    if (!Number.isFinite(input)) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', 'Number must be finite');
    }
    if (input < min || input > max) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `Number ${input} is outside allowed range [${min}, ${max}]`);
    }
    return input;
}
/**
 * Validate coordinates input
 * @param input - Coordinates to validate
 * @returns Validated coordinates
 */
function validateCoordinates(input) {
    if (!Array.isArray(input) || input.length !== 2) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', 'Coordinates must be an array of exactly 2 numbers');
    }
    const [lon, lat] = input;
    const validatedLon = validateNumber(lon, -180, 180);
    const validatedLat = validateNumber(lat, -90, 90);
    return [validatedLon, validatedLat];
}
/**
 * Validate array input with length and content validation
 * @param input - Array to validate
 * @param itemValidator - Function to validate each item
 * @returns Validated array
 */
function validateArray(input, itemValidator) {
    if (!Array.isArray(input)) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `Expected array, got ${typeof input}`);
    }
    if (input.length > currentValidationConfig.maxArrayLength) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `Array too long: ${input.length} items (max: ${currentValidationConfig.maxArrayLength})`);
    }
    if (itemValidator) {
        return input.map((item, index) => {
            try {
                return itemValidator(item, index);
            }
            catch (error) {
                throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `Invalid array item at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        });
    }
    return input;
}
/**
 * Validate object input with depth checking
 * @param input - Object to validate
 * @param depth - Current depth (for recursion)
 * @returns Validated object
 */
function validateObject(input, depth = 0) {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `Expected object, got ${typeof input}`);
    }
    if (depth > currentValidationConfig.maxObjectDepth) {
        throw createGeographyFetchError('VALIDATION_ERROR', 'VALIDATION_ERROR', `Object nesting too deep: ${depth} levels (max: ${currentValidationConfig.maxObjectDepth})`);
    }
    const obj = input;
    const validated = {};
    for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const sanitizedKey = sanitizeString(key);
        // Recursively validate nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            validated[sanitizedKey] = validateObject(value, depth + 1);
        }
        else {
            validated[sanitizedKey] = value;
        }
    }
    return validated;
}
/**
 * Validate projection configuration
 * @param input - Projection config to validate
 * @returns Validated projection config
 */
function validateProjectionConfig(input) {
    const obj = validateObject(input);
    const config = {};
    if ('center' in obj && obj.center !== undefined) {
        config.center = validateCoordinates(obj.center);
    }
    if ('rotate' in obj && obj.rotate !== undefined) {
        if (Array.isArray(obj.rotate)) {
            const rotateArray = validateArray(obj.rotate, (item) => validateNumber(item, -360, 360));
            if (rotateArray.length === 3 &&
                rotateArray[0] !== undefined &&
                rotateArray[1] !== undefined &&
                rotateArray[2] !== undefined) {
                config.rotate = createRotationAngles(rotateArray[0], rotateArray[1], rotateArray[2]);
            }
        }
    }
    if ('scale' in obj && obj.scale !== undefined) {
        config.scale = validateNumber(obj.scale, 0.1, 10000);
    }
    if ('parallels' in obj && obj.parallels !== undefined) {
        if (Array.isArray(obj.parallels)) {
            const parallelsArray = validateArray(obj.parallels, (item) => validateNumber(item, -90, 90));
            if (parallelsArray.length === 2 &&
                parallelsArray[0] !== undefined &&
                parallelsArray[1] !== undefined) {
                config.parallels = createParallels(parallelsArray[0], parallelsArray[1]);
            }
        }
    }
    return config;
}

const { geoPath, ...projections } = d3Geo__namespace;
const MapContext = React.createContext(undefined);
const makeProjection = ({ projectionConfig = {}, projection = 'geoEqualEarth', width = 800, height = 600, }) => {
    const isFunc = typeof projection === 'function';
    if (isFunc)
        return projection;
    // Validate and sanitize projection input
    const sanitizedProjection = sanitizeString(projection);
    // Validate projection configuration
    const validatedConfig = validateProjectionConfig(projectionConfig);
    const projectionName = sanitizedProjection;
    if (!(projectionName in projections)) {
        throw createGeographyError('PROJECTION_ERROR', `Unknown projection: ${sanitizedProjection}`, undefined, { availableProjections: Object.keys(projections) });
    }
    let proj = projections[projectionName]().translate([
        width / 2,
        height / 2,
    ]);
    // Apply validated projection configuration
    if (validatedConfig.center && proj.center) {
        proj = proj.center(validatedConfig.center);
    }
    if (validatedConfig.rotate && proj.rotate) {
        proj = proj.rotate(validatedConfig.rotate);
    }
    if (validatedConfig.scale && proj.scale) {
        proj = proj.scale(validatedConfig.scale);
    }
    return proj;
};
const MapProvider = ({ width, height, projection, projectionConfig = {}, children, }) => {
    const projMemo = React.useMemo(() => {
        return makeProjection({
            projectionConfig,
            projection: projection || 'geoEqualEarth',
            width,
            height,
        });
    }, [width, height, projection, projectionConfig]);
    const value = React.useMemo(() => {
        return {
            width,
            height,
            projection: projMemo,
            path: geoPath().projection(projMemo),
        };
    }, [width, height, projMemo]);
    return jsxRuntime.jsx(MapContext, { value: value, children: children });
};
const useMapContext = () => {
    const context = React.useContext(MapContext);
    if (context === undefined) {
        throw createGeographyError('CONTEXT_ERROR', 'useMapContext must be used within a MapProvider');
    }
    return context;
};

// React 19 debugging utilities
/**
 * Safely capture owner stack - only available in React development builds.
 * This function is NOT exported in production builds, so we access it
 * conditionally via React namespace with proper type checking.
 *
 * @see https://react.dev/reference/react/captureOwnerStack
 */
function safeCaptureOwnerStack() {
    // captureOwnerStack is only available in development builds of React 19
    // It's not a stable export - must be accessed conditionally
    if (process.env.NODE_ENV !== 'production' &&
        typeof React__default.default === 'object' &&
        React__default.default !== null &&
        'captureOwnerStack' in React__default.default &&
        typeof React__default.default
            .captureOwnerStack === 'function') {
        try {
            return React__default.default.captureOwnerStack();
        }
        catch {
            // Silently fail if captureOwnerStack throws
            return null;
        }
    }
    return null;
}
/**
 * Debug logger for React Simple Maps components
 */
class MapDebugger {
    static instance;
    debugLogs = [];
    performanceMetrics = new Map();
    isEnabled = this.getDebugMode();
    /**
     * Determine if debug mode should be enabled
     * Priority: Environment variable > explicit prop > default (false)
     */
    getDebugMode() {
        // Check environment variable first
        if (typeof process !== 'undefined') {
            const envDebug = process.env.REACT_SIMPLE_MAPS_DEBUG;
            if (envDebug === 'true' || envDebug === '1') {
                return true;
            }
            if (envDebug === 'false' || envDebug === '0') {
                return false;
            }
        }
        // Default to quiet (false) - opt-in debugging only
        return false;
    }
    /**
     * Enable or disable debugging at runtime
     */
    setDebugMode(enabled) {
        this.isEnabled = enabled;
    }
    static getInstance() {
        if (!MapDebugger.instance) {
            MapDebugger.instance = new MapDebugger();
        }
        return MapDebugger.instance;
    }
    /**
     * Log component render with owner stack information
     */
    logRender(componentName, props, state) {
        if (!this.isEnabled)
            return;
        const ownerStack = safeCaptureOwnerStack();
        const debugInfo = {
            componentName,
            ownerStack,
            timestamp: Date.now(),
            ...(props && { props: this.sanitizeProps(props) }),
            ...(state && { state: this.sanitizeState(state) }),
        };
        this.debugLogs.push(debugInfo);
        // Keep only last 100 logs to prevent memory leaks
        if (this.debugLogs.length > 100) {
            this.debugLogs.shift();
        }
        if (this.isEnabled) {
            // eslint-disable-next-line no-console
            console.group(`🗺️ ${componentName} Render`);
            // eslint-disable-next-line no-console
            console.log('Owner Stack:', ownerStack);
            // eslint-disable-next-line no-console
            if (props)
                console.log('Props:', props);
            // eslint-disable-next-line no-console
            if (state)
                console.log('State:', state);
            // eslint-disable-next-line no-console
            console.groupEnd();
        }
    }
    /**
     * Log component errors with debugging context
     */
    logError(componentName, error, props) {
        if (!this.isEnabled)
            return;
        const ownerStack = safeCaptureOwnerStack();
        const debugInfo = {
            componentName,
            ownerStack,
            timestamp: Date.now(),
            ...(props && { props: this.sanitizeProps(props) }),
            error,
        };
        this.debugLogs.push(debugInfo);
        if (this.isEnabled) {
            // eslint-disable-next-line no-console
            console.group(`❌ ${componentName} Error`);
            // eslint-disable-next-line no-console
            console.error('Error:', error);
            // eslint-disable-next-line no-console
            console.log('Owner Stack:', ownerStack);
            // eslint-disable-next-line no-console
            if (props)
                console.log('Props:', props);
            // eslint-disable-next-line no-console
            console.groupEnd();
        }
    }
    /**
     * Track performance metrics for components
     */
    trackPerformance(componentName, renderTime) {
        if (!this.isEnabled)
            return;
        const existing = this.performanceMetrics.get(componentName) || {
            renderTime: 0,
            componentCount: 0,
            updateCount: 0,
        };
        this.performanceMetrics.set(componentName, {
            renderTime: (existing.renderTime + renderTime) / 2, // Moving average
            componentCount: existing.componentCount + 1,
            updateCount: existing.updateCount + 1,
        });
    }
    /**
     * Get debug logs for a specific component
     */
    getLogsForComponent(componentName) {
        return this.debugLogs.filter((log) => log.componentName === componentName);
    }
    /**
     * Get all debug logs
     */
    getAllLogs() {
        return [...this.debugLogs];
    }
    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        return new Map(this.performanceMetrics);
    }
    /**
     * Clear all debug data
     */
    clear() {
        this.debugLogs.length = 0;
        this.performanceMetrics.clear();
    }
    /**
     * Enable or disable debugging
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
    /**
     * Export debug data for analysis
     */
    exportDebugData() {
        return {
            logs: this.getAllLogs(),
            performance: Object.fromEntries(this.performanceMetrics),
            timestamp: Date.now(),
        };
    }
    sanitizeProps(props) {
        if (!props)
            return undefined;
        // Remove functions and complex objects for cleaner logging
        const sanitized = {};
        for (const [key, value] of Object.entries(props)) {
            if (typeof value === 'function') {
                sanitized[key] = '[Function]';
            }
            else if (value &&
                typeof value === 'object' &&
                value.constructor !== Object &&
                value.constructor !== Array) {
                sanitized[key] = `[${value.constructor.name}]`;
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    sanitizeState(state) {
        return this.sanitizeProps(state);
    }
}
/**
 * Hook for component debugging with opt-in support
 */
function useMapDebugger(componentName, debug) {
    const mapDebugger = MapDebugger.getInstance();
    // If debug prop is provided, temporarily set debug mode
    if (debug !== undefined) {
        mapDebugger.setDebugMode(debug);
    }
    return {
        logRender: (props, state) => mapDebugger.logRender(componentName, props, state),
        logError: (error, props) => mapDebugger.logError(componentName, error, props),
        trackPerformance: (renderTime) => mapDebugger.trackPerformance(componentName, renderTime),
    };
}
/**
 * Development-only debugging utilities
 */
const devTools = {
    /**
     * Log component hierarchy with owner stack
     */
    logComponentHierarchy: (componentName) => {
        if (typeof process !== 'undefined' &&
            process.env.NODE_ENV !== 'production') {
            const ownerStack = safeCaptureOwnerStack();
            // eslint-disable-next-line no-console
            console.log(`📊 Component Hierarchy for ${componentName}:`, ownerStack);
        }
    },
    /**
     * Measure component render time
     */
    measureRenderTime: (componentName, renderFn) => {
        if (typeof process !== 'undefined' &&
            process.env.NODE_ENV !== 'production') {
            const start = performance.now();
            const result = renderFn();
            const end = performance.now();
            // eslint-disable-next-line no-console
            console.log(`⏱️ ${componentName} render time: ${(end - start).toFixed(2)}ms`);
            return result;
        }
        return renderFn();
    },
    /**
     * Debug geography loading
     */
    debugGeographyLoading: (url, status, data) => {
        if (typeof process !== 'undefined' &&
            process.env.NODE_ENV !== 'production') {
            try {
                const ownerStack = safeCaptureOwnerStack();
                // eslint-disable-next-line no-console
                console.group(`🌍 Geography Loading: ${url}`);
                // eslint-disable-next-line no-console
                console.log('Status:', status);
                // eslint-disable-next-line no-console
                console.log('Owner Stack:', ownerStack);
                // eslint-disable-next-line no-console
                if (data)
                    console.log('Data:', data);
                // eslint-disable-next-line no-console
                console.groupEnd();
            }
            catch {
                // eslint-disable-next-line no-console
                console.log(`🌍 Geography Loading: ${url} - Status: ${status}`);
                // eslint-disable-next-line no-console
                if (data)
                    console.log('Data:', data);
            }
        }
    },
};
// Global debugger instance
const mapDebugger = MapDebugger.getInstance();
// Export for development console access
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    globalThis.__MAP_DEBUGGER__ = mapDebugger;
}

function ComposableMap({ width = 800, height = 600, projection = 'geoEqualEarth', projectionConfig = {}, className = '', debug = false, children, ref, ...restProps }) {
    const { logRender } = useMapDebugger('ComposableMap', debug);
    // Log render with debugging information (only if debug is enabled)
    logRender({ width, height, projection, projectionConfig, className });
    return (jsxRuntime.jsx(MapProvider, { width: width, height: height, projection: projection, projectionConfig: projectionConfig, children: jsxRuntime.jsx("svg", { ref: ref, viewBox: `0 0 ${width} ${height}`, className: `rsm-svg ${className}`, ...restProps, children: children }) }));
}
ComposableMap.displayName = 'ComposableMap';
var ComposableMap$1 = React.memo(ComposableMap);

/**
 * MapMetadata component using React 19 native metadata tags
 * Provides SEO and social media optimization for map components
 */
function MapMetadata({ title, description, keywords = [], author, viewport = 'width=device-width, initial-scale=1', canonicalUrl, ogTitle, ogDescription, ogImage, ogUrl, twitterCard = 'summary_large_image', twitterTitle, twitterDescription, twitterImage, jsonLd, children, }) {
    return (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [title && jsxRuntime.jsx("title", { children: title }), description && jsxRuntime.jsx("meta", { name: "description", content: description }), keywords.length > 0 && (jsxRuntime.jsx("meta", { name: "keywords", content: keywords.join(', ') })), author && jsxRuntime.jsx("meta", { name: "author", content: author }), jsxRuntime.jsx("meta", { name: "viewport", content: viewport }), canonicalUrl && jsxRuntime.jsx("link", { rel: "canonical", href: canonicalUrl }), ogTitle && jsxRuntime.jsx("meta", { property: "og:title", content: ogTitle }), ogDescription && (jsxRuntime.jsx("meta", { property: "og:description", content: ogDescription })), ogImage && jsxRuntime.jsx("meta", { property: "og:image", content: ogImage }), ogUrl && jsxRuntime.jsx("meta", { property: "og:url", content: ogUrl }), jsxRuntime.jsx("meta", { property: "og:type", content: "website" }), jsxRuntime.jsx("meta", { name: "twitter:card", content: twitterCard }), twitterTitle && jsxRuntime.jsx("meta", { name: "twitter:title", content: twitterTitle }), twitterDescription && (jsxRuntime.jsx("meta", { name: "twitter:description", content: twitterDescription })), twitterImage && jsxRuntime.jsx("meta", { name: "twitter:image", content: twitterImage }), jsonLd && (jsxRuntime.jsx("script", { type: "application/ld+json", dangerouslySetInnerHTML: { __html: JSON.stringify(jsonLd) } })), jsxRuntime.jsx("meta", { name: "geo.region", content: "world" }), jsxRuntime.jsx("meta", { name: "geo.placename", content: "World Map" }), jsxRuntime.jsx("meta", { name: "ICBM", content: "0, 0" }), jsxRuntime.jsx("link", { rel: "preload", href: "/fonts/map-font.woff2", as: "font", type: "font/woff2", crossOrigin: "anonymous" }), children] }));
}
/**
 * Predefined metadata configurations for common map types
 */
const mapMetadataPresets = {
    worldMap: {
        title: 'Interactive World Map',
        description: 'Explore the world with our interactive map featuring countries, cities, and geographic data.',
        keywords: [
            'world map',
            'interactive map',
            'geography',
            'countries',
            'atlas',
        ],
        author: 'React Simple Maps',
        ogTitle: 'Interactive World Map',
        ogDescription: 'Explore the world with our interactive map featuring countries, cities, and geographic data.',
        twitterTitle: 'Interactive World Map',
        twitterDescription: 'Explore the world with our interactive map featuring countries, cities, and geographic data.',
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Map',
            name: 'Interactive World Map',
            description: 'An interactive world map showing countries and geographic features',
            mapType: 'https://schema.org/VenueMap',
        },
    },
    countryMap: (countryName) => ({
        title: `${countryName} Map - Interactive Geographic Data`,
        description: `Explore ${countryName} with detailed geographic information, cities, and regional data.`,
        keywords: [
            countryName.toLowerCase(),
            'map',
            'geography',
            'interactive',
            'regions',
        ],
        author: 'React Simple Maps',
        ogTitle: `${countryName} Interactive Map`,
        ogDescription: `Explore ${countryName} with detailed geographic information, cities, and regional data.`,
        twitterTitle: `${countryName} Interactive Map`,
        twitterDescription: `Explore ${countryName} with detailed geographic information, cities, and regional data.`,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Map',
            name: `${countryName} Map`,
            description: `Interactive map of ${countryName} with geographic features`,
            mapType: 'https://schema.org/VenueMap',
            about: {
                '@type': 'Country',
                name: countryName,
            },
        },
    }),
    cityMap: (cityName, countryName) => ({
        title: `${cityName} Map${countryName ? ` - ${countryName}` : ''} - Interactive City Guide`,
        description: `Explore ${cityName} with our interactive map featuring neighborhoods, landmarks, and local information.`,
        keywords: [
            cityName.toLowerCase(),
            'city map',
            'urban planning',
            'neighborhoods',
            'interactive',
        ],
        author: 'React Simple Maps',
        ogTitle: `${cityName} Interactive City Map`,
        ogDescription: `Explore ${cityName} with our interactive map featuring neighborhoods, landmarks, and local information.`,
        twitterTitle: `${cityName} Interactive City Map`,
        twitterDescription: `Explore ${cityName} with our interactive map featuring neighborhoods, landmarks, and local information.`,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Map',
            name: `${cityName} City Map`,
            description: `Interactive map of ${cityName} with city features`,
            mapType: 'https://schema.org/VenueMap',
            about: {
                '@type': 'City',
                name: cityName,
                ...(countryName && {
                    containedInPlace: {
                        '@type': 'Country',
                        name: countryName,
                    },
                }),
            },
        },
    }),
    dataVisualization: (dataType) => ({
        title: `${dataType} Data Visualization - Interactive Map`,
        description: `Visualize ${dataType} data on an interactive map with real-time updates and detailed analytics.`,
        keywords: [
            dataType.toLowerCase(),
            'data visualization',
            'analytics',
            'interactive map',
            'statistics',
        ],
        author: 'React Simple Maps',
        ogTitle: `${dataType} Data Visualization`,
        ogDescription: `Visualize ${dataType} data on an interactive map with real-time updates and detailed analytics.`,
        twitterTitle: `${dataType} Data Visualization`,
        twitterDescription: `Visualize ${dataType} data on an interactive map with real-time updates and detailed analytics.`,
        jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Dataset',
            name: `${dataType} Geographic Dataset`,
            description: `Geographic visualization of ${dataType} data`,
            distribution: {
                '@type': 'DataDownload',
                encodingFormat: 'application/json',
            },
        },
    }),
};

function MapWithMetadata({ metadata, enableSEO = true, enableOpenGraph = true, enableTwitterCards = true, enableJsonLd = true, preset = 'worldMap', children, ...mapProps }) {
    // Memoize the processed metadata to prevent unnecessary recalculations
    const processedMetadata = React.useMemo(() => {
        const presetData = mapMetadataPresets[preset];
        // Handle function presets (like countryMap)
        const resolvedPresetData = typeof presetData === 'function'
            ? presetData('Default') // Provide a default parameter for function presets
            : presetData;
        return {
            title: metadata.title || resolvedPresetData.title,
            description: metadata.description || resolvedPresetData.description,
            keywords: metadata.keywords || resolvedPresetData.keywords,
            author: metadata.author || resolvedPresetData.author || '',
            canonicalUrl: metadata.canonicalUrl || '',
            ogTitle: enableOpenGraph
                ? metadata.title || resolvedPresetData.ogTitle
                : undefined,
            ogDescription: enableOpenGraph
                ? metadata.description || resolvedPresetData.ogDescription
                : undefined,
            twitterTitle: enableTwitterCards
                ? metadata.title || resolvedPresetData.twitterTitle
                : undefined,
            twitterDescription: enableTwitterCards
                ? metadata.description || resolvedPresetData.twitterDescription
                : undefined,
            jsonLd: enableJsonLd ? resolvedPresetData.jsonLd : undefined,
        };
    }, [metadata, preset, enableOpenGraph, enableTwitterCards, enableJsonLd]);
    // Memoize the metadata component to prevent unnecessary re-renders
    const metadataComponent = React.useMemo(() => {
        if (!enableSEO)
            return null;
        return (jsxRuntime.jsx(MapMetadata, { title: processedMetadata.title, description: processedMetadata.description, keywords: processedMetadata.keywords, ...(processedMetadata.author && { author: processedMetadata.author }), ...(processedMetadata.canonicalUrl && {
                canonicalUrl: processedMetadata.canonicalUrl,
            }), ...(processedMetadata.ogTitle && {
                ogTitle: processedMetadata.ogTitle,
            }), ...(processedMetadata.ogDescription && {
                ogDescription: processedMetadata.ogDescription,
            }), ...(processedMetadata.twitterTitle && {
                twitterTitle: processedMetadata.twitterTitle,
            }), ...(processedMetadata.twitterDescription && {
                twitterDescription: processedMetadata.twitterDescription,
            }), ...(processedMetadata.jsonLd && { jsonLd: processedMetadata.jsonLd }) }));
    }, [processedMetadata, enableSEO]);
    // Extract ref from mapProps to avoid type issues
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ref: _ref, ...composableMapProps } = mapProps;
    return (jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [metadataComponent, jsxRuntime.jsx(ComposableMap$1, { ...composableMapProps, children: children })] }));
}
MapWithMetadata.displayName = 'MapWithMetadata';
var MapWithMetadata_default = React.memo(MapWithMetadata);

// LRU Cache implementation for better memory management
class LRUCache {
    cache;
    maxSize;
    constructor(maxSize) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    set(key, value) {
        if (this.cache.has(key)) {
            // Update existing key
            this.cache.delete(key);
        }
        else if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }
    clear() {
        this.cache.clear();
    }
    size() {
        return this.cache.size;
    }
}
// Create LRU caches for memory-efficient caching
const geographyCache = {
    features: new LRUCache(50),
    preparedFeatures: new LRUCache(30), // Smaller since these are larger objects
    meshData: new LRUCache(40),
};
// WeakMap-based caches for object-based keys (memory-efficient)
const weakMapCaches = {
    // Cache for raw geography data objects
    geographyDataCache: new WeakMap(),
    // Cache for prepared features by geography object
    preparedFeaturesCache: new WeakMap()};
// Aggressive caching configuration
const CACHE_CONFIG = {
    // Time-based cache invalidation (5 minutes)
    TTL: 5 * 60 * 1000};
// Generate cache key from geography data
function generateCacheKey(data, additionalKey) {
    const baseKey = typeof data === 'string' ? data : JSON.stringify(data).slice(0, 100); // Limit key length
    return additionalKey ? `${baseKey}:${additionalKey}` : baseKey;
}
// Cache features
function cacheFeatures(key, features) {
    geographyCache.features.set(key, features);
}
function getCachedFeatures(key) {
    return geographyCache.features.get(key);
}
// Cache prepared features (with SVG paths)
function cachePreparedFeatures(key, preparedFeatures) {
    geographyCache.preparedFeatures.set(key, preparedFeatures);
}
function getCachedPreparedFeatures(key) {
    return geographyCache.preparedFeatures.get(key);
}
// Cache mesh data
function cacheMeshData(key, meshData) {
    geographyCache.meshData.set(key, meshData);
}
function getCachedMeshData(key) {
    return geographyCache.meshData.get(key);
}
// Generate cache keys for different data types
function generateFeaturesCacheKey(data, parseGeographies) {
    const parseKey = parseGeographies
        ? parseGeographies.toString().slice(0, 50)
        : 'default';
    return generateCacheKey(data, `features:${parseKey}`);
}
function generatePreparedFeaturesCacheKey(features, pathFunction) {
    const featuresKey = features
        .map((f) => f.id || f.properties?.NAME || '')
        .join(',')
        .slice(0, 100);
    const pathKey = typeof pathFunction === 'function'
        ? pathFunction.toString().slice(0, 50)
        : 'default';
    return `prepared:${featuresKey}:${pathKey}`;
}
function generateMeshCacheKey(data, pathFunction) {
    const pathKey = typeof pathFunction === 'function'
        ? pathFunction.toString().slice(0, 50)
        : 'default';
    return generateCacheKey(data, `mesh:${pathKey}`);
}
// Aggressive caching functions using WeakMap for memory efficiency
/**
 * Get cached geography data using WeakMap for object-based keys
 */
function getCachedGeographyData(geographyObject) {
    const cached = weakMapCaches.geographyDataCache.get(geographyObject);
    if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
        return {
            features: cached.features,
            mesh: cached.mesh,
        };
    }
    return null;
}
/**
 * Cache geography data using WeakMap
 */
function cacheGeographyData(geographyObject, features, mesh) {
    weakMapCaches.geographyDataCache.set(geographyObject, {
        features,
        mesh: mesh,
        timestamp: Date.now(),
    });
}
/**
 * Get cached prepared features using WeakMap
 */
function getCachedPreparedFeaturesWeakMap(geographyObject, pathFunctionString) {
    const cached = weakMapCaches.preparedFeaturesCache.get(geographyObject);
    if (cached &&
        cached.pathFunction === pathFunctionString &&
        Date.now() - cached.timestamp < CACHE_CONFIG.TTL) {
        return cached.prepared;
    }
    return null;
}
/**
 * Cache prepared features using WeakMap
 */
function cachePreparedFeaturesWeakMap(geographyObject, prepared, pathFunctionString) {
    weakMapCaches.preparedFeaturesCache.set(geographyObject, {
        prepared,
        pathFunction: pathFunctionString,
        timestamp: Date.now(),
    });
}

// React 19 resource preloading utilities for geography data
// Track preloaded URLs to avoid duplicate preloads
const preloadedUrls = new Set();
/**
 * Preload geography resources for better performance
 * Only preloads if the resource will be used soon
 */
function preloadGeography(url, immediate = false) {
    if (typeof url !== 'string' || !url) {
        return;
    }
    // Avoid duplicate preloads
    if (preloadedUrls.has(url)) {
        return;
    }
    try {
        const parsedUrl = new URL(url);
        // Always prefetch DNS and preconnect (lightweight operations)
        reactDom.prefetchDNS(parsedUrl.origin);
        reactDom.preconnect(parsedUrl.origin);
        // Only preload the actual resource if immediate or in production
        const shouldPreloadResource = immediate ||
            (typeof process !== 'undefined' && process.env.NODE_ENV === 'production');
        if (shouldPreloadResource) {
            reactDom.preload(url, {
                as: 'fetch',
                crossOrigin: 'anonymous', // Most geography APIs support CORS
            });
            preloadedUrls.add(url);
        }
    }
    catch (error) {
        // Silently handle invalid URLs in development only
        if (typeof process !== 'undefined' &&
            process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.warn('Failed to preload geography resource:', error);
        }
    }
}

function useGeographies({ geography, parseGeographies, }) {
    const { path } = useMapContext();
    const [loadedData, setLoadedData] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(false);
    // Handle string URLs with traditional async loading
    React.useEffect(() => {
        if (isString(geography)) {
            setIsLoading(true);
            devTools.debugGeographyLoading(geography, 'start');
            // Preload immediately before fetching to minimize the gap
            preloadGeography(geography);
            fetchGeographiesCache(geography)
                .then((data) => {
                devTools.debugGeographyLoading(geography, 'success', data);
                setLoadedData(data);
                setIsLoading(false);
            })
                .catch((error) => {
                devTools.debugGeographyLoading(geography, 'error', error);
                setIsLoading(false);
            });
        }
        else {
            setLoadedData(geography);
            setIsLoading(false);
        }
    }, [geography]);
    // Granular memoization for expensive operations
    // Memoize feature extraction with aggressive caching
    const rawFeatures = React.useMemo(() => {
        if (isLoading || !loadedData)
            return [];
        // Try WeakMap cache first for object-based geography data
        if (loadedData &&
            typeof loadedData === 'object' &&
            !Array.isArray(loadedData)) {
            const weakMapCached = getCachedGeographyData(loadedData);
            if (weakMapCached) {
                return weakMapCached.features;
            }
        }
        // Fall back to LRU cache
        const cacheKey = generateFeaturesCacheKey(loadedData, parseGeographies);
        const cached = getCachedFeatures(cacheKey);
        if (cached) {
            return cached;
        }
        // Extract features
        const features = getFeatures(loadedData, parseGeographies);
        // Cache in both systems
        cacheFeatures(cacheKey, features);
        if (loadedData &&
            typeof loadedData === 'object' &&
            !Array.isArray(loadedData)) {
            const mesh = getMesh(loadedData);
            cacheGeographyData(loadedData, features, mesh);
        }
        return features;
    }, [loadedData, isLoading, parseGeographies]);
    // Memoize mesh extraction separately
    const rawMesh = React.useMemo(() => {
        if (isLoading || !loadedData)
            return null;
        return getMesh(loadedData);
    }, [loadedData, isLoading]);
    // Memoize prepared features with aggressive caching (path generation is expensive)
    const preparedGeographies = React.useMemo(() => {
        if (rawFeatures.length === 0)
            return [];
        // Try WeakMap cache first if we have the original geography object
        if (loadedData &&
            typeof loadedData === 'object' &&
            !Array.isArray(loadedData)) {
            const pathFunctionString = path.toString().slice(0, 100);
            const weakMapCached = getCachedPreparedFeaturesWeakMap(loadedData, pathFunctionString);
            if (weakMapCached) {
                return weakMapCached;
            }
        }
        // Fall back to LRU cache
        const cacheKey = generatePreparedFeaturesCacheKey(rawFeatures, path);
        const cached = getCachedPreparedFeatures(cacheKey);
        if (cached) {
            return cached;
        }
        // Generate prepared features
        const prepared = prepareFeatures(rawFeatures, path);
        // Cache in both systems
        cachePreparedFeatures(cacheKey, prepared);
        if (loadedData &&
            typeof loadedData === 'object' &&
            !Array.isArray(loadedData)) {
            const pathFunctionString = path.toString().slice(0, 100);
            cachePreparedFeaturesWeakMap(loadedData, prepared, pathFunctionString);
        }
        return prepared;
    }, [rawFeatures, path, loadedData]);
    // Memoize prepared mesh with caching (path generation for borders/outline)
    const preparedMeshData = React.useMemo(() => {
        if (!rawMesh)
            return { outline: '', borders: '' };
        const cacheKey = generateMeshCacheKey(loadedData, path);
        const cached = getCachedMeshData(cacheKey);
        if (cached) {
            return cached;
        }
        const prepared = prepareMesh(rawMesh.outline || null, rawMesh.borders || null, path);
        const result = {
            outline: prepared.outline || '',
            borders: prepared.borders || '',
        };
        cacheMeshData(cacheKey, result);
        return result;
    }, [rawMesh, path, loadedData]);
    // Final memoized result
    return React.useMemo(() => {
        return {
            geographies: preparedGeographies,
            outline: preparedMeshData.outline,
            borders: preparedMeshData.borders,
        };
    }, [preparedGeographies, preparedMeshData]);
}

function DefaultErrorFallback(error, retry) {
    return (jsxRuntime.jsx("div", { className: "rsm-error-boundary", role: "alert", children: jsxRuntime.jsxs("div", { className: "rsm-error-content", children: [jsxRuntime.jsx("h3", { className: "rsm-error-title", children: "Failed to load geography data" }), jsxRuntime.jsx("p", { className: "rsm-error-message", children: error.message }), jsxRuntime.jsx("button", { onClick: retry, className: "rsm-retry-button", type: "button", "aria-label": "Retry loading geography data", children: "Retry Loading" })] }) }));
}
// Minimal class component for error boundary - React 19 still requires class components for error boundaries
// This is the smallest possible implementation to satisfy error boundary requirements
class MinimalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        // React 19 compliance: Use improved error reporting
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }
    render() {
        if (this.state.hasError && this.state.error) {
            return this.props.fallback(this.state.error);
        }
        return this.props.children;
    }
}
// React 19-compliant function component wrapper with minimal class component usage
function GeographyErrorBoundary({ children, fallback = DefaultErrorFallback, onError, }) {
    const [errorBoundaryKey, setErrorBoundaryKey] = React.useState(0);
    const handleError = React.useCallback((error, errorInfo) => {
        if (onError) {
            onError(error);
        }
        // React 19 compliance: Enhanced error logging for development
        if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error('GeographyErrorBoundary caught an error:', error, errorInfo);
        }
    }, [onError]);
    const retry = React.useCallback(() => {
        // Reset the error boundary by changing the key - React 19 compatible pattern
        setErrorBoundaryKey((prev) => prev + 1);
    }, []);
    const errorFallback = React.useCallback((error) => fallback(error, retry), [fallback, retry]);
    return (jsxRuntime.jsx(MinimalErrorBoundary, { fallback: errorFallback, onError: handleError, children: children }, errorBoundaryKey));
}

function OptimizedSuspense({ children, fallback, fallbackDelay = 150, // React 19 default with optimization
expectedLoadTime = 1000, priority = 'normal', retryCount = 3, onRetry, onLoadStart, onLoadEnd, }) {
    const [metrics, setMetrics] = React.useState({
        loadStartTime: 0,
        loadCount: 0,
        averageLoadTime: 0,
        retryAttempts: 0,
    });
    const [showFallback, setShowFallback] = React.useState(false);
    const [retryKey, setRetryKey] = React.useState(0);
    // React 19 optimization: Intelligent fallback timing based on priority
    const optimizedFallbackDelay = React.useMemo(() => {
        switch (priority) {
            case 'high':
                return Math.min(fallbackDelay, 100); // Show fallback quickly for high priority
            case 'low':
                return Math.max(fallbackDelay, 300); // Delay fallback for low priority
            default:
                return fallbackDelay;
        }
    }, [fallbackDelay, priority]);
    // Enhanced fallback with performance hints
    const enhancedFallback = React.useMemo(() => {
        if (!fallback) {
            return (jsxRuntime.jsx("div", { className: `rsm-suspense-fallback rsm-priority-${priority}`, role: "status", "aria-label": "Loading content", children: jsxRuntime.jsxs("div", { className: "rsm-loading-indicator", children: [jsxRuntime.jsx("span", { className: "rsm-loading-text", children: "Loading..." }), expectedLoadTime > 2000 && (jsxRuntime.jsx("span", { className: "rsm-loading-hint", children: "This may take a moment" }))] }) }));
        }
        return fallback;
    }, [fallback, priority, expectedLoadTime]);
    // Performance monitoring
    React.useEffect(() => {
        const startTime = performance.now();
        setMetrics((prev) => ({
            ...prev,
            loadStartTime: startTime,
            loadCount: prev.loadCount + 1,
        }));
        if (onLoadStart) {
            onLoadStart();
        }
        return () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            setMetrics((prev) => {
                const newAverageLoadTime = prev.loadCount > 0
                    ? (prev.averageLoadTime * (prev.loadCount - 1) + duration) /
                        prev.loadCount
                    : duration;
                return {
                    ...prev,
                    averageLoadTime: newAverageLoadTime,
                };
            });
            if (onLoadEnd) {
                onLoadEnd(duration);
            }
        };
    }, [retryKey, onLoadStart, onLoadEnd]);
    // Intelligent fallback timing
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setShowFallback(true);
        }, optimizedFallbackDelay);
        return () => {
            clearTimeout(timer);
            setShowFallback(false);
        };
    }, [optimizedFallbackDelay, retryKey]);
    // Retry mechanism with exponential backoff
    React.useCallback(() => {
        if (metrics.retryAttempts < retryCount) {
            setMetrics((prev) => ({
                ...prev,
                retryAttempts: prev.retryAttempts + 1,
            }));
            setRetryKey((prev) => prev + 1);
            if (onRetry) {
                onRetry();
            }
        }
    }, [metrics.retryAttempts, retryCount, onRetry]);
    // React 19 optimization: Conditional fallback rendering
    const conditionalFallback = showFallback ? enhancedFallback : null;
    return (jsxRuntime.jsx(React.Suspense, { fallback: conditionalFallback, children: children }, retryKey));
}
// Higher-order component for geography-specific optimizations
function GeographyOptimizedSuspense({ children, geographyUrl, ...props }) {
    // Geography-specific optimizations
    const geographyFallback = React.useMemo(() => (jsxRuntime.jsxs("div", { className: "rsm-geography-loading", role: "status", children: [jsxRuntime.jsxs("div", { className: "rsm-geography-skeleton", children: [jsxRuntime.jsx("div", { className: "rsm-skeleton-outline" }), jsxRuntime.jsx("div", { className: "rsm-skeleton-features" })] }), geographyUrl && (jsxRuntime.jsxs("div", { className: "rsm-loading-info", children: [jsxRuntime.jsx("span", { children: "Loading geography data..." }), jsxRuntime.jsx("small", { children: new URL(geographyUrl).hostname })] }))] })), [geographyUrl]);
    return (jsxRuntime.jsx(OptimizedSuspense, { ...props, fallback: geographyFallback, expectedLoadTime: 2000, priority: "high" // Geography is critical for map rendering
        , children: children }));
}

function Geographies({ geography, children, parseGeographies, className = '', errorBoundary = false, onGeographyError, fallback, ref, ...restProps }) {
    const { path, projection } = useMapContext();
    // Memoize the geography data fetching to prevent unnecessary re-fetches
    const geographyData = useGeographies({
        geography,
        ...(parseGeographies && { parseGeographies }),
    });
    // Memoize the children render function to prevent unnecessary re-renders
    const renderChildren = React.useCallback(() => {
        const { geographies, outline, borders } = geographyData;
        if (!geographies || geographies.length === 0) {
            return null;
        }
        return children({ geographies, outline, borders, path, projection });
    }, [geographyData, children, path, projection]);
    // Memoize the content component to prevent unnecessary re-renders
    const GeographiesContent = React.useMemo(() => {
        return () => renderChildren();
    }, [renderChildren]);
    // Build a consistent fallback element for Suspense
    const suspenseFallback = (jsxRuntime.jsx("text", { className: "rsm-loading-text", x: "50%", y: "50%", textAnchor: "middle", children: "Loading..." }));
    if (errorBoundary) {
        const errorBoundaryProps = {};
        if (onGeographyError) {
            errorBoundaryProps.onError = onGeographyError;
        }
        if (fallback) {
            errorBoundaryProps.fallback = fallback;
        }
        return (jsxRuntime.jsx("g", { ref: ref, className: `rsm-geographies ${className}`, ...restProps, children: jsxRuntime.jsx(GeographyErrorBoundary, { ...errorBoundaryProps, children: jsxRuntime.jsx(GeographyOptimizedSuspense, { fallback: suspenseFallback, ...(typeof geography === 'string' && { geographyUrl: geography }), priority: "high", expectedLoadTime: 2000, children: jsxRuntime.jsx(GeographiesContent, {}) }) }) }));
    }
    return (jsxRuntime.jsx("g", { ref: ref, className: `rsm-geographies ${className}`, ...restProps, children: jsxRuntime.jsx(GeographyOptimizedSuspense, { fallback: suspenseFallback, ...(typeof geography === 'string' && { geographyUrl: geography }), priority: "high", expectedLoadTime: 2000, children: jsxRuntime.jsx(GeographiesContent, {}) }) }));
}
Geographies.displayName = 'Geographies';
// Custom comparison function for memo to prevent unnecessary re-renders
const areGeographiesPropsEqual = (prevProps, nextProps) => {
    // Check if geography source has changed (most important check)
    if (prevProps.geography !== nextProps.geography) {
        return false;
    }
    // Check if parseGeographies function has changed
    if (prevProps.parseGeographies !== nextProps.parseGeographies) {
        return false;
    }
    // Check if children render function has changed
    if (prevProps.children !== nextProps.children) {
        return false;
    }
    // Check error boundary configuration
    if (prevProps.errorBoundary !== nextProps.errorBoundary) {
        return false;
    }
    if (prevProps.onGeographyError !== nextProps.onGeographyError) {
        return false;
    }
    if (prevProps.fallback !== nextProps.fallback) {
        return false;
    }
    // Check className
    if (prevProps.className !== nextProps.className) {
        return false;
    }
    // All other props are considered equal if we reach here
    return true;
};
var Geographies_default = React.memo(Geographies, areGeographiesPropsEqual);

/**
 * Calculates the centroid (center point) of a geographic feature
 * @param geography - GeoJSON feature
 * @returns Centroid coordinates or null if calculation fails
 */
function getGeographyCentroid(geography) {
    // Validate input
    if (!geography?.geometry) {
        return null;
    }
    // Use d3-geo's robust centroid calculation
    const centroid = d3Geo.geoCentroid(geography);
    // Validate centroid coordinates
    if (!centroid ||
        !isFinite(centroid[0]) ||
        !isFinite(centroid[1]) ||
        Math.abs(centroid[0]) > 180 ||
        Math.abs(centroid[1]) > 90) {
        return null;
    }
    return createCoordinates$1(centroid[0], centroid[1]);
}
/**
 * Calculates the bounding box of a geographic feature
 * @param geography - GeoJSON feature
 * @returns Bounding box as [southwest, northeast] coordinates or null if calculation fails
 */
function getGeographyBounds(geography) {
    // Validate input
    if (!geography?.geometry) {
        return null;
    }
    // Use d3-geo's robust bounds calculation
    const bounds = d3Geo.geoBounds(geography);
    // Validate bounds structure
    if (!bounds ||
        !Array.isArray(bounds) ||
        bounds.length !== 2 ||
        !Array.isArray(bounds[0]) ||
        !Array.isArray(bounds[1]) ||
        bounds[0].length !== 2 ||
        bounds[1].length !== 2) {
        return null;
    }
    const [southwest, northeast] = bounds;
    // Validate coordinate ranges
    if (!isFinite(southwest[0]) ||
        !isFinite(southwest[1]) ||
        !isFinite(northeast[0]) ||
        !isFinite(northeast[1]) ||
        Math.abs(southwest[0]) > 180 ||
        Math.abs(southwest[1]) > 90 ||
        Math.abs(northeast[0]) > 180 ||
        Math.abs(northeast[1]) > 90) {
        return null;
    }
    return [
        createCoordinates$1(southwest[0], southwest[1]),
        createCoordinates$1(northeast[0], northeast[1]),
    ];
}
/**
 * Extracts coordinates from different geometry types
 * @param geography - GeoJSON feature
 * @returns First available coordinate or null
 */
function getGeographyCoordinates(geography) {
    // Validate input
    if (!geography?.geometry) {
        return null;
    }
    const { geometry } = geography;
    switch (geometry.type) {
        case 'Point':
            if (geometry.coordinates &&
                Array.isArray(geometry.coordinates) &&
                geometry.coordinates.length >= 2 &&
                typeof geometry.coordinates[0] === 'number' &&
                typeof geometry.coordinates[1] === 'number') {
                const [lon, lat] = geometry.coordinates;
                return createCoordinates$1(lon, lat);
            }
            break;
        case 'LineString':
            if (geometry.coordinates &&
                Array.isArray(geometry.coordinates) &&
                geometry.coordinates.length > 0 &&
                Array.isArray(geometry.coordinates[0]) &&
                geometry.coordinates[0].length >= 2 &&
                typeof geometry.coordinates[0][0] === 'number' &&
                typeof geometry.coordinates[0][1] === 'number') {
                const [lon, lat] = geometry.coordinates[0];
                return createCoordinates$1(lon, lat);
            }
            break;
        case 'Polygon':
            if (geometry.coordinates &&
                Array.isArray(geometry.coordinates) &&
                geometry.coordinates.length > 0 &&
                Array.isArray(geometry.coordinates[0]) &&
                geometry.coordinates[0].length > 0 &&
                Array.isArray(geometry.coordinates[0][0]) &&
                geometry.coordinates[0][0].length >= 2 &&
                typeof geometry.coordinates[0][0][0] === 'number' &&
                typeof geometry.coordinates[0][0][1] === 'number') {
                const [lon, lat] = geometry.coordinates[0][0];
                return createCoordinates$1(lon, lat);
            }
            break;
        case 'MultiPoint':
            if (geometry.coordinates &&
                Array.isArray(geometry.coordinates) &&
                geometry.coordinates.length > 0 &&
                Array.isArray(geometry.coordinates[0]) &&
                geometry.coordinates[0].length >= 2 &&
                typeof geometry.coordinates[0][0] === 'number' &&
                typeof geometry.coordinates[0][1] === 'number') {
                const [lon, lat] = geometry.coordinates[0];
                return createCoordinates$1(lon, lat);
            }
            break;
        case 'MultiLineString':
            if (geometry.coordinates &&
                Array.isArray(geometry.coordinates) &&
                geometry.coordinates.length > 0 &&
                Array.isArray(geometry.coordinates[0]) &&
                geometry.coordinates[0].length > 0 &&
                Array.isArray(geometry.coordinates[0][0]) &&
                geometry.coordinates[0][0].length >= 2 &&
                typeof geometry.coordinates[0][0][0] === 'number' &&
                typeof geometry.coordinates[0][0][1] === 'number') {
                const [lon, lat] = geometry.coordinates[0][0];
                return createCoordinates$1(lon, lat);
            }
            break;
        case 'MultiPolygon':
            if (geometry.coordinates &&
                Array.isArray(geometry.coordinates) &&
                geometry.coordinates.length > 0 &&
                Array.isArray(geometry.coordinates[0]) &&
                geometry.coordinates[0].length > 0 &&
                Array.isArray(geometry.coordinates[0][0]) &&
                geometry.coordinates[0][0].length > 0 &&
                Array.isArray(geometry.coordinates[0][0][0]) &&
                geometry.coordinates[0][0][0].length >= 2 &&
                typeof geometry.coordinates[0][0][0][0] === 'number' &&
                typeof geometry.coordinates[0][0][0][1] === 'number') {
                const [lon, lat] = geometry.coordinates[0][0][0];
                return createCoordinates$1(lon, lat);
            }
            break;
        case 'GeometryCollection':
            if (geometry.geometries &&
                Array.isArray(geometry.geometries) &&
                geometry.geometries.length > 0 &&
                geometry.geometries[0]) {
                // Recursively try to get coordinates from first geometry
                return getGeographyCoordinates({
                    geometry: geometry.geometries[0],
                });
            }
            break;
        default:
            return null;
    }
    return null;
}
/**
 * Gets the best available coordinate representation for a geography
 * Tries centroid first, falls back to first coordinate
 * @param geography - GeoJSON feature
 * @returns Best available coordinates or null
 */
function getBestGeographyCoordinates(geography) {
    // Try centroid first (most accurate for polygons)
    const centroid = getGeographyCentroid(geography);
    if (centroid) {
        return centroid;
    }
    // Fall back to first available coordinate
    return getGeographyCoordinates(geography);
}
/**
 * Type guard to check if coordinates are valid
 * @param coords - Coordinates to validate
 * @returns True if coordinates are valid
 */
function isValidCoordinates(coords) {
    return (Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === 'number' &&
        typeof coords[1] === 'number' &&
        isFinite(coords[0]) &&
        isFinite(coords[1]) &&
        Math.abs(coords[0]) <= 180 &&
        Math.abs(coords[1]) <= 90);
}

function Geography({ geography, onClick, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, style = {}, className = '', ref, ...restProps }) {
    const [isPressed, setPressed] = React.useState(false);
    const [isFocused, setFocus] = React.useState(false);
    // Memoize geographic data calculation for performance
    const geographyEventData = React.useMemo(() => {
        return {
            geography,
            centroid: getGeographyCentroid(geography),
            bounds: getGeographyBounds(geography),
            coordinates: getBestGeographyCoordinates(geography),
        };
    }, [geography]);
    // Enhanced event handlers with geographic data
    const handleClick = React.useCallback((evt) => {
        if (onClick)
            onClick(evt, geographyEventData);
    }, [onClick, geographyEventData]);
    const handleMouseEnter = React.useCallback((evt) => {
        setFocus(true);
        if (onMouseEnter)
            onMouseEnter(evt, geographyEventData);
    }, [onMouseEnter, geographyEventData]);
    const handleMouseLeave = React.useCallback((evt) => {
        setFocus(false);
        if (isPressed)
            setPressed(false);
        if (onMouseLeave)
            onMouseLeave(evt, geographyEventData);
    }, [onMouseLeave, geographyEventData, isPressed]);
    const handleFocus = React.useCallback((evt) => {
        setFocus(true);
        if (onFocus)
            onFocus(evt, geographyEventData);
    }, [onFocus, geographyEventData]);
    const handleBlur = React.useCallback((evt) => {
        setFocus(false);
        if (isPressed)
            setPressed(false);
        if (onBlur)
            onBlur(evt, geographyEventData);
    }, [onBlur, geographyEventData, isPressed]);
    const handleMouseDown = React.useCallback((evt) => {
        setPressed(true);
        if (onMouseDown)
            onMouseDown(evt, geographyEventData);
    }, [onMouseDown, geographyEventData]);
    const handleMouseUp = React.useCallback((evt) => {
        setPressed(false);
        if (onMouseUp)
            onMouseUp(evt, geographyEventData);
    }, [onMouseUp, geographyEventData]);
    // Memoize current state calculation
    const currentState = React.useMemo(() => {
        return isPressed || isFocused
            ? isPressed
                ? 'pressed'
                : 'hover'
            : 'default';
    }, [isPressed, isFocused]);
    // Memoize the SVG path to prevent unnecessary recalculations
    const svgPath = React.useMemo(() => {
        return geography.svgPath;
    }, [geography]);
    // Memoize the current style to prevent unnecessary style recalculations
    const currentStyle = React.useMemo(() => {
        return style[currentState];
    }, [style, currentState]);
    return (jsxRuntime.jsx("path", { ref: ref, tabIndex: 0, className: `rsm-geography ${className}`, d: svgPath, onClick: handleClick, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, onFocus: handleFocus, onBlur: handleBlur, onMouseDown: handleMouseDown, onMouseUp: handleMouseUp, style: currentStyle, ...restProps }));
}
Geography.displayName = 'Geography';
// Custom comparison function for memo to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
    // Check if geography data has changed (most important check)
    if (prevProps.geography !== nextProps.geography) {
        return false;
    }
    // Check if the SVG path has changed (expensive to recalculate)
    const prevPath = prevProps.geography.svgPath;
    const nextPath = nextProps.geography.svgPath;
    if (prevPath !== nextPath) {
        return false;
    }
    // Check if event handlers have changed (shallow comparison)
    const eventHandlers = [
        'onMouseEnter',
        'onMouseLeave',
        'onMouseDown',
        'onMouseUp',
        'onFocus',
        'onBlur',
        'onClick',
    ];
    for (const handler of eventHandlers) {
        if (prevProps[handler] !== nextProps[handler]) {
            return false;
        }
    }
    // Check if style object has changed (deep comparison for style states)
    if (prevProps.style !== nextProps.style) {
        if (!prevProps.style || !nextProps.style) {
            return false;
        }
        const styleStates = ['default', 'hover', 'pressed', 'focused'];
        for (const state of styleStates) {
            const prevStyle = prevProps.style[state];
            const nextStyle = nextProps.style[state];
            if (prevStyle !== nextStyle) {
                // Shallow comparison of style objects
                if (!prevStyle || !nextStyle) {
                    return false;
                }
                const prevKeys = Object.keys(prevStyle);
                const nextKeys = Object.keys(nextStyle);
                if (prevKeys.length !== nextKeys.length) {
                    return false;
                }
                for (const key of prevKeys) {
                    if (prevStyle[key] !==
                        nextStyle[key]) {
                        return false;
                    }
                }
            }
        }
    }
    // Check className
    if (prevProps.className !== nextProps.className) {
        return false;
    }
    // All other props are considered equal if we reach here
    return true;
};
var Geography_default = React.memo(Geography, arePropsEqual);

function Graticule({ fill = 'transparent', stroke = 'currentcolor', step = createGraticuleStep(10, 10), className = '', ref, ...restProps }) {
    const { path } = useMapContext();
    const graticule = d3Geo.geoGraticule().step(step)();
    return (jsxRuntime.jsx("path", { ref: ref, d: path(graticule) || '', fill: fill, stroke: stroke, className: `rsm-graticule ${className}`, ...restProps }));
}
Graticule.displayName = 'Graticule';
var Graticule_default = React.memo(Graticule);

const ZoomPanContext = React.createContext(undefined);
const defaultValue = {
    x: 0,
    y: 0,
    k: 1,
    transformString: 'translate(0 0) scale(1)',
};
const ZoomPanProvider = ({ value = defaultValue, children, }) => {
    return jsxRuntime.jsx(ZoomPanContext, { value: value, children: children });
};
const useZoomPanContext = () => {
    const context = React.useContext(ZoomPanContext);
    if (context === undefined) {
        throw new Error('useZoomPanContext must be used within a ZoomPanProvider');
    }
    return context;
};

// Helper function to create branded coordinates
const createCoordinates = (lon, lat) => [
    lon,
    lat,
];
function useZoomBehavior({ mapRef, width, height, projection, scaleExtent, translateExtent, filterZoomEvent, onZoom, onZoomStart, onZoomEnd, onMove, bypassEvents, }) {
    const zoomRef = React.useRef(undefined);
    const [minZoom, maxZoom] = scaleExtent;
    const [a, b] = translateExtent;
    const [a1, a2] = a;
    const [b1, b2] = b;
    // Memoized zoom handler with concurrent features
    const handleZoom = React.useCallback((d3Event) => {
        if (bypassEvents.current)
            return;
        const { transform, sourceEvent } = d3Event;
        // Call the zoom callback
        if (onZoom) {
            onZoom({
                x: transform.x,
                y: transform.y,
                k: transform.k,
            }, sourceEvent);
        }
        // Immediate callback for responsive feel
        if (!onMove)
            return;
        const coords = getCoords(width, height, transform);
        const inverted = projection.invert?.(coords);
        if (inverted) {
            onMove({
                coordinates: createCoordinates(inverted[0], inverted[1]),
                zoom: transform.k,
            }, d3Event.sourceEvent || d3Event);
        }
    }, [onZoom, onMove, width, height, projection, bypassEvents]);
    React.useEffect(() => {
        if (!mapRef.current)
            return;
        const svg = d3Selection.select(mapRef.current);
        function handleZoomStart(d3Event) {
            if (!onZoomStart || bypassEvents.current)
                return;
            const coords = getCoords(width, height, d3Event.transform);
            const inverted = projection.invert?.(coords);
            if (inverted) {
                onZoomStart({
                    coordinates: createCoordinates(inverted[0], inverted[1]),
                    zoom: d3Event.transform.k,
                }, d3Event.sourceEvent || d3Event);
            }
        }
        function handleZoomEnd(d3Event) {
            if (bypassEvents.current) {
                bypassEvents.current = false;
                return;
            }
            const coords = getCoords(width, height, d3Event.transform);
            const inverted = projection.invert?.(coords);
            if (inverted) {
                const [x, y] = inverted;
                if (!onZoomEnd)
                    return;
                onZoomEnd({ coordinates: createCoordinates(x, y), zoom: d3Event.transform.k }, d3Event.sourceEvent || d3Event);
            }
        }
        function filterFunc(d3Event) {
            if (filterZoomEvent && d3Event) {
                return filterZoomEvent(d3Event.sourceEvent || d3Event);
            }
            return d3Event
                ? !d3Event.sourceEvent?.ctrlKey && !d3Event.sourceEvent?.button
                : false;
        }
        const zoomBehavior = d3Zoom.zoom()
            .filter(filterFunc)
            .scaleExtent([minZoom, maxZoom])
            .translateExtent([
            [a1, a2],
            [b1, b2],
        ])
            .on('start', handleZoomStart)
            .on('zoom', handleZoom)
            .on('end', handleZoomEnd);
        zoomRef.current = zoomBehavior;
        svg.call(zoomBehavior);
    }, [
        width,
        height,
        a1,
        a2,
        b1,
        b2,
        minZoom,
        maxZoom,
        projection,
        onZoomStart,
        onMove,
        onZoomEnd,
        filterZoomEvent,
        handleZoom,
        mapRef,
        bypassEvents,
    ]);
    return {
        zoomRef,
        handleZoom,
    };
}

function usePanBehavior({ mapRef, zoomRef, width, height, projection, center, zoom, bypassEvents, onPositionChange, startTransition, }) {
    const lastPosition = React.useRef({ x: 0, y: 0, k: 1 });
    const programmaticMove = React.useCallback((newCenter, newZoom) => {
        const [lon, lat] = newCenter;
        const coords = projection([lon, lat]);
        if (!coords || !mapRef.current || !zoomRef.current)
            return;
        const x = coords[0] * newZoom;
        const y = coords[1] * newZoom;
        const svg = d3Selection.select(mapRef.current);
        bypassEvents.current = true;
        // Use transition for smooth programmatic zoom/pan changes
        startTransition(() => {
            if (zoomRef.current) {
                svg.call(zoomRef.current.transform, d3Zoom.zoomIdentity
                    .translate(width / 2 - x, height / 2 - y)
                    .scale(newZoom));
            }
            const newPosition = { x: width / 2 - x, y: height / 2 - y, k: newZoom };
            if (onPositionChange) {
                onPositionChange(newPosition);
            }
        });
        lastPosition.current = { x: lon, y: lat, k: newZoom };
    }, [
        projection,
        mapRef,
        zoomRef,
        bypassEvents,
        startTransition,
        width,
        height,
        onPositionChange,
    ]);
    React.useEffect(() => {
        const [lon, lat] = center;
        if (lon === lastPosition.current.x &&
            lat === lastPosition.current.y &&
            zoom === lastPosition.current.k)
            return;
        programmaticMove(center, zoom);
    }, [
        center,
        zoom,
        width,
        height,
        projection,
        startTransition,
        programmaticMove,
    ]);
    return {
        lastPosition,
        programmaticMove,
    };
}

function useDeferredPosition({ initialPosition = { x: 0, y: 0, k: 1 }, transitionPriority = 'normal', // Reserved for future React 19 scheduler integration
deferredUpdateThreshold = 16, // 60fps threshold
 } = {}) {
    // React 19 concurrent features with optimizations
    const [isPending, startTransition] = React.useTransition();
    // Track update frequency for performance optimization
    const [updateCount, setUpdateCount] = React.useState(0);
    const [lastUpdateTime, setLastUpdateTime] = React.useState(0);
    const [position, setPosition] = React.useState(initialPosition);
    // Optimistic updates for immediate UI feedback during interactions
    const [optimisticPosition, setOptimisticPosition] = React.useOptimistic(position, (_currentPosition, optimisticUpdate) => optimisticUpdate);
    // React 19 optimization: Smart deferred value with performance hints
    const smoothPosition = React.useDeferredValue(optimisticPosition, initialPosition);
    // Check if the deferred value is actually deferred (performance indicator)
    const isDeferred = smoothPosition !== optimisticPosition;
    // Optimized transform string calculation with memoization
    const transformString = React.useMemo(() => {
        // Use the most appropriate position based on interaction state
        const activePosition = optimisticPosition.dragging
            ? optimisticPosition
            : smoothPosition;
        return `translate(${activePosition.x} ${activePosition.y}) scale(${activePosition.k})`;
    }, [smoothPosition, optimisticPosition]);
    // Enhanced setPosition with performance tracking and batching
    const enhancedSetPosition = React.useCallback((newPosition) => {
        const now = performance.now();
        const timeSinceLastUpdate = now - lastUpdateTime;
        setUpdateCount((prev) => prev + 1);
        setLastUpdateTime(now);
        // React 19 optimization: Batch rapid updates based on threshold
        if (timeSinceLastUpdate < deferredUpdateThreshold) {
            // For rapid updates, use transition to prevent blocking
            startTransition(() => {
                setPosition(newPosition);
            });
        }
        else {
            // For slower updates, update immediately
            setPosition(newPosition);
        }
    }, [lastUpdateTime, deferredUpdateThreshold, startTransition]);
    // Enhanced optimistic position setter with validation
    const enhancedSetOptimisticPosition = React.useCallback((newPosition) => {
        // Validate position bounds to prevent invalid optimistic updates
        const validatedPosition = {
            ...newPosition,
            k: Math.max(0.1, Math.min(10, newPosition.k)), // Reasonable zoom bounds
        };
        startTransition(() => {
            setOptimisticPosition(validatedPosition);
        });
    }, [setOptimisticPosition, startTransition]);
    return {
        position,
        smoothPosition,
        optimisticPosition,
        setPosition: enhancedSetPosition,
        setOptimisticPosition: enhancedSetOptimisticPosition,
        isPending,
        startTransition,
        transformString,
        isDeferred,
        updateCount,
    };
}

function useZoomPan({ center, filterZoomEvent, onMoveStart, onMoveEnd, onMove, translateExtent = createTranslateExtent(createCoordinates$1(-Infinity, -Infinity), createCoordinates$1(Infinity, Infinity)), scaleExtent = createScaleExtent(1, 8), zoom = 1, }) {
    const { width, height, projection } = useMapContext();
    // Defer expensive calculations for smooth rendering with initialValue for better UX
    const deferredCenter = React.useDeferredValue(center, createCoordinates$1(0, 0));
    const deferredZoom = React.useDeferredValue(zoom, 1);
    const mapRef = React.useRef(null);
    const bypassEvents = React.useRef(false);
    // Use the focused hooks with optimistic updates
    const { smoothPosition, setPosition, setOptimisticPosition, isPending, startTransition, transformString, } = useDeferredPosition();
    const zoomBehaviorProps = {
        mapRef,
        width,
        height,
        projection,
        scaleExtent,
        translateExtent,
        onZoomStart: onMoveStart,
        onZoomEnd: onMoveEnd,
        onMove,
        bypassEvents,
        onZoom: (transform, sourceEvent) => {
            const newPosition = {
                x: transform.x,
                y: transform.y,
                k: transform.k,
                dragging: sourceEvent,
            };
            // Immediate optimistic update for responsive feel
            setOptimisticPosition(newPosition);
            // Use transition for non-blocking position updates
            startTransition(() => {
                setPosition(newPosition);
            });
        },
        ...(filterZoomEvent && { filterZoomEvent }),
    };
    const { zoomRef } = useZoomBehavior(zoomBehaviorProps);
    usePanBehavior({
        mapRef,
        zoomRef,
        width,
        height,
        projection,
        center: deferredCenter,
        zoom: deferredZoom,
        bypassEvents,
        onPositionChange: (newPosition) => {
            setPosition(newPosition);
        },
        startTransition,
    });
    return {
        mapRef,
        position: smoothPosition,
        transformString,
        isPending,
    };
}

// Zoom/Pan loading indicator for smooth transitions
function ZoomPanIndicator({ isPending, className = '', }) {
    if (!isPending)
        return null;
    return (jsxRuntime.jsx("div", { className: `rsm-zoom-pan-indicator ${className}`, "aria-live": "polite", children: jsxRuntime.jsx("div", { className: "rsm-zoom-pan-spinner", children: jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 20 20", children: [jsxRuntime.jsx("circle", { cx: "10", cy: "10", r: "8", fill: "none", stroke: "#007acc", strokeWidth: "2", opacity: "0.3" }), jsxRuntime.jsx("circle", { cx: "10", cy: "10", r: "8", fill: "none", stroke: "#007acc", strokeWidth: "2", strokeLinecap: "round", strokeDasharray: "12.566", strokeDashoffset: "12.566", children: jsxRuntime.jsx("animate", { attributeName: "stroke-dashoffset", dur: "0.8s", values: "12.566;0", repeatCount: "indefinite" }) })] }) }) }));
}

// Type guard to check if props are SimpleZoomableGroupProps
function isSimpleProps(props) {
    return ('enableZoom' in props ||
        'enablePan' in props ||
        ('minZoom' in props && 'maxZoom' in props && !('scaleExtent' in props)));
}
function ZoomableGroup(props) {
    const { center = createCoordinates$1(0, 0), zoom = 1, filterZoomEvent, onMoveStart, onMove, onMoveEnd, className = '', children, ref, 
    // Extract ZoomableGroup-specific props to prevent React DOM warnings
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    minZoom, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    maxZoom, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    enableZoom, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    enablePan, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scaleExtent, 
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    translateExtent, ...restProps } = props;
    const { width, height } = useMapContext();
    // Handle both simple and complex API
    let finalMinZoom = 1;
    let finalMaxZoom = 8;
    let finalTranslateExtent;
    if (isSimpleProps(props)) {
        // Simple API - use provided values or defaults
        finalMinZoom = props.minZoom ?? 1;
        finalMaxZoom = props.maxZoom ?? 8;
        finalTranslateExtent =
            props.translateExtent ??
                (props.enablePan !== false
                    ? createTranslateExtent(createCoordinates$1(-Infinity, -Infinity), createCoordinates$1(Infinity, Infinity))
                    : undefined);
    }
    else {
        // Complex API - extract from conditional types
        const complexProps = props;
        finalMinZoom = complexProps.minZoom ?? 1;
        finalMaxZoom = complexProps.maxZoom ?? 8;
        finalTranslateExtent = complexProps.translateExtent;
    }
    const { mapRef, transformString, position, isPending } = useZoomPan({
        center,
        ...(filterZoomEvent && { filterZoomEvent }),
        ...(onMoveStart && { onMoveStart }),
        ...(onMove && { onMove }),
        ...(onMoveEnd && { onMoveEnd }),
        scaleExtent: createScaleExtent(finalMinZoom, finalMaxZoom),
        ...(finalTranslateExtent && { translateExtent: finalTranslateExtent }),
        zoom,
    });
    return (jsxRuntime.jsx(ZoomPanProvider, { value: { x: position.x, y: position.y, k: position.k, transformString }, children: jsxRuntime.jsxs("g", { ref: mapRef, children: [jsxRuntime.jsx("rect", { width: width, height: height, fill: "transparent" }), jsxRuntime.jsx("g", { ref: ref, transform: transformString, className: `rsm-zoomable-group ${className}`, ...restProps, children: children }), jsxRuntime.jsx(ZoomPanIndicator, { isPending: isPending, className: "rsm-zoom-pan-overlay" })] }) }));
}
ZoomableGroup.displayName = 'ZoomableGroup';

function Sphere({ id = 'rsm-sphere', fill = 'transparent', stroke = 'currentcolor', strokeWidth = 0.5, className = '', ref, ...restProps }) {
    const { path } = useMapContext();
    const spherePath = React.useMemo(() => path({ type: 'Sphere' }), [path]);
    return (jsxRuntime.jsxs(React.Fragment, { children: [jsxRuntime.jsx("defs", { children: jsxRuntime.jsx("clipPath", { id: id, children: jsxRuntime.jsx("path", { d: spherePath || '' }) }) }), jsxRuntime.jsx("path", { ref: ref, d: spherePath || '', fill: fill, stroke: stroke, strokeWidth: strokeWidth, style: { pointerEvents: 'none' }, className: `rsm-sphere ${className}`, ...restProps })] }));
}
Sphere.displayName = 'Sphere';
var Sphere_default = React.memo(Sphere);

function Marker({ coordinates, children, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp, onFocus, onBlur, style = {}, className = '', ref, ...restProps }) {
    const { projection } = useMapContext();
    const [isPressed, setPressed] = React.useState(false);
    const [isFocused, setFocus] = React.useState(false);
    // Memoize event handlers to prevent unnecessary re-renders
    const handleMouseEnter = React.useCallback((evt) => {
        setFocus(true);
        if (onMouseEnter)
            onMouseEnter(evt);
    }, [onMouseEnter]);
    const handleMouseLeave = React.useCallback((evt) => {
        setFocus(false);
        if (isPressed)
            setPressed(false);
        if (onMouseLeave)
            onMouseLeave(evt);
    }, [onMouseLeave, isPressed]);
    const handleFocus = React.useCallback((evt) => {
        setFocus(true);
        if (onFocus)
            onFocus(evt);
    }, [onFocus]);
    const handleBlur = React.useCallback((evt) => {
        setFocus(false);
        if (isPressed)
            setPressed(false);
        if (onBlur)
            onBlur(evt);
    }, [onBlur, isPressed]);
    const handleMouseDown = React.useCallback((evt) => {
        setPressed(true);
        if (onMouseDown)
            onMouseDown(evt);
    }, [onMouseDown]);
    const handleMouseUp = React.useCallback((evt) => {
        setPressed(false);
        if (onMouseUp)
            onMouseUp(evt);
    }, [onMouseUp]);
    // Memoize projection calculation to prevent unnecessary recalculations
    const projectedCoords = React.useMemo(() => {
        return projection(coordinates);
    }, [projection, coordinates]);
    // Memoize current state calculation
    const currentState = React.useMemo(() => {
        return isPressed || isFocused
            ? isPressed
                ? 'pressed'
                : 'hover'
            : 'default';
    }, [isPressed, isFocused]);
    // Memoize current style to prevent unnecessary style recalculations
    const currentStyle = React.useMemo(() => {
        return style?.[currentState];
    }, [style, currentState]);
    // Memoize transform string (only if coordinates exist)
    const transform = React.useMemo(() => {
        if (!projectedCoords)
            return '';
        const [x, y] = projectedCoords;
        return `translate(${x}, ${y})`;
    }, [projectedCoords]);
    if (!projectedCoords) {
        return null;
    }
    return (jsxRuntime.jsx("g", { ref: ref, transform: transform, className: `rsm-marker ${className}`, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, onFocus: handleFocus, onBlur: handleBlur, onMouseDown: handleMouseDown, onMouseUp: handleMouseUp, style: currentStyle, ...restProps, children: children }));
}
Marker.displayName = 'Marker';
var Marker_default = React.memo(Marker);

function Line({ from = [0, 0], to = [0, 0], coordinates, stroke = 'currentcolor', strokeWidth = 3, fill = 'transparent', className = '', ref, ...restProps }) {
    const { path } = useMapContext();
    const lineData = {
        type: 'LineString',
        coordinates: coordinates || [from, to],
    };
    return (jsxRuntime.jsx("path", { ref: ref, d: path(lineData) || '', className: `rsm-line ${className}`, stroke: stroke, strokeWidth: strokeWidth, fill: fill, ...restProps }));
}
Line.displayName = 'Line';

function Annotation({ subject, children, connectorProps, dx = 30, dy = 30, curve = 0, className = '', ref, ...restProps }) {
    const { projection } = useMapContext();
    const projectedCoords = projection(subject);
    if (!projectedCoords) {
        return null;
    }
    const [x, y] = projectedCoords;
    const connectorPath = createConnectorPath([x, y], [x + dx, y + dy], curve);
    return (jsxRuntime.jsxs("g", { ref: ref, transform: `translate(${x + dx}, ${y + dy})`, className: `rsm-annotation ${className}`, ...restProps, children: [jsxRuntime.jsx("path", { d: connectorPath, fill: "transparent", stroke: "#000", ...connectorProps }), children] }));
}
Annotation.displayName = 'Annotation';

exports.Annotation = Annotation;
exports.ComposableMap = ComposableMap$1;
exports.Geographies = Geographies_default;
exports.Geography = Geography_default;
exports.GeographyErrorBoundary = GeographyErrorBoundary;
exports.Graticule = Graticule_default;
exports.Line = Line;
exports.MapContext = MapContext;
exports.MapProvider = MapProvider;
exports.MapWithMetadata = MapWithMetadata_default;
exports.Marker = Marker_default;
exports.Sphere = Sphere_default;
exports.ZoomPanContext = ZoomPanContext;
exports.ZoomPanProvider = ZoomPanProvider;
exports.ZoomableGroup = ZoomableGroup;
exports.createCoordinates = createCoordinates$1;
exports.createGraticuleStep = createGraticuleStep;
exports.createLatitude = createLatitude;
exports.createLongitude = createLongitude;
exports.createPanConfig = createPanConfig;
exports.createParallels = createParallels;
exports.createScaleExtent = createScaleExtent;
exports.createTranslateExtent = createTranslateExtent;
exports.createZoomConfig = createZoomConfig;
exports.createZoomPanConfig = createZoomPanConfig;
exports.getBestGeographyCoordinates = getBestGeographyCoordinates;
exports.getGeographyBounds = getGeographyBounds;
exports.getGeographyCentroid = getGeographyCentroid;
exports.getGeographyCoordinates = getGeographyCoordinates;
exports.isValidCoordinates = isValidCoordinates;
exports.useGeographies = useGeographies;
exports.useMapContext = useMapContext;
exports.useZoomPan = useZoomPan;
exports.useZoomPanContext = useZoomPanContext;
//# sourceMappingURL=index.js.map
