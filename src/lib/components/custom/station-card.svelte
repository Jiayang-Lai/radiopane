<script lang="ts">
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import type { Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { cn } from '$lib/utils.js';
	import { playerState, playStation, togglePlayback } from '$lib/player-state.svelte.js';
	import type { AppStation } from '$lib/radio-browser';

	let {
		station = null,
		rank,
		showVotes = true,
		actionArea
	}: {
		station?: AppStation | null;
		rank?: number;
		showVotes?: boolean;
		actionArea?: Snippet<[{ station: AppStation }]>;
	} = $props();

	const isCurrentStation = $derived(!!station && playerState.currentStation?.id === station.id);
	const isActive = $derived(isCurrentStation && playerState.isPlaying);
	const isLoadingCurrent = $derived(isCurrentStation && playerState.isLoading);
	const currentError = $derived(isCurrentStation ? playerState.errorMessage : null);
	const stationMeta = $derived(
		station ? [station.country, station.language].filter(Boolean).join(' · ') : ''
	);
	const formattedVotes = $derived(station ? station.votes.toLocaleString() : '0');
	const formattedRadioBrowserData = $derived(
		station ? JSON.stringify(station.radioBrowser, null, 2) : ''
	);
	let didCopyStreamUrl = $state(false);
	let copyResetTimeout: ReturnType<typeof setTimeout> | null = null;

	function handlePlaybackToggle() {
		if (!station) {
			return;
		}

		if (isCurrentStation) {
			togglePlayback();
			return;
		}

		playStation(station);
	}

	function handlePlaybackButtonClick(event: MouseEvent) {
		event.stopPropagation();
		handlePlaybackToggle();
	}

	function handlePlaybackButtonKeydown(event: KeyboardEvent) {
		event.stopPropagation();
	}

	function handleStreamLinkInteraction(event: MouseEvent | KeyboardEvent) {
		event.stopPropagation();
	}

	async function handleCopyStreamUrl() {
		if (!station) {
			return;
		}

		try {
			await navigator.clipboard.writeText(station.streamUrl);
			didCopyStreamUrl = true;

			if (copyResetTimeout) {
				clearTimeout(copyResetTimeout);
			}

			copyResetTimeout = setTimeout(() => {
				didCopyStreamUrl = false;
			}, 1500);
		} catch {
			didCopyStreamUrl = false;
		}
	}
</script>

	{#if station}
		<Dialog.Root>
			<Dialog.Trigger>
				{#snippet child({ props })}
					<div {...props} class="h-full outline-none">
						<Card.Root class={cn('border-border h-full cursor-pointer transition-colors ring-1 ring-transparent hover:bg-accent/30 focus-visible:ring-primary/30', isCurrentStation && 'border-primary/60 ring-primary/20')}>
							<Card.Header class="flex flex-row items-start gap-4 space-y-0">
								<div class="relative shrink-0 pt-1 pl-1">
									{#if rank !== undefined}
										<Badge variant="default" class="bg-primary text-primary-foreground ring-card absolute -top-2 -left-2 text-[12px] font-semibold shadow-md opacity-85">
											#{rank}
										</Badge>
									{/if}
									<div class="bg-muted flex size-14 items-center justify-center overflow-hidden rounded-2xl">
										{#if station.favicon}
											<img src={station.favicon} alt={station.name} class="size-full object-cover" />
										{:else}
											<span class="text-lg font-semibold">{station.name.slice(0, 1)}</span>
										{/if}
									</div>
								</div>
								<div class="min-w-0 space-y-1">
									<Card.Title class="truncate text-base">{station.name}</Card.Title>
									<Card.Description>{stationMeta}</Card.Description>
								</div>
							</Card.Header>

							<Card.Content>
								{#if station.tags.length > 0}
									<div class="flex flex-wrap gap-2">
										{#each station.tags as tag}
											<span class="bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 text-xs font-medium">
												{tag}
											</span>
										{/each}
									</div>
								{/if}

								{#if currentError}
									<div class="mt-3 space-y-2">
										<p class="text-destructive text-sm font-medium">{currentError}</p>
										<Button
											href={station.streamUrl}
											target="_blank"
											rel="noreferrer"
											variant="link"
											size="sm"
											class="text-primary h-auto px-0"
											onclick={handleStreamLinkInteraction}
											onkeydown={handleStreamLinkInteraction}
										>
											Open stream directly
										</Button>
									</div>
								{/if}
							</Card.Content>

							<Card.Footer class={cn(
								'text-muted-foreground mt-auto flex items-center gap-3 px-4 text-sm group-data-[size=sm]/card:px-3',
								showVotes ? 'justify-between' : 'justify-end'
							)}>
								{#if showVotes}
									<span>{isLoadingCurrent ? 'Connecting...' : `${formattedVotes} votes`}</span>
								{/if}
								<div class="flex items-center gap-2">
									{#if actionArea}
										<div class="flex items-center gap-2">
											{@render actionArea({ station })}
										</div>
									{/if}
									<Button
										type="button"
										variant={isActive ? 'default' : 'secondary'}
										size="sm"
										class="h-8 rounded-lg px-3"
										onclick={handlePlaybackButtonClick}
										onkeydown={handlePlaybackButtonKeydown}
										disabled={isLoadingCurrent}
									>
										{#if isActive}
											Pause
										{:else if isLoadingCurrent}
											Loading...
										{:else if isCurrentStation}
											Resume
										{:else}
											Play
										{/if}
									</Button>
								</div>
							</Card.Footer>
						</Card.Root>
					</div>
				{/snippet}
			</Dialog.Trigger>

			<Dialog.Content class="flex max-h-[calc(100svh-1rem)] flex-col gap-0 p-0 overflow-hidden sm:max-h-[calc(100svh-2rem)] sm:max-w-lg">
				<div class="bg-muted/40 flex items-start gap-4 border-b px-6 py-5">
					<div class="bg-background flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/5">
						{#if station.favicon}
							<img src={station.favicon} alt={station.name} class="size-full object-cover" />
						{:else}
							<span class="text-xl font-semibold">{station.name.slice(0, 1)}</span>
						{/if}
					</div>
					<Dialog.Header class="pr-10">
						<div class="flex flex-wrap items-center gap-2">
							<Dialog.Title class="text-foreground text-lg font-semibold">{station.name}</Dialog.Title>
							{#if rank !== undefined}
								<Badge variant="secondary">Top #{rank}</Badge>
							{/if}
						</div>
						<Dialog.Description class="text-sm">{stationMeta}</Dialog.Description>
					</Dialog.Header>
				</div>

				<div class="min-h-0 overflow-y-auto space-y-5 px-6 py-5 text-sm">
					<div class={`grid gap-3 ${showVotes ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
						{#if showVotes}
							<div class="bg-muted/50 rounded-xl p-3">
								<p class="text-muted-foreground text-xs uppercase tracking-[0.16em]">Votes</p>
								<p class="mt-1 text-base font-semibold">{formattedVotes}</p>
							</div>
						{/if}
						<div class="bg-muted/50 rounded-xl p-3">
							<p class="text-muted-foreground text-xs uppercase tracking-[0.16em]">Country</p>
							<p class="mt-1 text-base font-semibold">{station.country}</p>
						</div>
						<div class="bg-muted/50 rounded-xl p-3">
							<p class="text-muted-foreground text-xs uppercase tracking-[0.16em]">Language</p>
							<p class="mt-1 text-base font-semibold">{station.language}</p>
						</div>
					</div>

					<div class="space-y-2">
						<p class="text-muted-foreground text-xs uppercase tracking-[0.16em]">Tags</p>
						{#if station.tags.length > 0}
							<div class="flex flex-wrap gap-2">
								{#each station.tags as tag}
									<Badge variant="outline">{tag}</Badge>
								{/each}
							</div>
						{:else}
							<p class="text-muted-foreground">No tags available for this station.</p>
						{/if}
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between gap-3">
							<p class="text-muted-foreground text-xs uppercase tracking-[0.16em]">Stream URL</p>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								class="text-muted-foreground hover:text-foreground"
								onclick={handleCopyStreamUrl}
								aria-label={didCopyStreamUrl ? 'Copied stream URL' : 'Copy stream URL'}
								title={didCopyStreamUrl ? 'Copied' : 'Copy stream URL'}
							>
								{#if didCopyStreamUrl}
									<CheckIcon class="text-green-400 size-3.5" />
								{:else}
									<CopyIcon class="size-3.5" />
								{/if}
							</Button>
						</div>
						<p class="bg-muted/50 rounded-xl break-all p-3 pr-4 font-mono text-xs">{station.streamUrl}</p>
					</div>

					{#if currentError}
						<div class="bg-destructive/10 text-destructive space-y-2 rounded-xl px-4 py-3 font-medium">
							<p>{currentError}</p>
							<Button
								href={station.streamUrl}
								target="_blank"
								rel="noreferrer"
								variant="link"
								size="sm"
								class="text-destructive h-auto px-0"
								onclick={handleStreamLinkInteraction}
								onkeydown={handleStreamLinkInteraction}
							>
								Open stream directly
							</Button>
						</div>
					{/if}

					<div class="space-y-2">
						<p class="text-muted-foreground text-xs uppercase tracking-[0.16em]">Radio Browser Data</p>
						<pre class="bg-muted/50 max-h-80 overflow-auto rounded-xl p-3 text-xs leading-5 whitespace-pre-wrap break-all">{formattedRadioBrowserData}</pre>
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	{/if}