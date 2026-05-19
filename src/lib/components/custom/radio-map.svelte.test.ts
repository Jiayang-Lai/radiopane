import { render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { AppStation } from '$lib/radio-browser';

vi.mock('mode-watcher', () => ({
	mode: {
		current: 'light'
	}
}));

vi.mock('supercluster', () => ({
	default: class {
		load() {}
		getClusters() {
			return [];
		}
		getLeaves() {
			return [];
		}
		getClusterExpansionZoom() {
			return 6;
		}
	}
}));

vi.mock('$lib/components/custom/map-station-panel.svelte', async () => {
	const { default: TestDouble } = await import('./radio-map-panel.test-double.svelte');

	return {
		default: TestDouble
	};
});

vi.mock('leaflet', () => {
	const mapApi = {
		getZoom: () => 4,
		getMaxZoom: () => 18,
		flyTo: vi.fn(),
		fitBounds: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		remove: vi.fn(),
		getBounds: () => ({
			getWest: () => -180,
			getSouth: () => -60,
			getEast: () => 180,
			getNorth: () => 85
		})
	};

	const chainable = {
		on() {
			return this;
		},
		bindTooltip() {
			return this;
		},
		addTo() {
			return this;
		}
	};

	return {
		control: {
			zoom: () => ({
				addTo: vi.fn()
			})
		},
		latLng: (lat: number, lng: number) => ({ lat, lng }),
		latLngBounds: (...initial: Array<unknown>) => {
			const points: Array<unknown> = initial.flatMap((value) =>
				Array.isArray(value) ? value : [value]
			);

			return {
				extend(point: [number, number]) {
					points.push(point);
				},
				isValid() {
					return points.length > 0;
				},
				pad() {
					return this;
				}
			};
		},
		map: () => mapApi,
		tileLayer: () => ({
			addTo: () => ({ remove: vi.fn() })
		}),
		layerGroup: () => ({
			addTo: vi.fn(),
			clearLayers: vi.fn(),
			remove: vi.fn()
		}),
		divIcon: (options: unknown) => options,
		marker: () => ({ ...chainable }),
		circleMarker: () => ({ ...chainable })
	};
});

import RadioMap from './radio-map.svelte';

function createStation(overrides: Partial<AppStation> = {}): AppStation {
	return {
		id: 'station-1',
		name: 'Radio Pane FM',
		streamUrl: 'https://stream.example.com/live',
		favicon: null,
		country: 'Canada',
		language: 'English',
		tags: ['indie'],
		votes: 1234,
		radioBrowser: {
			changeuuid: 'change-1',
			stationuuid: 'station-1',
			serveruuid: null,
			name: 'Radio Pane FM',
			url: 'https://stream.example.com/live',
			url_resolved: 'https://stream.example.com/live',
			homepage: 'https://example.com',
			favicon: '',
			country: 'Canada',
			countrycode: 'CA',
			state: 'Ontario',
			iso_3166_2: 'CA-ON',
			tags: 'indie',
			languagecodes: 'en',
			votes: 1234,
			language: 'English',
			lastchangetime: '',
			lastchangetime_iso8601: '',
			codec: 'MP3',
			bitrate: 128,
			hls: 0,
			lastcheckok: 1,
			lastchecktime: '',
			lastchecktime_iso8601: '',
			lastcheckoktime: '',
			lastcheckoktime_iso8601: '',
			lastlocalchecktime: '',
			lastlocalchecktime_iso8601: '',
			clicktimestamp: '',
			clicktimestamp_iso8601: null,
			clickcount: 0,
			clicktrend: 0,
			ssl_error: 0,
			geo_lat: 43.6532,
			geo_long: -79.3832,
			geo_distance: null,
			geo_source: 'radio-browser',
			geo_is_approximate: false,
			has_extended_info: true
		},
		...overrides
	};
}

describe('RadioMap', () => {
	it('renders station count and initializes the map shell', async () => {
		render(RadioMap, {
			props: {
				stations: [createStation(), createStation({ id: 'station-2', name: 'Second Station' })]
			}
		});

		expect(screen.getByText('2 stations mapped')).toBeInTheDocument();
		expect(screen.getByLabelText('Loading map')).toBeInTheDocument();
		expect(screen.getByTestId('radio-map-panel-double')).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.queryByLabelText('Loading map')).not.toBeInTheDocument();
		});

		expect(screen.getByTestId('radio-map-panel-cluster')).toHaveTextContent('none');
		expect(screen.getByTestId('radio-map-panel-station')).toHaveTextContent('none');
	});
});