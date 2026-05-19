import { browser } from '$app/environment';
import {
	normalizeAppStation,
	normalizeStreamUrl,
	type AppStation,
	type RadioBrowserStation
} from '$lib/radio-browser';

export type CustomStationDraft = {
	name: string;
	streamUrl: string;
	favicon: string;
	homepage: string;
	country: string;
	language: string;
	tags: string;
};

export const CUSTOM_STATIONS_STORAGE_KEY = 'radio-pane.custom-stations';

function createStationId() {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}

	return `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createRadioBrowserFallback(id: string, draft: CustomStationDraft, tags: string[]): RadioBrowserStation {
	const streamUrl = normalizeStreamUrl(draft.streamUrl);

	return {
		changeuuid: id,
		stationuuid: id,
		serveruuid: null,
		name: draft.name.trim(),
		url: streamUrl,
		url_resolved: streamUrl,
		homepage: draft.homepage.trim(),
		favicon: draft.favicon.trim(),
		country: draft.country.trim() || 'Custom',
		countrycode: '',
		state: '',
		iso_3166_2: '',
		tags: tags.join(','),
		languagecodes: '',
		votes: 0,
		language: draft.language.trim() || 'Unknown language',
		lastchangetime: '',
		lastchangetime_iso8601: '',
		codec: '',
		bitrate: 0,
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
		geo_lat: null,
		geo_long: null,
		geo_distance: null,
		has_extended_info: false
	};
}

function normalizeTags(tags: string) {
	return tags
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean)
		.slice(0, 8);
}

function persistStations(stations: AppStation[]) {
	if (!browser) {
		return;
	}

	localStorage.setItem(CUSTOM_STATIONS_STORAGE_KEY, JSON.stringify(stations));
}

function normalizeStoredStation(station: AppStation): AppStation {
	return normalizeAppStation({
		...station,
		tags: Array.isArray(station.tags) ? station.tags.filter(Boolean).slice(0, 8) : []
	});
}

function dedupeStations(stations: AppStation[]) {
	const seenStationIds = new Set<string>();

	return stations.filter((station) => {
		if (seenStationIds.has(station.id)) {
			return false;
		}

		seenStationIds.add(station.id);
		return true;
	});
}

export function listCustomStations(): AppStation[] {
	if (!browser) {
		return [];
	}

	const rawStations = localStorage.getItem(CUSTOM_STATIONS_STORAGE_KEY);

	if (!rawStations) {
		return [];
	}

	try {
		const parsedStations = JSON.parse(rawStations) as AppStation[];

		return parsedStations
			.filter((station) => !!station?.id && !!station?.name && !!station?.streamUrl)
			.map(normalizeStoredStation);
	} catch {
		localStorage.removeItem(CUSTOM_STATIONS_STORAGE_KEY);
		return [];
	}
}

export function addCustomStation(draft: CustomStationDraft): AppStation[] {
	const id = createStationId();
	const tags = normalizeTags(draft.tags);
	const streamUrl = normalizeStreamUrl(draft.streamUrl);
	const station: AppStation = normalizeAppStation({
		id,
		name: draft.name.trim(),
		streamUrl,
		favicon: draft.favicon.trim() || null,
		country: draft.country.trim() || 'Custom',
		tags,
		votes: 0,
		language: draft.language.trim() || 'Unknown language',
		radioBrowser: createRadioBrowserFallback(id, draft, tags)
	});

	const nextStations = [station, ...listCustomStations()];
	persistStations(nextStations);
	return nextStations;
}

export function removeCustomStation(stationId: string): AppStation[] {
	const nextStations = listCustomStations().filter((station) => station.id !== stationId);
	persistStations(nextStations);
	return nextStations;
}

export function importCustomStations(payload: unknown): AppStation[] {
	const importedStations = Array.isArray(payload)
		? payload
		: payload && typeof payload === 'object' && Array.isArray((payload as { stations?: unknown }).stations)
			? (payload as { stations: unknown[] }).stations
			: null;

	if (!importedStations) {
		throw new Error('Invalid custom station export file.');
	}

	const normalizedImportedStations = importedStations
		.filter((station): station is AppStation => !!station && typeof station === 'object')
		.filter((station) => !!station.id && !!station.name && !!station.streamUrl)
		.map(normalizeStoredStation);

	if (normalizedImportedStations.length === 0) {
		throw new Error('No valid custom stations found in import file.');
	}

	const nextStations = dedupeStations([...normalizedImportedStations, ...listCustomStations()]);
	persistStations(nextStations);
	return nextStations;
}