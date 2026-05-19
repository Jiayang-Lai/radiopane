import type Supercluster from 'supercluster';
import type { AppStation } from '$lib/radio-browser';

export type StationClusterProperties = {
	stationIndex: number;
};

export type StationFeature = Supercluster.PointFeature<StationClusterProperties>;

export type SelectedCluster = {
	pointCount: number;
	stations: AppStation[];
	exactStations: AppStation[];
	approximateStations: AppStation[];
	countries: string[];
	languageCount: number;
};

export function markerRadius(votes: number) {
	if (votes >= 1000) {
		return 9;
	}

	if (votes >= 250) {
		return 7;
	}

	if (votes >= 50) {
		return 6;
	}

	return 5;
}

export function clusterDiameter(pointCount: number) {
	if (pointCount >= 500) {
		return 58;
	}

	if (pointCount >= 100) {
		return 50;
	}

	if (pointCount >= 25) {
		return 44;
	}

	return 38;
}

export function getStationTooltipLabel(station: AppStation) {
	if (!station.radioBrowser.geo_is_approximate) {
		return station.name;
	}

	const locationDetails = [
		station.radioBrowser.country?.trim(),
		station.radioBrowser.state?.trim(),
		station.radioBrowser.iso_3166_2?.trim()
	].filter(Boolean);

	if (locationDetails.length === 0) {
		return `${station.name} (approximate location)`;
	}

	return `${station.name} (approximate: ${locationDetails.join(' · ')})`;
}

export function buildStationFeatures(stations: AppStation[]): StationFeature[] {
	return stations.flatMap((station, stationIndex) => {
		const latitude = station.radioBrowser.geo_lat;
		const longitude = station.radioBrowser.geo_long;

		if (latitude === null || longitude === null) {
			return [];
		}

		return [
			{
				type: 'Feature',
				properties: { stationIndex },
				geometry: {
					type: 'Point',
					coordinates: [longitude, latitude]
				}
			}
		];
	});
}

export function buildSelectedCluster(
	leaves: Array<StationFeature>,
	stations: AppStation[],
	pointCount: number
): SelectedCluster {
	const clusterStations = leaves
		.map((leaf) => stations[leaf.properties.stationIndex])
		.filter((station): station is AppStation => Boolean(station))
		.sort((left, right) => right.votes - left.votes);
	const exactStations = clusterStations.filter((station) => !station.radioBrowser.geo_is_approximate);
	const approximateStations = clusterStations.filter((station) => station.radioBrowser.geo_is_approximate);
	const countries = [...new Set(clusterStations.map((station) => station.country).filter(Boolean))];
	const languageCount = new Set(
		clusterStations.map((station) => station.language).filter(Boolean)
	).size;

	return {
		pointCount,
		stations: clusterStations,
		exactStations,
		approximateStations,
		countries,
		languageCount
	};
}