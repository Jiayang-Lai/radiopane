export type RadioBrowserStation = {
	changeuuid: string;
	stationuuid: string;
	serveruuid: string | null;
	name: string;
	url: string;
	url_resolved: string;
	homepage: string;
	favicon: string;
	country: string;
	countrycode: string;
	state: string;
	iso_3166_2: string;
	tags: string;
	languagecodes: string;
	votes: number;
	language: string;
	lastchangetime: string;
	lastchangetime_iso8601: string;
	codec: string;
	bitrate: number;
	hls: 0 | 1;
	lastcheckok: 0 | 1;
	lastchecktime: string;
	lastchecktime_iso8601: string;
	lastcheckoktime: string;
	lastcheckoktime_iso8601: string;
	lastlocalchecktime: string;
	lastlocalchecktime_iso8601: string;
	clicktimestamp: string;
	clicktimestamp_iso8601: string | null;
	clickcount: number;
	clicktrend: number;
	ssl_error: 0 | 1;
	geo_lat: number | null;
	geo_long: number | null;
	geo_distance: number | null;
	geo_source?: 'radio-browser' | 'state-centroid' | 'country-centroid';
	geo_is_approximate?: boolean;
	has_extended_info?: boolean;
};

export type AppStation = {
	id: string;
	name: string;
	streamUrl: string;
	favicon: string | null;
	country: string;
	tags: string[];
	votes: number;
	language: string;
	radioBrowser: RadioBrowserStation;
};

export const STATIONS_PER_PAGE = 24;
export const GEO_STATIONS_LIMIT = 10100;

export function normalizeStreamUrl(streamUrl: string | null | undefined): string {
	const normalizedStreamUrl = streamUrl?.trim();

	if (!normalizedStreamUrl) {
		return '';
	}

	if (!normalizedStreamUrl.startsWith('http://')) {
		return normalizedStreamUrl;
	}

	try {
		const url = new URL(normalizedStreamUrl);
		url.protocol = 'https:';
		return url.toString();
	} catch {
		return normalizedStreamUrl.replace(/^http:\/\//i, 'https://');
	}
}

export function normalizeAppStation(station: AppStation): AppStation {
	const streamUrl = normalizeStreamUrl(station.streamUrl);

	if (streamUrl === station.streamUrl) {
		return station;
	}

	return {
		...station,
		streamUrl
	};
}

export function mapStation(station: RadioBrowserStation): AppStation {
	return {
		id: station.stationuuid,
		name: station.name || 'Unknown station',
		streamUrl: normalizeStreamUrl(station.url_resolved || station.url),
		favicon: station.favicon || null,
		country: station.country || 'Unknown country',
		tags: station.tags
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean)
			.slice(0, 3),
		votes: station.votes,
		language: station.language || 'Unknown language',
		radioBrowser: station
	};
}

type StationRequestOptions = {
	offset: number;
	limit: number;
	query?: string;
	hasGeoInfo?: boolean;
};

type CoordinateAggregate = {
	latitudeTotal: number;
	longitudeTotal: number;
	count: number;
};

function normalizeLocationKey(value: string | null | undefined) {
	const normalizedValue = value?.trim().toLowerCase();
	return normalizedValue ? normalizedValue : null;
}

function getStateLocationKey(station: Pick<RadioBrowserStation, 'country' | 'countrycode' | 'state' | 'iso_3166_2'>) {
	const iso31662 = normalizeLocationKey(station.iso_3166_2);

	if (iso31662) {
		return `iso:${iso31662}`;
	}

	const normalizedState = normalizeLocationKey(station.state);

	if (!normalizedState) {
		return null;
	}

	const normalizedCountryCode = normalizeLocationKey(station.countrycode);

	if (normalizedCountryCode) {
		return `countrycode:${normalizedCountryCode}:state:${normalizedState}`;
	}

	const normalizedCountry = normalizeLocationKey(station.country);

	if (normalizedCountry) {
		return `country:${normalizedCountry}:state:${normalizedState}`;
	}

	return null;
}

function getCountryLocationKey(station: Pick<RadioBrowserStation, 'country' | 'countrycode'>) {
	const normalizedCountryCode = normalizeLocationKey(station.countrycode);

	if (normalizedCountryCode) {
		return `countrycode:${normalizedCountryCode}`;
	}

	const normalizedCountry = normalizeLocationKey(station.country);

	if (normalizedCountry) {
		return `country:${normalizedCountry}`;
	}

	return null;
}

