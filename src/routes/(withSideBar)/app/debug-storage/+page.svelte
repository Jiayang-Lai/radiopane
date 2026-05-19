<script lang="ts">
	import { browser } from '$app/environment';
	import { toast } from 'svelte-sonner';
	import BugIcon from '@lucide/svelte/icons/bug';
	import RefreshCcwIcon from '@lucide/svelte/icons/refresh-ccw';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { CUSTOM_STATIONS_STORAGE_KEY } from '$lib/custom-stations.js';
	import { CURRENT_STATION_STORAGE_KEY, stopPlayback } from '$lib/player-state.svelte.js';

	type StorageEntry = {
		key: string;
		rawValue: string;
		formattedValue: string;
		isJson: boolean;
	};

	const appStorageKeys = [CUSTOM_STATIONS_STORAGE_KEY, CURRENT_STATION_STORAGE_KEY];

	let storageEntries = $state<StorageEntry[]>([]);

	function formatStorageValue(value: string): Pick<StorageEntry, 'formattedValue' | 'isJson'> {
		try {
			return {
				formattedValue: JSON.stringify(JSON.parse(value), null, 2),
				isJson: true
			};
		} catch {
			return {
				formattedValue: value,
				isJson: false
			};
		}
	}

	function refreshStorageEntries() {
		if (!browser) {
			storageEntries = [];
			return;
		}

		storageEntries = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
			.filter((key): key is string => !!key)
			.sort((left, right) => left.localeCompare(right))
			.map((key) => {
				const rawValue = localStorage.getItem(key) ?? '';
				const { formattedValue, isJson } = formatStorageValue(rawValue);

				return {
					key,
					rawValue,
					formattedValue,
					isJson
				};
			});
	}

	function isAppStorageKey(key: string) {
		return appStorageKeys.includes(key);
	}

	async function handleResetAppStorage() {
		if (!browser) {
			return;
		}

		if (!confirm('Reset Radio Pane local storage items? This clears saved custom stations and the remembered current station.')) {
			return;
		}

		stopPlayback();
		for (const key of appStorageKeys) {
			localStorage.removeItem(key);
		}

		refreshStorageEntries();
		toast.success('Radio Pane local storage reset.');
	}

	async function handleWipeStorage() {
		if (!browser) {
			return;
		}

		if (!confirm('Wipe all localStorage for this site? This may also clear theme and other unrelated saved preferences.')) {
			return;
		}

		stopPlayback();
		localStorage.clear();
		refreshStorageEntries();
		toast.success('All local storage wiped for this site.');
	}

	refreshStorageEntries();
</script>

<svelte:head>
	<title>Debug Storage | Radio Pane</title>
</svelte:head>

<section class="space-y-8 px-2 pt-2 pb-2 md:px-2 md:pt-2 lg:px-4 lg:pt-4 lg:pb-4">
	<div class="space-y-2">
		<p class="text-primary text-sm font-semibold uppercase tracking-[0.18em]">
			Debug
		</p>
		<h1 class="font-heading text-3xl font-bold tracking-tight">
			Inspect browser storage
		</h1>
		<p class="text-muted-foreground max-w-3xl text-sm sm:text-base">
			Review what this site currently has in localStorage, then reset Radio Pane keys only or wipe the entire origin storage.
		</p>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:items-start">
		<Card.Root class="bg-card/70 rounded-3xl border shadow-sm">
			<Card.Header class="space-y-3">
				<Card.Title>Storage actions</Card.Title>
				<Card.Description>
					Detected {storageEntries.length} {storageEntries.length === 1 ? 'entry' : 'entries'} in localStorage.
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex flex-wrap gap-3">
					<Button type="button" variant="outline" class="h-9" onclick={refreshStorageEntries}>
						<RefreshCcwIcon />
						Refresh
					</Button>
					<Button type="button" variant="outline" class="h-9" onclick={handleResetAppStorage}>
						<RotateCcwIcon />
						Reset app keys
					</Button>
					<Button type="button" variant="destructive" class="h-9" onclick={handleWipeStorage}>
						<Trash2Icon />
						Wipe all storage
					</Button>
				</div>
				<div class="text-muted-foreground space-y-2 text-sm">
					<p>Reset removes only:</p>
					<ul class="list-disc pl-5">
						<li>{CUSTOM_STATIONS_STORAGE_KEY}</li>
						<li>{CURRENT_STATION_STORAGE_KEY}</li>
					</ul>
					<p>Wipe clears every localStorage item for this site origin.</p>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="space-y-4">
			{#if storageEntries.length === 0}
				<Empty.Root class="min-h-72 rounded-3xl border px-6 py-10">
					<Empty.Header>
						<Empty.Media
							variant="icon"
							class="bg-primary/10 text-primary size-14 rounded-full [&_svg:not([class*='size-'])]:size-7"
						>
							<BugIcon class="size-7" />
						</Empty.Media>
						<Empty.Title>No localStorage entries</Empty.Title>
						<Empty.Description>
							This browser origin is currently empty.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				{#each storageEntries as entry}
					<Card.Root class="rounded-3xl border">
						<Card.Header class="gap-2 sm:flex-row sm:items-start sm:justify-between">
							<div class="space-y-1">
								<Card.Title class="break-all text-base">{entry.key}</Card.Title>
								<Card.Description>
									{entry.rawValue.length.toLocaleString()} characters · {entry.isJson ? 'JSON' : 'Plain text'}
								</Card.Description>
							</div>
							<span class={`rounded-full px-2.5 py-1 text-xs font-medium ${isAppStorageKey(entry.key) ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
								{isAppStorageKey(entry.key) ? 'Radio Pane' : 'Other'}
							</span>
						</Card.Header>
						<Card.Content>
							<pre class="bg-muted/50 max-h-96 overflow-auto rounded-2xl p-4 text-xs leading-5 whitespace-pre-wrap break-all">{entry.formattedValue}</pre>
						</Card.Content>
					</Card.Root>
				{/each}
			{/if}
		</div>
	</div>
</section>