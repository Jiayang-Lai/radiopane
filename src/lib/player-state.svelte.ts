import IcecastMetadataPlayer, {
	type IcyMetadata,
	type OggMetadata
} from 'icecast-metadata-player';
import { browser } from '$app/environment';
import { toast } from 'svelte-sonner';
import { normalizeAppStation, type AppStation } from '$lib/radio-browser';

type StreamMetadata = IcyMetadata & OggMetadata;

type PlaybackMode = 'with-metadata' | 'without-metadata';

type PlaybackController = {
	player: IcecastMetadataPlayer;
	audioElement: HTMLAudioElement;
	hasPlayed: boolean;
	mode: PlaybackMode;
	fallbackInFlight: boolean;
	station: AppStation;
	dispose: () => void;
};

export const CURRENT_STATION_STORAGE_KEY = 'radio-pane.current-station';

function persistCurrentStation(station: AppStation | null) {
	if (!browser) {
		return;
	}

	if (!station) {
		localStorage.removeItem(CURRENT_STATION_STORAGE_KEY);
		return;
	}

	localStorage.setItem(CURRENT_STATION_STORAGE_KEY, JSON.stringify(station));
}

function restoreCurrentStation(): AppStation | null {
	if (!browser) {
		return null;
	}

	const rawStation = localStorage.getItem(CURRENT_STATION_STORAGE_KEY);

	if (!rawStation) {
		return null;
	}

	try {
		return normalizeAppStation(JSON.parse(rawStation) as AppStation);
	} catch {
		localStorage.removeItem(CURRENT_STATION_STORAGE_KEY);
		return null;
	}
}

function setCurrentStation(station: AppStation | null) {
	playerState.currentStation = station;
	persistCurrentStation(station);
}

class PlayerState {
	currentStation = $state<AppStation | null>(restoreCurrentStation());
	isPlaying = $state(false);
	isLoading = $state(false);
	errorMessage = $state<string | null>(null);
	metadataTitle = $state<string | null>(null);
	metadataArtist = $state<string | null>(null);
	metadataUnavailable = $state(false);

	playback: PlaybackController | null = null;
}

export const playerState = new PlayerState();

function resetMetadata() {
	playerState.metadataTitle = null;
	playerState.metadataArtist = null;
	playerState.metadataUnavailable = false;
}

function splitStreamTitle(streamTitle?: string) {
	const normalizedTitle = streamTitle?.trim();

	if (!normalizedTitle) {
		return {
			title: null,
			artist: null
		};
	}

	const match = normalizedTitle.match(/^(.*?)\s+-\s+(.*)$/);

	if (!match) {
		return {
			title: normalizedTitle,
			artist: null
		};
	}

	return {
		artist: match[1]?.trim() || null,
		title: match[2]?.trim() || normalizedTitle
	};
}

function getMetadataPresentation(metadata: StreamMetadata) {
	const title = metadata.TITLE?.trim();
	const artist = metadata.ARTIST?.trim() || metadata.PERFORMER?.trim() || null;

	if (title || artist) {
		return {
			title: title || null,
			artist
		};
	}

	return splitStreamTitle(metadata.StreamTitle);
}

function buildPlaybackErrorMessage(message: string) {
	if (message === 'Unable to keep the stream connected') {
		return 'Connection lost.';
	}

	if (message === 'Unable to play stream') {
		return 'Unable to start playback.';
	}

	// Just return a user-friendly message without technical details. The toast will have a "Details" button to show the full error if available.
	return 'An error occurred during playback. (Highly likely a CORS issue with the stream source)';
}

function setErrorMessage(message: string, error?: Error) {
	const playbackErrorMessage = buildPlaybackErrorMessage(message);
	playerState.errorMessage = playbackErrorMessage;
	toast.error(playbackErrorMessage, {
		id: 'playback-error'
	});
}

async function unloadPlayback() {
	const playback = playerState.playback;

	if (!playback) {
		return;
	}

	playerState.playback = null;
	playback.dispose();

	try {
		await playback.player.stop();
	} catch {
		// Ignore shutdown errors when tearing down an old stream.
	}
}

async function fallbackToPlaybackWithoutMetadata(playback: PlaybackController) {
	if (playback.mode === 'without-metadata' || playback.fallbackInFlight) {
		return false;
	}

	playback.fallbackInFlight = true;
	await unloadPlayback();

	if (playerState.currentStation?.id !== playback.station.id) {
		return true;
	}

	resetMetadata();
	playerState.isLoading = true;
	playerState.isPlaying = false;
	playerState.errorMessage = null;
	playerState.metadataUnavailable = true;

	await startPlayback(createPlayback(playback.station, 'without-metadata'));
	return true;
}

