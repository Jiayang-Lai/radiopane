import { STATIONS_PER_PAGE, fetchStations } from '$lib/radio-browser';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ fetch, url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const pageParam = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

	return {
		page,
		pageSize: STATIONS_PER_PAGE,
		query,
		stations: fetchStations(fetch, query, page)
	};
};