<script lang="ts">
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';
	import RadioIcon from '@lucide/svelte/icons/radio';
	import XIcon from '@lucide/svelte/icons/x';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as ScrollArea from '$lib/components/ui/scroll-area/index.js';
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import { IsTailwindBreakpointUp } from '$lib/hooks/is-tailwind-breakpoint-up.svelte.js';
	import { playerState, playStation, togglePlayback } from '$lib/player-state.svelte.js';
	import type { AppStation } from '$lib/radio-browser';

	type SelectedCluster = {
		pointCount: number;
		stations: AppStation[];
		exactStations: AppStation[];
		approximateStations: AppStation[];
		countries: string[];
		languageCount: number;
	};

	type ClusterListRow =
		| {
				id: string;
				kind: 'header';
				label: string;
				approximate: boolean;
				height: number;
			}
		| {
				id: string;
				kind: 'station';
				station: AppStation;
				approximate: boolean;
				height: number;
			};

	const CLUSTER_LIST_HEADER_HEIGHT = 24;
	const CLUSTER_LIST_PADDED_HEADER_HEIGHT = 32;
	const CLUSTER_LIST_STATION_HEIGHT = 72;
	const CLUSTER_LIST_OVERSCAN = 6;
	const CLUSTER_LIST_VIRTUALIZE_THRESHOLD = 20;

	let {
		selectedCluster = null,
		selectedStation = null,
		showAllClusterStations = false,
		onToggleShowAllClusterStations = () => {},
		onFocusPreviewStation = () => {}
	}: {
		selectedCluster?: SelectedCluster | null;
		selectedStation?: AppStation | null;
		showAllClusterStations?: boolean;
		onToggleShowAllClusterStations?: () => void;
		onFocusPreviewStation?: (station: AppStation) => void;
	} = $props();

	let mobilePanelOpen = $state(false);
	let lastMobileSelectionKey = '';
	let clusterListViewport: HTMLDivElement | null = $state(null);
	let clusterListScrollTop = $state(0);
	let clusterListViewportHeight = $state(0);
	const isXlUp = new IsTailwindBreakpointUp('xl');

	const hasSelection = $derived(!!selectedCluster || !!selectedStation);
	const selectedClusterCountrySummary = $derived(selectedCluster?.countries.slice(0, 3).join(' · ') ?? '');
	const selectedClusterHasApproximateStations = $derived(
		(selectedCluster?.approximateStations.length ?? 0) > 0
	);
	const mobileSelectionKey = $derived.by(() => {
		if (selectedCluster) {
			return `cluster:${selectedCluster.pointCount}:${selectedCluster.stations[0]?.id ?? 'none'}`;
		}

		if (selectedStation) {
			return `station:${selectedStation.id}`;
		}

		return '';
	});
	const selectedClusterVisibleStations = $derived.by(() => {
		if (!selectedCluster) {
			return [] as AppStation[];
		}

		if (showAllClusterStations || selectedCluster.approximateStations.length > 0) {
			return selectedCluster.stations;
		}

		return selectedCluster.stations.slice(0, 6);
	});
	const selectedClusterVisibleExactStations = $derived.by(() =>
		selectedClusterVisibleStations.filter((station) => !station.radioBrowser.geo_is_approximate)
	);
	const selectedClusterVisibleApproximateStations = $derived.by(() =>
		selectedClusterVisibleStations.filter((station) => station.radioBrowser.geo_is_approximate)
	);
	const clusterListRows = $derived.by(() => {
		const rows: ClusterListRow[] = [];

		if (selectedClusterVisibleExactStations.length > 0) {
			rows.push({
				id: 'exact-header',
				kind: 'header',
				label: 'Exact locations',
				approximate: false,
				height: CLUSTER_LIST_HEADER_HEIGHT
			});

			for (const station of selectedClusterVisibleExactStations) {
				rows.push({
					id: `station:${station.id}`,
					kind: 'station',
					station,
					approximate: false,
					height: CLUSTER_LIST_STATION_HEIGHT
				});
			}
		}

		if (selectedClusterVisibleApproximateStations.length > 0) {
			rows.push({
				id: 'approximate-header',
				kind: 'header',
				label: 'Inferred locations',
				approximate: true,
				height: CLUSTER_LIST_PADDED_HEADER_HEIGHT
			});

			for (const station of selectedClusterVisibleApproximateStations) {
				rows.push({
					id: `station:${station.id}`,
					kind: 'station',
					station,
					approximate: true,
					height: CLUSTER_LIST_STATION_HEIGHT
				});
			}
		}

		return rows;
	});
	const shouldVirtualizeClusterList = $derived(
		!isXlUp.current && clusterListRows.length > CLUSTER_LIST_VIRTUALIZE_THRESHOLD
	);
	const clusterListPrefixHeights = $derived.by(() => {
		const prefixHeights = [0];
		let totalHeight = 0;

		for (const row of clusterListRows) {
			totalHeight += row.height;
			prefixHeights.push(totalHeight);
		}

		return prefixHeights;
	});
	const clusterListWindow = $derived.by(() => {
		const rowCount = clusterListRows.length;

		if (!shouldVirtualizeClusterList || rowCount === 0) {
			return {
				start: 0,
				end: rowCount,
				topPadding: 0,
				bottomPadding: 0
			};
		}

		const viewportBottom = clusterListScrollTop + clusterListViewportHeight;
		const firstVisibleIndex = findClusterRowIndex(clusterListPrefixHeights, clusterListScrollTop);
		const lastVisibleIndex = findClusterRowIndex(clusterListPrefixHeights, viewportBottom);
		const start = Math.max(0, firstVisibleIndex - CLUSTER_LIST_OVERSCAN);
		const end = Math.min(rowCount, lastVisibleIndex + CLUSTER_LIST_OVERSCAN + 1);

		return {
			start,
			end,
			topPadding: clusterListPrefixHeights[start] ?? 0,
			bottomPadding:
				(clusterListPrefixHeights[rowCount] ?? 0) - (clusterListPrefixHeights[end] ?? 0)
		};
	});
	const clusterListWindowRows = $derived.by(() =>
		clusterListRows.slice(clusterListWindow.start, clusterListWindow.end)
	);
	const selectedStationMeta = $derived(
		selectedStation
			? [selectedStation.country, selectedStation.language].filter(Boolean).join(' · ')
			: ''
	);
	const selectedStationTags = $derived(selectedStation?.tags.slice(0, 4) ?? []);
	const isSelectedStationApproximate = $derived(!!selectedStation?.radioBrowser.geo_is_approximate);
	const selectedStationLocationSummary = $derived.by(() => {
		const locationSource = selectedStation?.radioBrowser.geo_source;

		if (locationSource === 'state-centroid') {
			return 'Approximate map location inferred from stations in the same state.';
		}

		if (locationSource === 'country-centroid') {
			return 'Approximate map location inferred from stations in the same country.';
		}

		return '';
	});
	const selectedStationLocationInputs = $derived.by(() => {
		if (!selectedStation?.radioBrowser.geo_is_approximate) {
			return '';
		}

		const locationDetails = [
			selectedStation.radioBrowser.country?.trim()
				? `Country: ${selectedStation.radioBrowser.country.trim()}`
				: null,
			selectedStation.radioBrowser.state?.trim()
				? `State: ${selectedStation.radioBrowser.state.trim()}`
				: null,
			selectedStation.radioBrowser.iso_3166_2?.trim()
				? `ISO 3166-2: ${selectedStation.radioBrowser.iso_3166_2.trim()}`
				: null
		].filter(Boolean);

		return locationDetails.join(' · ');
	});
	const isSelectedCurrentStation = $derived(
		!!selectedStation && playerState.currentStation?.id === selectedStation.id
	);
	const isSelectedPlaying = $derived(isSelectedCurrentStation && playerState.isPlaying);
	const isSelectedLoading = $derived(isSelectedCurrentStation && playerState.isLoading);
	const selectedError = $derived(isSelectedCurrentStation ? playerState.errorMessage : null);
	const mobileSummaryTitle = $derived(
		selectedCluster
			? `${selectedCluster.pointCount.toLocaleString()} nearby stations`
			: selectedStation?.name ?? ''
	);
	const mobileSummaryDetail = $derived(
		selectedCluster
			? selectedClusterCountrySummary || 'Open cluster details and station list.'
			: selectedStationMeta || 'Open station details and playback controls.'
	);

	$effect(() => {
		const nextSelectionKey = mobileSelectionKey;
		const isDesktopViewport = isXlUp.current;

		if (!nextSelectionKey) {
			mobilePanelOpen = false;
			lastMobileSelectionKey = '';
			return;
		}

		if (isDesktopViewport) {
			mobilePanelOpen = false;
			lastMobileSelectionKey = '';
			return;
		}

		if (nextSelectionKey !== lastMobileSelectionKey) {
			mobilePanelOpen = true;
			lastMobileSelectionKey = nextSelectionKey;
		}
	});

	$effect(() => {
		mobileSelectionKey;
		showAllClusterStations;
		clusterListRows.length;

		clusterListScrollTop = 0;
		clusterListViewport?.scrollTo({ top: 0 });
	});

	function getApproximateStationDetail(station: AppStation) {
		if (!station.radioBrowser.geo_is_approximate) {
			return '';
		}

		const locationDetails = [
			station.radioBrowser.country?.trim(),
			station.radioBrowser.state?.trim(),
			station.radioBrowser.iso_3166_2?.trim()
		].filter(Boolean);

		const sourceLabel =
			station.radioBrowser.geo_source === 'state-centroid'
				? 'Inferred from state centroid'
				: 'Inferred from country centroid';

		if (locationDetails.length === 0) {
			return sourceLabel;
		}

		return `${sourceLabel} · ${locationDetails.join(' · ')}`;
	}

	function handlePlayback() {
		if (!selectedStation) {
			return;
		}

		if (isSelectedCurrentStation) {
			togglePlayback();
			return;
		}

		playStation(selectedStation);
	}

	function findClusterRowIndex(prefixHeights: number[], offset: number) {
		if (prefixHeights.length <= 1) {
			return 0;
		}

		let low = 0;
		let high = prefixHeights.length - 2;

		while (low < high) {
			const mid = Math.floor((low + high + 1) / 2);

			if ((prefixHeights[mid] ?? 0) <= offset) {
				low = mid;
			} else {
				high = mid - 1;
			}
		}

		return low;
	}

	function handleClusterListScroll(event: Event) {
		clusterListScrollTop = (event.currentTarget as HTMLDivElement).scrollTop;
	}
