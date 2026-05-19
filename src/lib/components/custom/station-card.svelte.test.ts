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

import StationCard from './station-card.svelte';

const { playerState, playStation, togglePlayback } = playerStateMock;

function createStation(overrides: Partial<AppStation> = {}): AppStation {
	return {
		id: 'station-1',
		name: 'Radio Pane FM',
		streamUrl: 'https://stream.example.com/live',
		favicon: null,
		country: 'United Kingdom',
		language: 'English',
		tags: ['indie', 'electronic'],
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
			country: 'United Kingdom',
			countrycode: 'GB',
			state: 'England',
			iso_3166_2: 'GB-ENG',
			tags: 'indie,electronic',
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

describe('StationCard', () => {
	beforeEach(() => {
		playerState.currentStation = null;
		playerState.isPlaying = false;
		playerState.isLoading = false;
		playerState.errorMessage = null;
		playStation.mockReset();
		togglePlayback.mockReset();
	});

	it('renders station metadata, tags, votes, and the default play action', () => {
		render(StationCard, {
			props: {
				station: createStation(),
				rank: 3
			}
		});

		expect(screen.getByText('Radio Pane FM')).toBeInTheDocument();
		expect(screen.getByText('United Kingdom · English')).toBeInTheDocument();
		expect(screen.getByText('#3')).toBeInTheDocument();
		expect(screen.getByText('1,234 votes')).toBeInTheDocument();
		expect(screen.getByText('indie')).toBeInTheDocument();
		expect(screen.getByText('electronic')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
	});

	it('starts playback for a different station', async () => {
		const user = userEvent.setup();
		const station = createStation();

		render(StationCard, {
			props: {
				station
			}
		});

		await user.click(screen.getByRole('button', { name: 'Play' }));

		expect(playStation).toHaveBeenCalledTimes(1);
		expect(playStation).toHaveBeenCalledWith(station);
		expect(togglePlayback).not.toHaveBeenCalled();
	});

	it('toggles playback for the current station and reflects the active label', async () => {
		const user = userEvent.setup();
		const station = createStation();
		playerState.currentStation = station;
		playerState.isPlaying = true;

		render(StationCard, {
			props: {
				station
			}
		});

		await user.click(screen.getByRole('button', { name: 'Pause' }));

		expect(togglePlayback).toHaveBeenCalledTimes(1);
		expect(playStation).not.toHaveBeenCalled();
	});

	it('shows the loading state for the current station', () => {
		const station = createStation();
		playerState.currentStation = station;
		playerState.isLoading = true;

		render(StationCard, {
			props: {
				station
			}
		});

		const button = screen.getByRole('button', { name: 'Loading...' });

		expect(button).toBeDisabled();
		expect(screen.getByText('Connecting...')).toBeInTheDocument();
	});

	it('shows the current-station error with a direct stream link', () => {
		const station = createStation();
		playerState.currentStation = station;
		playerState.errorMessage = 'Unable to start playback.';

		render(StationCard, {
			props: {
				station
			}
		});

		expect(screen.getByText('Unable to start playback.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Open stream directly' })).toHaveAttribute(
			'href',
			'https://stream.example.com/live'
		);
	});
});