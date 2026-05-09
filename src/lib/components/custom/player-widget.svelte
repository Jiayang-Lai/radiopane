<script lang="ts">
	import { onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { scale } from 'svelte/transition';
	import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
	import PauseIcon from '@lucide/svelte/icons/pause';
	import PlayIcon from '@lucide/svelte/icons/play';
	import RadioTowerIcon from '@lucide/svelte/icons/radio-tower';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Spinner } from '$lib/components/ui/spinner';

	type PlayerWidgetProps = {
		title: string;
		artist: string;
		station?: string;
		stationIcon?: string | null;
		showMetadataFallback?: boolean;
		collapsed?: boolean;
		isPlaying?: boolean;
		isLoading?: boolean;
		errorMessage?: string | null;
		showProgress?: boolean;
		onTogglePlayback?: () => void;
	};

	let {
		title,
		artist,
		station = 'Live radio',
		stationIcon = null,
		showMetadataFallback = false,
		collapsed = $bindable(false),
		isPlaying = false,
		isLoading = false,
		errorMessage = null,
		showProgress = false,
		onTogglePlayback
	}: PlayerWidgetProps = $props();
	let compactViewport = $state<HTMLDivElement | null>(null);
	let compactTrack = $state<HTMLDivElement | null>(null);
	let compactOverflow = $state(0);
	let stationIconFailed = $state(false);

	function togglePlayback() {
		onTogglePlayback?.();
	}

	function toggleCollapsed() {
		collapsed = !collapsed;
	}

	function updateCompactOverflow() {
		if (!compactViewport || !compactTrack) {
			compactOverflow = 0;
			return;
		}

		compactOverflow = Math.max(0, compactTrack.scrollWidth - compactViewport.clientWidth);
	}

	const compactTitle = $derived(title?.trim() || station);
	const playerLabel = $derived(errorMessage ? 'Playback failed' : 'Now playing');
	const playerLabelClass = $derived(errorMessage ? 'text-destructive' : 'text-muted-foreground');
	const hasStationIcon = $derived(Boolean(stationIcon && !stationIconFailed));
	const compactAnimationStyle = $derived(
		compactOverflow > 0
			? `--compact-overflow:${compactOverflow}px; animation-duration:${Math.max(7, compactOverflow / 18)}s;`
			: undefined
	);

	const statusMessage = $derived.by(() => {
		if (showMetadataFallback && !isLoading && !errorMessage) {
			return {
				text: 'Showing station info only',
				className: 'text-accent'
			};
		}

		if (isLoading) {
			return {
				text: 'Connecting to stream...',
				className: 'text-primary'
			};
		}

		if (errorMessage) {
			return {
				text: errorMessage,
				className: 'text-destructive'
			};
		}

		return null;
	});

	onMount(() => {
		const observer = new ResizeObserver(() => {
			updateCompactOverflow();
		});

		if (compactViewport) observer.observe(compactViewport);
		if (compactTrack) observer.observe(compactTrack);

		const frame = requestAnimationFrame(() => {
			updateCompactOverflow();
		});

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});

	$effect(() => {
		compactTitle;
		requestAnimationFrame(() => {
			updateCompactOverflow();
		});
	});

	$effect(() => {
		stationIcon;
		stationIconFailed = false;
	});
</script>

