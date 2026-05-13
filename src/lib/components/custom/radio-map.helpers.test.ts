import { describe, expect, it } from 'vitest';
import type { AppStation } from '$lib/radio-browser';
import {
	buildSelectedCluster,
	buildStationFeatures,
	clusterDiameter,
	getStationTooltipLabel,
	markerRadius,
	type StationFeature
} from './radio-map.helpers';

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

describe('radio-map helpers', () => {
	it('computes marker radius thresholds', () => {
		expect(markerRadius(20)).toBe(5);
		expect(markerRadius(50)).toBe(6);
		expect(markerRadius(250)).toBe(7);
		expect(markerRadius(1000)).toBe(9);
	});

	it('computes cluster diameter thresholds', () => {
		expect(clusterDiameter(5)).toBe(38);
		expect(clusterDiameter(25)).toBe(44);
		expect(clusterDiameter(100)).toBe(50);
		expect(clusterDiameter(500)).toBe(58);
	});

	it('formats tooltips for exact and approximate stations', () => {
		const exactStation = createStation({ name: 'Exact FM' });
		const approximateStation = createStation({
			name: 'Approx FM',
			radioBrowser: {
				...createStation().radioBrowser,
				name: 'Approx FM',
				geo_is_approximate: true,
				geo_source: 'state-centroid'
			}
		});

		expect(getStationTooltipLabel(exactStation)).toBe('Exact FM');
		expect(getStationTooltipLabel(approximateStation)).toBe(
			'Approx FM (approximate: Canada · Ontario · CA-ON)'
		);
	});

	it('builds station features only for stations with coordinates', () => {
		const features = buildStationFeatures([
			createStation({ id: 'with-geo' }),
			createStation({
				id: 'without-geo',
				radioBrowser: {
					...createStation().radioBrowser,
					stationuuid: 'without-geo',
					geo_lat: null,
					geo_long: null
				}
			})
		]);

		expect(features).toHaveLength(1);
		expect(features[0]?.properties.stationIndex).toBe(0);
		expect(features[0]?.geometry.coordinates).toEqual([-79.3832, 43.6532]);
	});

	it('builds selected cluster summaries from leaves', () => {
		const exactStation = createStation({ id: 'exact-1', name: 'Exact', votes: 50 });
		const approximateStation = createStation({
			id: 'approx-1',
			name: 'Approx',
			country: 'United States',
			language: 'Spanish',
			votes: 500,
			radioBrowser: {
				...createStation().radioBrowser,
				stationuuid: 'approx-1',
				name: 'Approx',
				country: 'United States',
				language: 'Spanish',
				votes: 500,
				geo_is_approximate: true,
				geo_source: 'country-centroid'
			}
		});
		const leaves: StationFeature[] = [
			{
				type: 'Feature',
				properties: { stationIndex: 0 },
				geometry: { type: 'Point', coordinates: [-79.3832, 43.6532] }
			},
			{
				type: 'Feature',
				properties: { stationIndex: 1 },
				geometry: { type: 'Point', coordinates: [-120, 37] }
			}
		];

		const cluster = buildSelectedCluster(leaves, [exactStation, approximateStation], 2);

		expect(cluster.stations.map((station) => station.name)).toEqual(['Approx', 'Exact']);
		expect(cluster.exactStations.map((station) => station.name)).toEqual(['Exact']);
		expect(cluster.approximateStations.map((station) => station.name)).toEqual(['Approx']);
		expect(cluster.countries).toEqual(['United States', 'Canada']);
		expect(cluster.languageCount).toBe(2);
	});
});