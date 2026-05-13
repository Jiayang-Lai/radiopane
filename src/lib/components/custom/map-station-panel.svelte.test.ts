import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppStation } from '$lib/radio-browser';

const playerStateMock = vi.hoisted(() => ({
	playerState: {
		currentStation: null as AppStation | null,
		isPlaying: false,
		isLoading: false,
		errorMessage: null as string | null
	},
	playStation: vi.fn(),
	togglePlayback: vi.fn()
}));

vi.mock('$lib/player-state.svelte.js', () => ({
	playerState: playerStateMock.playerState,
	playStation: playerStateMock.playStation,
	togglePlayback: playerStateMock.togglePlayback
}));

vi.mock('$lib/hooks/is-tailwind-breakpoint-up.svelte.js', () => ({
	IsTailwindBreakpointUp: class {
		current = true;
	}
}));

import MapStationPanel from './map-station-panel.svelte';

const { playerState, playStation, togglePlayback } = playerStateMock;

function createStation(overrides: Partial<AppStation> = {}): AppStation {
	return {
		id: 'station-1',
		name: 'Radio Pane FM',
		streamUrl: 'https://stream.example.com/live',
		favicon: null,
		country: 'Canada',
		language: 'English',
		tags: ['indie', 'electronic', 'synthwave', 'night'],
		votes: 1234,
		radioBrowser: {
			changeuuid: 'change-1',
			stationuuid: 'station-1',
			serveruuid: null,
			name: 'Radio Pane FM',
			url: 'https://stream.example.com/live',
			url_resolved: 'https://stream.example.com/live',
			homepage: 'https://example.com/station',
			favicon: '',
			country: 'Canada',
			countrycode: 'CA',
			state: 'Ontario',
			iso_3166_2: 'CA-ON',
			tags: 'indie,electronic,synthwave,night',
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

function createApproximateStation(id: string, name: string, source: 'state-centroid' | 'country-centroid' = 'state-centroid') {
	const station = createStation({
		id,
		name,
		votes: 432,
		radioBrowser: {
			...createStation().radioBrowser,
			stationuuid: id,
			name,
			votes: 432,
			geo_source: source,
			geo_is_approximate: true
		}
	});

	return station;
}

function createCluster(stations: AppStation[]) {
	return {
		pointCount: stations.length,
		stations,
		exactStations: stations.filter((station) => !station.radioBrowser.geo_is_approximate),
		approximateStations: stations.filter((station) => station.radioBrowser.geo_is_approximate),
		countries: [...new Set(stations.map((station) => station.country))],
		languageCount: new Set(stations.map((station) => station.language)).size
	};
}

describe('MapStationPanel', () => {
	beforeEach(() => {
		playerState.currentStation = null;
		playerState.isPlaying = false;
		playerState.isLoading = false;
		playerState.errorMessage = null;
		playStation.mockReset();
		togglePlayback.mockReset();
	});

	it('renders selected station details and starts playback for a new station', async () => {
		const user = userEvent.setup();
		const station = createApproximateStation('station-approx', 'Night Drive FM');

		render(MapStationPanel, {
			props: {
				selectedStation: station
			}
		});

		expect(screen.getByText('Selected station')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: 'Night Drive FM' })).toBeInTheDocument();
		expect(screen.getAllByText('Canada · English')).toHaveLength(2);
		expect(screen.getByText('Approximate location')).toBeInTheDocument();
		expect(
			screen.getByText('Approximate map location inferred from stations in the same state.')
		).toBeInTheDocument();
		expect(screen.getByText('Country: Canada · State: Ontario · ISO 3166-2: CA-ON')).toBeInTheDocument();
		expect(screen.getByText('indie')).toBeInTheDocument();
		expect(screen.getByText('night')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Open station homepage' })).toHaveAttribute(
			'href',
			'https://example.com/station'
		);

		await user.click(screen.getByRole('button', { name: 'Play station' }));

		expect(playStation).toHaveBeenCalledTimes(1);
		expect(playStation).toHaveBeenCalledWith(station);
		expect(togglePlayback).not.toHaveBeenCalled();
	});

	it('shows current-station playback states and toggles pause', async () => {
		const user = userEvent.setup();
		const station = createStation({ id: 'station-current', name: 'Current Station' });
		playerState.currentStation = station;
		playerState.isPlaying = true;
		playerState.errorMessage = 'Connection lost.';

		render(MapStationPanel, {
			props: {
				selectedStation: station
			}
		});

		expect(screen.getByText('Connection lost.')).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Pause station' }));

		expect(togglePlayback).toHaveBeenCalledTimes(1);
		expect(playStation).not.toHaveBeenCalled();
	});

	it('shows the loading state for the current selected station', () => {
		const station = createStation({ id: 'station-loading', name: 'Loading Station' });
		playerState.currentStation = station;
		playerState.isLoading = true;

		render(MapStationPanel, {
			props: {
				selectedStation: station
			}
		});

		expect(screen.getByRole('button', { name: 'Connecting...' })).toBeDisabled();
	});

	it('renders cluster previews with exact and inferred locations and focuses a station', async () => {
		const user = userEvent.setup();
		const exactStation = createStation({ id: 'exact-1', name: 'Exact One', votes: 1500 });
		const approximateStation = createApproximateStation('approx-1', 'Approx One');
		const onFocusPreviewStation = vi.fn();

		render(MapStationPanel, {
			props: {
				selectedCluster: createCluster([exactStation, approximateStation]),
				onFocusPreviewStation
			}
		});

		expect(screen.getByText('Cluster preview')).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '2 nearby stations' })).toBeInTheDocument();
		expect(screen.getByText('Exact locations')).toBeInTheDocument();
		expect(screen.getByText('Inferred locations')).toBeInTheDocument();
		expect(screen.getByText(/1 station in this cluster use inferred map locations\./)).toBeInTheDocument();
		expect(screen.getByText('Exact One')).toBeInTheDocument();
		expect(screen.getByText(/Inferred from state centroid/)).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /Exact One/ }));

		expect(onFocusPreviewStation).toHaveBeenCalledTimes(1);
		expect(onFocusPreviewStation).toHaveBeenCalledWith(exactStation);
	});

	it('renders all stations for large exact-only clusters', () => {
		const stations = Array.from({ length: 7 }, (_, index) =>
			createStation({
				id: `station-${index + 1}`,
				name: `Station ${index + 1}`,
				votes: 1000 - index
			})
		);

		render(MapStationPanel, {
			props: {
				selectedCluster: createCluster(stations)
			}
		});

		expect(screen.getByText('Station 7')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Show all 7' })).not.toBeInTheDocument();
	});
});