<div class="w-full min-w-0">
	{#if collapsed}
		<div class="flex justify-end">
			<div
				transition:scale={{ duration: 180, easing: cubicOut, start: 0.92 }}
				class="border-primary/25 bg-card/95 pointer-events-auto flex h-12 w-auto max-w-[calc(100vw-1rem)] items-center gap-1 rounded-full border p-1 shadow-lg backdrop-blur supports-backdrop-filter:bg-card/85 sm:max-w-72 sm:gap-2 sm:pr-1 sm:pl-1.5"
			>
				<Button
					type="button"
					variant="secondary"
					size="icon"
					class="size-9 shrink-0 rounded-full"
					onclick={togglePlayback}
					aria-label={isLoading ? 'Connecting to playback' : isPlaying ? 'Pause playback' : 'Play playback'}
				>
					{#if isLoading}
						<Spinner class="size-4.5" aria-label="Connecting to playback" />
					{:else if isPlaying}
						<PauseIcon class="size-4.5" />
					{:else}
						<PlayIcon class="ml-0.5 size-4.5" />
					{/if}
				</Button>

				<button
					type="button"
					class="hidden min-w-0 flex-1 overflow-hidden rounded-full px-2 py-1 text-left sm:block"
					onclick={toggleCollapsed}
					aria-label="Show player widget"
				>
					<div class={`${playerLabelClass} mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]`}>
						{#if hasStationIcon}
							<img
								src={stationIcon}
								alt=""
								class="size-3 rounded-[3px] object-cover"
								onerror={() => {
									stationIconFailed = true;
								}}
							/>
						{:else}
							<RadioTowerIcon class="size-3" />
						{/if}
						<span>{playerLabel}</span>
					</div>
					<div bind:this={compactViewport} class="compact-marquee text-sm font-medium">
						<div
							bind:this={compactTrack}
							class:compact-marquee-track={compactOverflow > 0}
							style={compactAnimationStyle}
						>
							<span>{compactTitle}</span>
						</div>
					</div>
				</button>

				<Button
					type="button"
					variant="ghost"
					size="icon"
					class="text-muted-foreground hover:text-foreground size-10 shrink-0 rounded-full sm:size-9"
					onclick={toggleCollapsed}
					aria-label="Show player widget"
				>
					<ChevronUpIcon class="size-4 rotate-180" />
				</Button>
			</div>
		</div>
	{:else}
		<div transition:scale={{ duration: 220, easing: cubicOut, start: 0.96 }}>
			<Card.Root class="border-primary/30 ring-primary/15 bg-card/95 pointer-events-auto relative flex w-full flex-col overflow-hidden rounded-[1.75rem] border shadow-lg ring-1 backdrop-blur supports-backdrop-filter:bg-card/85">
				<Button
				type="button"
				variant="ghost"
				size="sm"
				class="text-muted-foreground hover:text-foreground absolute top-3 right-3 z-10 h-7 rounded-full px-2.5 text-[11px]"
				onclick={toggleCollapsed}
				aria-label="Hide player widget"
			>
				Hide
				<ChevronUpIcon class="ml-1 size-3.5" />
				</Button>

				<Card.Content class="flex items-center gap-4 px-4 md:px-5">
					<div class="bg-primary/10 text-primary hidden size-12 shrink-0 items-center justify-center rounded-2xl sm:flex">
						{#if hasStationIcon}
							<img
								src={stationIcon}
								alt={station}
								class="size-12 rounded-2xl object-cover"
								onerror={() => {
									stationIconFailed = true;
								}}
							/>
						{:else}
							<RadioTowerIcon class="size-5" />
						{/if}
					</div>

					<div class="min-w-0 flex-1 pr-10 md:pr-12">
						<p class={`${playerLabelClass} text-[11px] font-semibold uppercase tracking-[0.22em]`}>{playerLabel}</p>
						<div class="mt-1 flex min-w-0 flex-col gap-0.5">
							<Card.Title class="min-w-0 truncate text-base md:text-lg">
								{title}
							</Card.Title>
							<p class="text-foreground/88 min-w-0 truncate text-sm font-medium">
								{artist}
							</p>
						</div>
						<p class="text-muted-foreground/85 mt-1 truncate text-xs uppercase tracking-[0.14em]">
							{station}
						</p>
						<div class="mt-1 min-h-4">
							{#if statusMessage}
								<p class={`${statusMessage.className} truncate text-xs font-medium`}>
									{statusMessage.text}
								</p>
							{/if}
						</div>
					</div>

					<div class="flex items-center gap-3">
						{#if showProgress}
							<div class="bg-muted hidden h-2 w-28 overflow-hidden rounded-full md:block">
								<div class:text-primary={isPlaying} class:bg-primary={isPlaying} class="bg-muted-foreground/35 h-full w-2/5 rounded-full transition-colors"></div>
							</div>
						{/if}

						<Button
							type="button"
							variant="secondary"
							size="icon"
							class="size-11 shrink-0 rounded-full"
							onclick={togglePlayback}
							aria-label={isLoading ? 'Connecting to playback' : isPlaying ? 'Pause playback' : 'Play playback'}
						>
							{#if isLoading}
								<Spinner class="size-5" aria-label="Connecting to playback" />
							{:else if isPlaying}
								<PauseIcon class="size-5" />
							{:else}
								<PlayIcon class="ml-0.5 size-5" />
							{/if}
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}
</div>

<style>
	.compact-marquee {
		overflow: hidden;
		white-space: nowrap;
	}

	.compact-marquee-track {
		display: inline-block;
		min-width: max-content;
		animation-name: compact-marquee-bounce;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
		animation-direction: alternate;
		will-change: transform;
	}

	.compact-marquee-track > span {
		display: inline-block;
	}

	@keyframes compact-marquee-bounce {
		0%,
		18% {
			transform: translateX(0);
		}

		82%,
		100% {
			transform: translateX(calc(var(--compact-overflow, 0px) * -1));
		}
	}
</style>