function addCoordinateAggregate(
	aggregates: Map<string, CoordinateAggregate>,
	key: string | null,
	latitude: number,
	longitude: number
) {
	if (!key) {
		return;
	}

	const aggregate = aggregates.get(key);

	if (aggregate) {
		aggregate.latitudeTotal += latitude;
		aggregate.longitudeTotal += longitude;
		aggregate.count += 1;
		return;
	}

	aggregates.set(key, {
		latitudeTotal: latitude,
		longitudeTotal: longitude,
		count: 1
	});
}

function getCoordinateAggregateCenter(
	aggregates: Map<string, CoordinateAggregate>,
	key: string | null
) {
	if (!key) {
		return null;
	}

	const aggregate = aggregates.get(key);

	if (!aggregate || aggregate.count === 0) {
		return null;
	}

	return {
		latitude: aggregate.latitudeTotal / aggregate.count,
		longitude: aggregate.longitudeTotal / aggregate.count
	};
}

function resolveApproximateGeoStation(
	station: RadioBrowserStation,
	stateAggregates: Map<string, CoordinateAggregate>,
	countryAggregates: Map<string, CoordinateAggregate>
) {
	const stateCenter = getCoordinateAggregateCenter(stateAggregates, getStateLocationKey(station));

	if (stateCenter) {
		return {
			station: {
				...station,
				geo_lat: stateCenter.latitude,
				geo_long: stateCenter.longitude,
				geo_source: 'state-centroid' as const,
				geo_is_approximate: true
			},
			source: 'state-centroid' as const
		};
	}

	const countryCenter = getCoordinateAggregateCenter(
		countryAggregates,
		getCountryLocationKey(station)
	);

	if (countryCenter) {
		return {
			station: {
				...station,
				geo_lat: countryCenter.latitude,
				geo_long: countryCenter.longitude,
				geo_source: 'country-centroid' as const,
				geo_is_approximate: true
			},
			source: 'country-centroid' as const
		};
	}

	return null;
}

function buildStationsUrl({ offset, limit, query, hasGeoInfo = false }: StationRequestOptions) {
	const normalizedQuery = query?.trim() ?? '';
	const url = new URL(
		normalizedQuery
			? 'https://de1.api.radio-browser.info/json/stations/search'
			: 'https://de1.api.radio-browser.info/json/stations'
	);

	url.searchParams.set('hidebroken', 'true');
	url.searchParams.set('limit', String(limit));
	url.searchParams.set('offset', String(offset));

	if (hasGeoInfo) {
		url.searchParams.set('has_geo_info', 'true');
		return url;
	}

	url.searchParams.set('order', 'votes');
	url.searchParams.set('reverse', 'true');

	if (normalizedQuery) {
		url.searchParams.set('name', normalizedQuery);
	}

	return url;
}

export async function fetchStations(
	fetcher: typeof fetch,
	query: string,
	page: number,
	pageSize = STATIONS_PER_PAGE
): Promise<{ stations: AppStation[]; hasNextPage: boolean }> {
	const offset = (page - 1) * pageSize;
	const url = buildStationsUrl({
		offset,
		limit: pageSize + 1,
		query,
	});

	const response = await fetcher(url);

	if (!response.ok) {
		throw new Error('Unable to load stations right now.');
	}

	// throw new Error('Unable to load stations right now.');

	const result = (await response.json()) as RadioBrowserStation[];
	const hasNextPage = result.length > pageSize;

	// // Add mock delay
	// await new Promise((resolve) => setTimeout(resolve, 5000));

	// // Return empty result as mock
	// return {
	// 	stations: [],
	// 	hasNextPage
	// };

	return {
		stations: result.slice(0, pageSize).map(mapStation),
		hasNextPage
	};
}

