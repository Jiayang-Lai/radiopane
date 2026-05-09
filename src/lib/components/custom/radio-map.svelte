<script lang="ts">
	import { onMount } from 'svelte';
	import MapPinnedIcon from '@lucide/svelte/icons/map-pinned';
	import { mode } from 'mode-watcher';
	import Supercluster from 'supercluster';
	import type * as GeoJSON from 'geojson';
	import type * as Leaflet from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import MapStationPanel from '$lib/components/custom/map-station-panel.svelte';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import type { AppStation } from '$lib/radio-browser';

	type StationClusterProperties = {
		stationIndex: number;
	};

	type StationFeature = Supercluster.PointFeature<StationClusterProperties>;
	type ClusterFeature = Supercluster.ClusterFeature<Supercluster.AnyProps>;
	type SelectedCluster = {
		pointCount: number;
		stations: AppStation[];
		exactStations: AppStation[];
		approximateStations: AppStation[];
		countries: string[];
		languageCount: number;
	};

	let { stations }: { stations: AppStation[] } = $props();

	let mapElement: HTMLDivElement | null = null;
	let mapReady = $state(false);
	let mapError = $state<string | null>(null);
	let selectedCluster = $state<SelectedCluster | null>(null);
	let selectedStation = $state<AppStation | null>(null);
	let showAllClusterStations = $state(false);
	let map: Leaflet.Map | null = null;
	let markersLayer: Leaflet.LayerGroup | null = null;
	let tileLayer: Leaflet.TileLayer | null = null;
	let clusterIndex: Supercluster<StationClusterProperties> | null = null;
	let markerStrokeColor = $state('currentColor');
	let markerFillColor = $state('currentColor');
	let clusterTextColor = $state('currentColor');
	let currentTheme = $state(mode.current);
	const stationCount = $derived(stations.length);

	const MAP_TILE_LAYERS = {
		light: {
			url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
			attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
			subdomains: 'abcd',
			maxZoom: 20
		},
		dark: {
			url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
			attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
			subdomains: 'abcd',
			maxZoom: 20
		}
	} as const;
	const MAX_CLUSTER_FOCUS_ZOOM = 6;
	const MAX_CLUSTER_ZOOM_STEP = 2;
	const MAX_STATION_FOCUS_ZOOM = 12;

	function markerRadius(votes: number) {
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

	function clusterDiameter(pointCount: number) {
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

	function focusStation(station: AppStation) {
		showAllClusterStations = false;
		selectedCluster = null;
		selectedStation = station;
	}

	function flyToStation(
		station: AppStation,
		minimumZoom = 6,
		maximumZoom = MAX_STATION_FOCUS_ZOOM
	) {
		const latitude = station.radioBrowser.geo_lat;
		const longitude = station.radioBrowser.geo_long;

		if (!map || latitude === null || longitude === null) {
			return;
		}

		const currentZoom = map.getZoom();
		const targetZoom =
			currentZoom < minimumZoom
				? Math.min(minimumZoom, maximumZoom)
				: currentZoom;

		map.flyTo([latitude, longitude], targetZoom, {
			animate: true,
			duration: 0.45
		});
	}

	function focusPreviewStation(station: AppStation) {
		focusStation(station);
		flyToStation(station, MAX_STATION_FOCUS_ZOOM, MAX_STATION_FOCUS_ZOOM);
	}

	function focusMapStation(station: AppStation) {
		focusStation(station);
		flyToStation(station, MAX_STATION_FOCUS_ZOOM, MAX_STATION_FOCUS_ZOOM);
	}

	function syncMarkerColors() {
		const styles = getComputedStyle(document.documentElement);
		markerStrokeColor = styles.getPropertyValue('--primary').trim() || 'currentColor';
		markerFillColor = styles.getPropertyValue('--accent').trim() || markerStrokeColor;
		clusterTextColor =
			styles.getPropertyValue('--accent-foreground').trim() ||
			styles.getPropertyValue('--primary-foreground').trim() ||
			markerStrokeColor;
	}

	function createClusterIcon(L: typeof import('leaflet'), pointCount: number) {
		const diameter = clusterDiameter(pointCount);

		return L.divIcon({
			className: 'station-cluster-icon-wrapper',
			html: `<span class="station-cluster-icon" style="width:${diameter}px;height:${diameter}px;background:${markerFillColor};border-color:${markerStrokeColor};color:${clusterTextColor}">${pointCount.toLocaleString()}</span>`,
			iconSize: [diameter, diameter],
			iconAnchor: [diameter / 2, diameter / 2]
		});
	}

	function getStationTooltipLabel(station: AppStation) {
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

	function buildStationFeatures(stations: AppStation[]): StationFeature[] {
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

	function selectCluster(clusterId: number, pointCount: number, stations: AppStation[]) {
		if (!clusterIndex) {
			return;
		}

		const clusterStations = clusterIndex
			.getLeaves(clusterId, pointCount)
			.map((leaf) => stations[leaf.properties.stationIndex])
			.filter((station): station is AppStation => Boolean(station))
			.sort((left, right) => right.votes - left.votes);
		const exactStations = clusterStations.filter((station) => !station.radioBrowser.geo_is_approximate);
		const approximateStations = clusterStations.filter((station) => station.radioBrowser.geo_is_approximate);

		const countries = [...new Set(clusterStations.map((station) => station.country).filter(Boolean))];
		const languageCount = new Set(
			clusterStations.map((station) => station.language).filter(Boolean)
		).size;

		selectedStation = null;
		showAllClusterStations = approximateStations.length > 0;
		selectedCluster = {
			pointCount,
			stations: clusterStations,
			exactStations,
			approximateStations,
			countries,
			languageCount
		};
	}

	function syncMapTheme(L: typeof import('leaflet')) {
		if (!map) {
			return;
		}

		const tileConfig = currentTheme === 'light' ? MAP_TILE_LAYERS.light : MAP_TILE_LAYERS.dark;

		tileLayer?.remove();
		tileLayer = L.tileLayer(tileConfig.url, {
			attribution: tileConfig.attribution,
			subdomains: tileConfig.subdomains,
			maxZoom: tileConfig.maxZoom
		}).addTo(map);
	}

	function renderVisibleMarkers(L: typeof import('leaflet'), stations: AppStation[]) {
		if (!map || !markersLayer || !clusterIndex) {
			return;
		}

		markersLayer.clearLayers();

		const bounds = map.getBounds();
		const bbox: GeoJSON.BBox = [
			bounds.getWest(),
			bounds.getSouth(),
			bounds.getEast(),
			bounds.getNorth()
		];
		const zoom = Math.round(map.getZoom());
		const visibleFeatures = clusterIndex.getClusters(bbox, zoom) as Array<
			StationFeature | ClusterFeature
		>;

		for (const feature of visibleFeatures) {
			const [longitude, latitude] = feature.geometry.coordinates;

			if ('cluster' in feature.properties && feature.properties.cluster) {
				const clusterId = feature.properties.cluster_id;
				const pointCount = feature.properties.point_count;

				L.marker([latitude, longitude], {
					icon: createClusterIcon(L, pointCount),
					keyboard: false
				})
					.on('click', () => {
						if (!map || !clusterIndex) {
							return;
						}

						selectCluster(clusterId, pointCount, stations);
						const currentZoom = map.getZoom();
						const nextExpansionZoom = Math.min(
							clusterIndex.getClusterExpansionZoom(clusterId),
							map.getMaxZoom(),
							currentZoom + MAX_CLUSTER_ZOOM_STEP,
							MAX_CLUSTER_FOCUS_ZOOM
						);
						const expansionZoom = Math.max(currentZoom, nextExpansionZoom);

						map.flyTo([latitude, longitude], expansionZoom, {
							animate: true,
							duration: 0.35
						});
					})
					.addTo(markersLayer);

				continue;
			}

			const station = stations[feature.properties.stationIndex];

			if (!station) {
				continue;
			}

			L.circleMarker([latitude, longitude], {
				radius: markerRadius(station.votes),
				weight: 1,
				color: markerStrokeColor,
				fillColor: markerFillColor,
				fillOpacity: station.radioBrowser.geo_is_approximate ? 0.42 : 0.75,
				opacity: station.radioBrowser.geo_is_approximate ? 0.72 : 1,
				dashArray: station.radioBrowser.geo_is_approximate ? '4 3' : undefined
			})
				.on('click', () => {
					focusMapStation(station);
				})
				.bindTooltip(getStationTooltipLabel(station), {
					direction: 'top',
					offset: [0, -8],
					opacity: 0.92
				})
				.addTo(markersLayer);
		}
	}

	onMount(() => {
		let destroyed = false;
		let themeObserver: MutationObserver | null = null;
		let redrawMarkers: (() => void) | null = null;

		async function setupMap() {
			if (!mapElement) {
				return;
			}

			syncMarkerColors();
			const L = await import('leaflet');

			if (destroyed || !mapElement) {
				return;
			}

			const worldBounds = L.latLngBounds(L.latLng(-60, -180), L.latLng(85, 180));

			map = L.map(mapElement, {
				preferCanvas: true,
				zoomControl: false,
				worldCopyJump: true,
				minZoom: 2,
				maxBounds: worldBounds,
				maxBoundsViscosity: 1,
				attributionControl: false
			});

			L.control
				.zoom({
					position: 'bottomleft'
				})
				.addTo(map);

			syncMapTheme(L);

			themeObserver = new MutationObserver(() => {
				const nextTheme = mode.current;

				if (nextTheme === currentTheme) {
					return;
				}

				currentTheme = nextTheme;
				syncMarkerColors();
				syncMapTheme(L);
				renderVisibleMarkers(L, stations);
			});

			themeObserver.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ['class', 'data-theme', 'style']
			});

			markersLayer = L.layerGroup();
			markersLayer.addTo(map);

			clusterIndex = new Supercluster<StationClusterProperties>({
				radius: 54,
				maxZoom: 15,
				minPoints: 2
			});
			clusterIndex.load(buildStationFeatures(stations));

			const stationBounds = L.latLngBounds([]);

			for (const station of stations) {
				const latitude = station.radioBrowser.geo_lat;
				const longitude = station.radioBrowser.geo_long;

				if (latitude === null || longitude === null) {
					continue;
				}

				stationBounds.extend([latitude, longitude]);
			}

			redrawMarkers = () => renderVisibleMarkers(L, stations);
			map.on('moveend', redrawMarkers);
			map.on('zoomend', redrawMarkers);

			selectedStation = null;
			selectedCluster = null;
			showAllClusterStations = false;

			if (stationBounds.isValid()) {
				map.fitBounds(stationBounds.pad(0.08));
			} else {
				map.fitBounds(worldBounds.pad(-0.08));
			}

			renderVisibleMarkers(L, stations);

			mapReady = true;
			mapError = null;
		}

		void setupMap().catch(() => {
			if (destroyed) {
				return;
			}

			mapError = 'Unable to initialize the radio map right now.';
			selectedCluster = null;
			showAllClusterStations = false;
		});

		return () => {
			destroyed = true;
			mapReady = false;
			selectedCluster = null;
			showAllClusterStations = false;
			clusterIndex = null;
			tileLayer?.remove();
			tileLayer = null;
			if (map && redrawMarkers) {
				map.off('moveend', redrawMarkers);
				map.off('zoomend', redrawMarkers);
			}
			markersLayer?.remove();
			markersLayer = null;
			map?.remove();
			map = null;
			themeObserver?.disconnect();
		};
	});
</script>

<div class="grid min-h-0 flex-1 gap-2 xl:grid-cols-[minmax(0,1fr)_22rem]">
	<div class="border-border bg-card relative z-0 h-[52svh] min-h-88 max-h-160 overflow-hidden rounded-xl border shadow-sm isolate sm:h-[58svh] sm:min-h-112 xl:h-auto xl:min-h-128 xl:max-h-none">
		{#if !mapReady}
			<div class="bg-card/70 absolute top-3 right-3 z-500 rounded-full p-2 backdrop-blur-sm sm:top-4 sm:right-4">
				<Spinner class="size-4 text-primary" aria-label="Loading map" />
			</div>
		{/if}

		<div class="border-border/80 bg-card/92 text-card-foreground absolute top-3 left-3 z-500 flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm backdrop-blur-sm sm:top-4 sm:left-4 sm:max-w-none sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs">
			<MapPinnedIcon class="size-3.5" />
			<span>{stationCount.toLocaleString()} stations mapped</span>
		</div>

		<div class="map-surface relative h-full w-full">
			<div bind:this={mapElement} class="h-full w-full"></div>
		</div>

		{#if mapError}
			<div class="border-destructive/40 bg-card/96 text-destructive absolute inset-x-4 bottom-4 z-500 rounded-2xl border p-4 text-sm shadow-lg backdrop-blur-sm">
				{mapError}
			</div>
		{/if}
	</div>

	<MapStationPanel
		{selectedCluster}
		{selectedStation}
		{showAllClusterStations}
		onToggleShowAllClusterStations={() => {
			showAllClusterStations = !showAllClusterStations;
		}}
		onFocusPreviewStation={focusPreviewStation}
	/>
</div>

<style>
	:global(.leaflet-container) {
		height: 100%;
		width: 100%;
		background: transparent;
		font: inherit;
	}

	:global(.leaflet-control-attribution) {
		background: color-mix(in oklab, var(--card) 82%, transparent);
		color: var(--muted-foreground);
		backdrop-filter: blur(10px);
	}

	:global(.leaflet-control-attribution a) {
		color: var(--foreground);
	}

	:global(.leaflet-bottom.leaflet-left) {
		margin-bottom: 0.75rem;
		margin-left: 0.75rem;
	}

	:global(.leaflet-control-zoom) {
		border: 1px solid color-mix(in oklab, var(--border) 84%, transparent);
		border-radius: 1rem;
		box-shadow: 0 18px 38px rgb(15 23 42 / 0.22);
		overflow: hidden;
	}

	:global(.leaflet-touch .leaflet-control-zoom) {
		border: 1px solid color-mix(in oklab, var(--border) 84%, transparent);
	}

	:global(.leaflet-control-zoom a) {
		background: color-mix(in oklab, var(--card) 92%, black 8%);
		border: 0;
		color: var(--foreground);
		display: grid;
		font-size: 1rem;
		font-weight: 700;
		place-items: center;
		transition:
			background-color 150ms ease,
			color 150ms ease,
			transform 150ms ease;
	}

	:global(.leaflet-touch .leaflet-control-zoom a) {
		width: 2.5rem;
		height: 2.5rem;
		line-height: 1;
	}

	:global(.leaflet-control-zoom a + a) {
		border-top: 1px solid color-mix(in oklab, var(--border) 78%, white 22%);
	}

	:global(.leaflet-control-zoom a:hover) {
		background: color-mix(in oklab, var(--accent) 24%, var(--card) 76%);
		color: var(--accent-foreground);
	}

	:global(.leaflet-control-zoom a:focus-visible) {
		outline: 2px solid color-mix(in oklab, var(--ring) 70%, transparent);
		outline-offset: -2px;
		position: relative;
		z-index: 1;
	}

	:global(.leaflet-control-zoom a.leaflet-disabled) {
		background: color-mix(in oklab, var(--muted) 92%, black 8%);
		color: var(--muted-foreground);
		opacity: 0.65;
	}

	:global(.leaflet-tooltip) {
		background: color-mix(in oklab, var(--popover) 94%, transparent);
		border: 0;
		border-radius: 999px;
		box-shadow: 0 10px 30px rgb(15 23 42 / 0.15);
		color: var(--popover-foreground);
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.35rem 0.65rem;
	}

	:global(.station-cluster-icon-wrapper) {
		background: transparent;
		border: 0;
	}

	:global(.station-cluster-icon) {
		align-items: center;
		backdrop-filter: blur(10px);
		border-radius: 999px;
		border-style: solid;
		border-width: 2px;
		box-shadow: 0 18px 34px rgb(15 23 42 / 0.24);
		display: inline-flex;
		font-size: 0.75rem;
		font-weight: 700;
		justify-content: center;
		line-height: 1;
	}

	.map-surface {
		background:
			radial-gradient(circle at top left, color-mix(in oklab, var(--accent) 20%, transparent), transparent 35%),
			radial-gradient(circle at bottom right, color-mix(in oklab, var(--primary) 14%, transparent), transparent 42%),
			linear-gradient(
				135deg,
				color-mix(in oklab, var(--muted) 70%, var(--background) 30%),
				color-mix(in oklab, var(--card) 72%, var(--background) 28%)
			);
	}
</style>