function createPlayback(station: AppStation, mode: PlaybackMode = 'with-metadata') {
	let playback!: PlaybackController;

	const callbacks = {
		onLoad: () => {
			if (playerState.playback !== playback) {
				return;
			}

			playerState.isLoading = true;
		},
		onPlay: () => {
			if (playerState.playback !== playback) {
				return;
			}

			playback.hasPlayed = true;
			playerState.isLoading = false;
			playerState.isPlaying = true;
			playerState.errorMessage = null;
			playerState.metadataUnavailable = playback.mode === 'without-metadata';
		},
		onStop: () => {
			if (playerState.playback !== playback) {
				return;
			}

			playerState.isLoading = false;
			playerState.isPlaying = false;
		},
		onRetry: () => {
			if (playerState.playback !== playback) {
				return;
			}

			if (!playback.hasPlayed) {
				if (playback.mode === 'with-metadata') {
					void fallbackToPlaybackWithoutMetadata(playback);
					return;
				}

				playerState.isLoading = false;
				playerState.isPlaying = false;
				void playback.player.stop();
				return;
			}

			playerState.isLoading = true;
		},
		onRetryTimeout: () => {
			if (playerState.playback !== playback) {
				return;
			}

			playerState.isLoading = false;
			playerState.isPlaying = false;
			setErrorMessage('Unable to keep the stream connected');
		},
		onError: (message: string, error?: Error) => {
			if (playerState.playback !== playback) {
				return;
			}

			if (!playback.hasPlayed && playback.mode === 'with-metadata') {
				void fallbackToPlaybackWithoutMetadata(playback);
				return;
			}

			playerState.isLoading = false;
			playerState.isPlaying = false;
			setErrorMessage(message, error);
		}
	};

	const player =
		mode === 'with-metadata'
			? new IcecastMetadataPlayer(station.streamUrl, {
				metadataTypes: ['icy', 'ogg'],
				onMetadata: (metadata: StreamMetadata) => {
					if (playerState.playback !== playback) {
						return;
					}

					const presentation = getMetadataPresentation(metadata);
					playerState.metadataTitle = presentation.title;
					playerState.metadataArtist = presentation.artist;
					playerState.metadataUnavailable = false;
				},
				...callbacks
			})
			: new IcecastMetadataPlayer(station.streamUrl, {
				metadataTypes: [],
				...callbacks
			});
	const audioElement = player.audioElement;
	const handlePause = () => {
		if (playerState.playback !== playback) {
			return;
		}

		playerState.isLoading = false;
		playerState.isPlaying = false;
	};

	audioElement.addEventListener('pause', handlePause);

	playback = {
		player,
		audioElement,
		hasPlayed: false,
		mode,
		fallbackInFlight: false,
		station,
		dispose: () => {
			audioElement.removeEventListener('pause', handlePause);
		}
	};

	playerState.playback = playback;
	return playback;
}

export function playStation(station: AppStation) {
	void playStationInternal(station);
}

async function playStationInternal(station: AppStation) {
	if (!station.streamUrl) {
		setCurrentStation(station);
		playerState.isLoading = false;
		playerState.isPlaying = false;
		playerState.errorMessage = 'This station does not have a playable stream URL.';
		resetMetadata();
		return;
	}

	if (playerState.currentStation?.id === station.id && playerState.playback) {
		playerState.errorMessage = null;
		playerState.isLoading = true;
		await startPlayback(playerState.playback);
		return;
	}

	await unloadPlayback();
	setCurrentStation(station);
	playerState.isPlaying = false;
	playerState.isLoading = true;
	playerState.errorMessage = null;
	resetMetadata();

	await startPlayback(createPlayback(station));
}

export function togglePlayback() {
	void togglePlaybackInternal();
}

async function togglePlaybackInternal() {
	if (!playerState.currentStation) {
		return;
	}

	if (!playerState.playback) {
		await playStationInternal(playerState.currentStation);
		return;
	}

	if (playerState.isPlaying) {
		playerState.playback.audioElement.pause();
		return;
	}

	playerState.isLoading = true;
	playerState.errorMessage = null;
	await startPlayback(playerState.playback);
}

export function stopPlayback() {
	void stopPlaybackInternal();
}

async function stopPlaybackInternal() {
	await unloadPlayback();
	setCurrentStation(null);
	playerState.isLoading = false;
	playerState.isPlaying = false;
	playerState.errorMessage = null;
	resetMetadata();
}

async function startPlayback(playback: PlaybackController) {
	try {
		await playback.player.play();
	} catch (error) {
		if (playerState.playback !== playback) {
			return;
		}

		if (!playback.hasPlayed && playback.mode === 'with-metadata') {
			const recovered = await fallbackToPlaybackWithoutMetadata(playback);
			if (recovered) {
				return;
			}
		}

		playerState.isLoading = false;
		playerState.isPlaying = false;
		setErrorMessage('Unable to play stream', error instanceof Error ? error : undefined);
	}
}