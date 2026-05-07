<script lang="ts">
	import { playerState, togglePlayback } from '$lib/player-state.svelte.js';
	import PlayerWidget from '$lib/components/custom/player-widget.svelte';

	let { children } = $props();

	const stationMeta = $derived.by(() => {
		const station = playerState.currentStation;

		if (!station) {
			return {
				title: '',
				artist: '',
				station: 'Live radio'
			};
		}

		const metadataTitle = playerState.metadataTitle?.trim();
		const metadataArtist = playerState.metadataArtist?.trim();
		const fallbackArtist = [station.country, station.language].filter(Boolean).join(' · ');
		const fallbackStation = station.tags.length > 0 ? station.tags.join(' · ') : 'Live radio';

		return {
			title: metadataTitle || station.name,
			artist: metadataArtist || fallbackArtist,
			station: station.name || fallbackStation,
			stationIcon: station.favicon,
			showMetadataFallback: playerState.metadataUnavailable && !metadataTitle && !metadataArtist
		};
	});

	const playingTabTitle = $derived.by(() => {
		const station = playerState.currentStation;

		if (!playerState.isPlaying || !station) {
			return null;
		}

		const streamTitle = playerState.metadataTitle?.trim();
		const streamArtist = playerState.metadataArtist?.trim();
		const stationName = station.name?.trim() || 'Live radio';
		const streamLabel = streamTitle
			? streamArtist && streamArtist !== streamTitle
				? `${streamTitle} - ${streamArtist}`
				: streamTitle
			: null;

		if (!streamLabel || streamLabel === stationName) {
			return stationName;
		}

		return `${streamLabel} | ${stationName}`;
	});
</script>

<svelte:head>
	{#if playingTabTitle}
		<title>{playingTabTitle}</title>
	{/if}
</svelte:head>

<div class="flex flex-1 flex-col px-2 pt-2 pb-0 sm:px-4 sm:pt-4 md:px-6 md:pt-6">
	<div class="flex flex-1 flex-col pb-2">
		{@render children()}
	</div>

	{#if playerState.currentStation}
		<div class="pointer-events-none sticky bottom-4 z-30 mt-4 w-full self-stretch">
			<PlayerWidget
				title={stationMeta.title}
				artist={stationMeta.artist}
				station={stationMeta.station}
				stationIcon={stationMeta.stationIcon}
				showMetadataFallback={stationMeta.showMetadataFallback}
				isPlaying={playerState.isPlaying}
				isLoading={playerState.isLoading}
				errorMessage={playerState.errorMessage}
				showProgress={false}
				onTogglePlayback={togglePlayback}
			/>
		</div>
	{/if}
</div>