export async function fetchGeoStations(
	fetcher: typeof fetch,
	limit = GEO_STATIONS_LIMIT
): Promise<AppStation[]> {
	const response = await fetcher(
		buildStationsUrl({
			offset: 0,
			limit,
			hasGeoInfo: true
		})
	);

	if (!response.ok) {
		throw new Error('Unable to load map stations right now.');
	}

	const result = (await response.json()) as RadioBrowserStation[];
	const stateAggregates = new Map<string, CoordinateAggregate>();
	const countryAggregates = new Map<string, CoordinateAggregate>();
	const missingLatitudeCount = result.filter((station) => station.geo_lat === null).length;
	const missingLongitudeCount = result.filter((station) => station.geo_long === null).length;
	const missingBothCount = result.filter(
		(station) => station.geo_lat === null && station.geo_long === null
	).length;
	const invalidFiniteCount = result.filter(
		(station) =>
			station.geo_lat !== null &&
			station.geo_long !== null &&
			(!Number.isFinite(station.geo_lat) || !Number.isFinite(station.geo_long))
	).length;

	for (const station of result) {
		if (
			station.geo_lat === null ||
			station.geo_long === null ||
			!Number.isFinite(station.geo_lat) ||
			!Number.isFinite(station.geo_long)
		) {
			continue;
		}

		addCoordinateAggregate(
			stateAggregates,
			getStateLocationKey(station),
			station.geo_lat,
			station.geo_long
		);
		addCoordinateAggregate(
			countryAggregates,
			getCountryLocationKey(station),
			station.geo_lat,
			station.geo_long
		);
	}

	const mappedStations: AppStation[] = [];
	const unresolvedStations: RadioBrowserStation[] = [];
	const approximatedStationSample: Array<{
		id: string;
		name: string;
		country: string;
		state: string;
		geo_source: 'state-centroid' | 'country-centroid';
		geo_lat: number;
		geo_long: number;
	}> = [];
	let exactCoordinateCount = 0;
	let approximatedFromStateCount = 0;
	let approximatedFromCountryCount = 0;

	for (const station of result) {
		if (
			station.geo_lat !== null &&
			station.geo_long !== null &&
			Number.isFinite(station.geo_lat) &&
			Number.isFinite(station.geo_long)
		) {
			exactCoordinateCount += 1;
			mappedStations.push(
				mapStation({
					...station,
					geo_source: 'radio-browser',
					geo_is_approximate: false
				})
			);
			continue;
		}

		const approximatedStation = resolveApproximateGeoStation(
			station,
			stateAggregates,
			countryAggregates
		);

		if (!approximatedStation) {
			unresolvedStations.push(station);
			continue;
		}

		if (approximatedStation.source === 'state-centroid') {
			approximatedFromStateCount += 1;
		} else {
			approximatedFromCountryCount += 1;
		}

		if (approximatedStationSample.length < 5) {
			approximatedStationSample.push({
				id: approximatedStation.station.stationuuid,
				name: approximatedStation.station.name,
				country: approximatedStation.station.country,
				state: approximatedStation.station.state,
				geo_source: approximatedStation.source,
				geo_lat: approximatedStation.station.geo_lat ?? 0,
				geo_long: approximatedStation.station.geo_long ?? 0
			});
		}

		mappedStations.push(mapStation(approximatedStation.station));
	}

	const droppedStationSample = unresolvedStations.slice(0, 5).map((station) => ({
		id: station.stationuuid,
		name: station.name,
		country: station.country,
		state: station.state,
		geo_lat: station.geo_lat,
		geo_long: station.geo_long
	}));
	const approximatedStationCount = approximatedFromStateCount + approximatedFromCountryCount;

	console.debug('[radio-browser] geo station search returned %d stations', result.length);
	console.debug(
		'[radio-browser] geo station mapping kept %d stations (%d exact, %d approximate) and dropped %d stations',
		mappedStations.length,
		exactCoordinateCount,
		approximatedStationCount,
		unresolvedStations.length
	);
	console.debug(
		'[radio-browser] geo station drop summary: missing latitude=%d, missing longitude=%d, missing both=%d, invalid finite coordinates=%d',
		missingLatitudeCount,
		missingLongitudeCount,
		missingBothCount,
		invalidFiniteCount
	);
	console.debug(
		'[radio-browser] geo fallback summary: state centroid=%d, country centroid=%d, unresolved=%d',
		approximatedFromStateCount,
		approximatedFromCountryCount,
		unresolvedStations.length
	);

	if (approximatedStationSample.length > 0) {
		console.debug('[radio-browser] sample approximated geo stations', approximatedStationSample);
	}

	if (droppedStationSample.length > 0) {
		console.debug('[radio-browser] sample dropped geo stations', droppedStationSample);
	}

	return mappedStations;
}