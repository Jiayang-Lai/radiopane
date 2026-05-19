import { fetchGeoStations } from '$lib/radio-browser';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch }) => {
	return {
		stations: fetchGeoStations(fetch)
	};
};