</script>

{#snippet panelHeader(showIcon: boolean, showCloseButton: boolean = false)}
	<div class="border-border flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5 sm:py-4">
		<div class={`min-w-0 space-y-1 ${showIcon || showCloseButton ? '' : 'pr-10'}`}>
			<p class="text-foreground text-sm font-semibold">
				{selectedCluster ? 'Cluster preview' : 'Selected station'}
			</p>
			<p class="text-muted-foreground text-xs">
				{#if selectedCluster}
					Previewing a grouped set of nearby stations. Choose one to inspect it directly.
				{:else}
					Click point on the map to inspect station.
				{/if}
			</p>
		</div>
		{#if showIcon}
			<RadioIcon class="text-primary size-4 shrink-0" />
		{:else if showCloseButton}
			<Drawer.Close>
				{#snippet child({ props })}
					<Button variant="ghost" size="icon-sm" class="shrink-0" aria-label="Close map details" {...props}>
						<XIcon class="size-4" />
					</Button>
				{/snippet}
			</Drawer.Close>
		{/if}
	</div>
{/snippet}

{#snippet clusterListHeader(label: string, paddedTop: boolean = false)}
	<p class={`text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.18em] ${paddedTop ? 'pt-2' : ''}`}>
		{label}
	</p>
{/snippet}

{#snippet clusterListStation(station: AppStation, approximate: boolean)}
	<button
		type="button"
		class="border-border bg-muted/35 hover:bg-muted/60 flex h-16 w-full items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors"
		onclick={() => onFocusPreviewStation(station)}
	>
		<div class="min-w-0">
			<p class="truncate text-sm font-semibold">{station.name}</p>
			<p class="text-muted-foreground truncate text-xs">
				{approximate ? getApproximateStationDetail(station) : `${station.country} · ${station.language}`}
			</p>
		</div>
		<span class="text-muted-foreground shrink-0 text-xs font-medium">
			{station.votes.toLocaleString()} votes
		</span>
	</button>
{/snippet}

{#snippet panelContent()}
	{#if selectedCluster}
		<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:gap-5 sm:p-5">
			<div class="flex min-h-0 flex-1 flex-col gap-3">
				<div class="flex items-start gap-3">
					<div class="bg-muted text-foreground flex size-12 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold sm:size-14">
						{selectedCluster.pointCount}
					</div>
					<div class="min-w-0 space-y-1">
						<h2 class="line-clamp-2 text-lg font-semibold leading-tight">
							{selectedCluster.pointCount.toLocaleString()} nearby stations
						</h2>
						<p class="text-muted-foreground line-clamp-2 text-sm">
							{selectedClusterCountrySummary || 'Mixed regions'}
						</p>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 sm:gap-3">
					<div class="bg-muted/50 rounded-2xl px-3 py-2 sm:py-2.5">
						<p class="text-muted-foreground text-[11px] uppercase tracking-[0.18em]">Stations</p>
						<p class="mt-1 text-base font-semibold">
							{selectedCluster.pointCount.toLocaleString()}
						</p>
					</div>
					<div class="bg-muted/50 rounded-2xl px-3 py-2 sm:py-2.5">
						<p class="text-muted-foreground text-[11px] uppercase tracking-[0.18em]">Languages</p>
						<p class="mt-1 text-base font-semibold">
							{selectedCluster.languageCount.toLocaleString()}
						</p>
					</div>
				</div>

				{#if selectedClusterHasApproximateStations}
					<div class="bg-muted/45 rounded-2xl px-3 py-2.5 text-sm sm:py-3">
						<p class="font-medium">
							{selectedCluster.approximateStations.length.toLocaleString()} station{selectedCluster.approximateStations.length === 1 ? '' : 's'} in this cluster use inferred map locations.
						</p>
						<p class="text-muted-foreground mt-1 text-xs leading-relaxed">
							These stations can remain grouped after zooming because they share a state or country centroid.
						</p>
					</div>
				{/if}

				<div class="flex min-h-0 flex-1 flex-col gap-2">
					<div class="flex items-center justify-between gap-3">
						<p class="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.18em]">
							{#if selectedClusterHasApproximateStations || showAllClusterStations}
								Stations in this cluster
							{:else}
								Top stations in this cluster
							{/if}
						</p>
						{#if !selectedClusterHasApproximateStations && selectedCluster.stations.length > 6}
							<button
								type="button"
								class="text-primary text-xs font-medium hover:underline"
								onclick={onToggleShowAllClusterStations}
							>
								{showAllClusterStations ? 'Show fewer' : `Show all ${selectedCluster.stations.length.toLocaleString()}`}
							</button>
						{/if}
					</div>
					{#if shouldVirtualizeClusterList}
						<div
							bind:this={clusterListViewport}
							bind:clientHeight={clusterListViewportHeight}
							class="min-h-0 flex-1 overflow-y-auto pr-3"
							data-vaul-no-drag
							onscroll={handleClusterListScroll}
						>
							<div style={`height: ${clusterListWindow.topPadding}px;`}></div>
							{#each clusterListWindowRows as row (row.id)}
								{#if row.kind === 'header'}
									<div style={`height: ${row.height}px;`}>
										{@render clusterListHeader(row.label, row.approximate)}
									</div>
								{:else}
									<div style={`height: ${row.height}px;`}>
										{@render clusterListStation(row.station, row.approximate)}
									</div>
								{/if}
							{/each}
							<div style={`height: ${clusterListWindow.bottomPadding}px;`}></div>
						</div>
					{:else}
						<ScrollArea.Root class="min-h-0 flex-1 overflow-y-auto pr-3" data-vaul-no-drag>
							<div class="space-y-2">
								{#if selectedClusterVisibleExactStations.length > 0}
									{@render clusterListHeader('Exact locations')}
									{#each selectedClusterVisibleExactStations as station}
										{@render clusterListStation(station, false)}
									{/each}
								{/if}

								{#if selectedClusterVisibleApproximateStations.length > 0}
									{@render clusterListHeader('Inferred locations', true)}
									{#each selectedClusterVisibleApproximateStations as station}
										{@render clusterListStation(station, true)}
									{/each}
								{/if}
							</div>
						</ScrollArea.Root>
					{/if}
				</div>
			</div>

			<p class="text-muted-foreground hidden text-sm sm:block">
				{#if selectedClusterHasApproximateStations}
					Approximate stations can remain grouped as you zoom. Use the grouped list above to open any station directly.
				{:else}
					The map is zooming into this cluster. Select one of the preview stations to inspect and play it.
				{/if}
			</p>
		</div>
	{:else if selectedStation}
		<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 sm:gap-5 sm:p-5" data-vaul-no-drag>
			<div class="space-y-2.5 sm:space-y-3">
				<div class="flex items-start gap-3">
					<div class="bg-muted flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:size-14">
						{#if selectedStation.favicon}
							<img
								src={selectedStation.favicon}
								alt={selectedStation.name}
								class="size-full object-cover"
							/>
						{:else}
							<span class="text-lg font-semibold">{selectedStation.name.slice(0, 1)}</span>
						{/if}
					</div>
					<div class="min-w-0 space-y-1">
						<h2 class="line-clamp-2 text-lg font-semibold leading-tight">
							{selectedStation.name}
						</h2>
						<p class="text-muted-foreground line-clamp-2 text-sm">{selectedStationMeta}</p>
						{#if isSelectedStationApproximate}
							<p class="text-muted-foreground rounded-full border border-current/10 px-2.5 py-1 text-xs font-medium">
								Approximate location
							</p>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-2 gap-2 sm:gap-3">
					<div class="bg-muted/50 rounded-2xl px-3 py-2 sm:py-2.5">
						<p class="text-muted-foreground text-[11px] uppercase tracking-[0.18em]">Votes</p>
						<p class="mt-1 text-base font-semibold">
							{selectedStation.votes.toLocaleString()}
						</p>
					</div>
					<div class="bg-muted/50 rounded-2xl px-3 py-2 sm:py-2.5">
						<p class="text-muted-foreground text-[11px] uppercase tracking-[0.18em]">Codec</p>
						<p class="mt-1 text-base font-semibold">
							{selectedStation.radioBrowser.codec || 'Unknown'}
						</p>
					</div>
				</div>

				{#if selectedStationTags.length > 0}
					<div class="flex flex-wrap gap-1.5 sm:gap-2">
						{#each selectedStationTags as tag}
							<span class="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-xs font-medium">
								{tag}
							</span>
						{/each}
					</div>
				{/if}

				{#if selectedStationLocationSummary}
					<p class="text-muted-foreground text-sm">
						{selectedStationLocationSummary}
					</p>
				{/if}

				{#if selectedStationLocationInputs}
					<p class="text-muted-foreground text-xs leading-relaxed">
						{selectedStationLocationInputs}
					</p>
				{/if}
			</div>

			<div class="space-y-3 sm:mt-auto">
				<Button
					type="button"
					class="w-full justify-center gap-2"
					onclick={handlePlayback}
					disabled={isSelectedLoading}
				>
					{#if isSelectedPlaying}
						<PauseIcon class="size-4" />
						<span>Pause station</span>
					{:else}
						<PlayIcon class="size-4" />
						<span>
							{#if isSelectedLoading}
								Connecting...
							{:else if isSelectedCurrentStation}
								Resume station
							{:else}
								Play station
							{/if}
						</span>
					{/if}
				</Button>

				{#if selectedError}
					<p class="text-destructive text-sm font-medium">{selectedError}</p>
				{/if}

				<a
					href={selectedStation.radioBrowser.homepage || selectedStation.streamUrl}
					target="_blank"
					rel="noreferrer"
					class="text-primary inline-flex text-sm font-medium hover:underline"
				>
					Open station homepage
				</a>
			</div>
		</div>
	{:else}
		<div class="text-muted-foreground flex flex-1 items-center justify-center px-6 text-center text-sm">
			No station is selected yet.
		</div>
	{/if}
{/snippet}

{#if !hasSelection}
	<div class="border-border bg-card/70 text-muted-foreground flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm xl:hidden">
		<RadioIcon class="text-primary size-4 shrink-0" />
		<p>Tap a cluster or station on the map to open details and playback controls.</p>
	</div>
{:else}
	<button
		type="button"
		class="border-border bg-card/92 flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left shadow-sm backdrop-blur-sm xl:hidden"
		onclick={() => {
			mobilePanelOpen = true;
		}}
	>
		<div class="bg-muted text-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold">
			{#if selectedCluster}
				{selectedCluster.pointCount}
			{:else}
				{selectedStation?.name.slice(0, 1)}
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<p class="truncate text-sm font-semibold">{mobileSummaryTitle}</p>
			<p class="text-muted-foreground truncate text-xs">{mobileSummaryDetail}</p>
		</div>
		<span class="text-primary shrink-0 text-xs font-medium">Open</span>
	</button>

	{#if !isXlUp.current}
		<Drawer.Root bind:open={mobilePanelOpen} shouldScaleBackground={false}>
			<Drawer.Content class="mx-auto w-full xl:hidden">
				<Drawer.Header class="sr-only">
					<Drawer.Title>{selectedCluster ? 'Cluster preview' : 'Selected station'}</Drawer.Title>
					<Drawer.Description>
						Open map details and playback controls for the current selection.
					</Drawer.Description>
				</Drawer.Header>
				<div class="flex h-[88svh] min-h-0 max-h-[88svh] flex-col overflow-hidden sm:h-[85svh] sm:max-h-[85svh]">
					{@render panelHeader(false, true)}
					{@render panelContent()}
				</div>
			</Drawer.Content>
		</Drawer.Root>
	{/if}
{/if}

<aside class="border-border bg-card relative z-10 hidden min-h-72 min-w-0 flex-col overflow-hidden rounded-xl border shadow-sm xl:flex xl:w-88 xl:max-h-full xl:shrink-0">
	{@render panelHeader(true)}
	{@render panelContent()}
</aside>