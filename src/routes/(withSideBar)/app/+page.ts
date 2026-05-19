import { fetchStations } from '$lib/radio-browser';
import type { PageLoad } from './$types';

const DISCOVER_STATION_COUNT = 12;

export const load: PageLoad = ({ fetch }) => {
	return {
		popularStations: fetchStations(fetch, '', 1, DISCOVER_STATION_COUNT)
	};
};