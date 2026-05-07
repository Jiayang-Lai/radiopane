<script lang="ts">
	import { toast } from 'svelte-sonner';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import GlobeIcon from '@lucide/svelte/icons/globe';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import StationCard from '$lib/components/custom/station-card.svelte';
	import {
		addCustomStation,
		importCustomStations,
		listCustomStations,
		removeCustomStation,
		type CustomStationDraft
	} from '$lib/custom-stations.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import type { AppStation } from '$lib/radio-browser';

	const emptyDraft = (): CustomStationDraft => ({
		name: '',
		streamUrl: '',
		favicon: '',
		homepage: '',
		country: '',
		language: '',
		tags: ''
	});

	let draft = $state(emptyDraft());
	let customStations = $state<AppStation[]>(listCustomStations());
	let formError = $state<string | null>(null);
	let isAddStationOpen = $state(true);
	let importInput: HTMLInputElement | null = $state(null);

	function resetDraft() {
		draft = emptyDraft();
	}

	function validateDraft() {
		if (!draft.name.trim()) {
			return 'Station name is required.';
		}

		if (!draft.streamUrl.trim()) {
			return 'A stream URL is required.';
		}

		try {
			new URL(draft.streamUrl.trim());
		} catch {
			return 'Stream URL must be a valid absolute URL.';
		}

		if (draft.favicon.trim()) {
			try {
				new URL(draft.favicon.trim());
			} catch {
				return 'Favicon URL must be a valid absolute URL.';
			}
		}

		if (draft.homepage.trim()) {
			try {
				new URL(draft.homepage.trim());
			} catch {
				return 'Homepage URL must be a valid absolute URL.';
			}
		}

		return null;
	}

	function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		formError = validateDraft();

		if (formError) {
			toast.error(formError);
			return;
		}

		customStations = addCustomStation(draft);
		resetDraft();
		formError = null;
		toast.success('Station saved to this browser.');
	}

	function handleDelete(station: AppStation) {
		if (!confirm(`Remove ${station.name} from your saved stations?`)) {
			return;
		}

		customStations = removeCustomStation(station.id);
		toast.success(`Removed ${station.name}.`);
	}

	function toggleAddStationSection() {
		isAddStationOpen = !isAddStationOpen;
	}

	function handleExport() {
		if (customStations.length === 0) {
			toast.error('No custom stations to export.');
			return;
		}

		const exportPayload = {
			exportedAt: new Date().toISOString(),
			stations: customStations
		};
		const exportBlob = new Blob([JSON.stringify(exportPayload, null, 2)], {
			type: 'application/json'
		});
		const exportUrl = URL.createObjectURL(exportBlob);
		const downloadLink = document.createElement('a');

		downloadLink.href = exportUrl;
		downloadLink.download = `radio-pane-custom-stations-${new Date().toISOString().slice(0, 10)}.json`;
		document.body.append(downloadLink);
		downloadLink.click();
		downloadLink.remove();
		URL.revokeObjectURL(exportUrl);

		toast.success('Custom stations exported.');
	}

	function handleImportClick() {
		importInput?.click();
	}

	async function handleImport(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const importFile = input.files?.[0];

		if (!importFile) {
			return;
		}

		try {
			const fileContent = await importFile.text();
			const importPayload = JSON.parse(fileContent);
			const nextStations = importCustomStations(importPayload);

			customStations = nextStations;
			toast.success(`Imported ${nextStations.length} custom stations.`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to import custom stations.');
		} finally {
			input.value = '';
		}
	}
</script>

<svelte:head>
	<title>Bring Your Own Station | Radio Pane</title>
</svelte:head>

<section class="space-y-8">
	<div class="space-y-2">
		<p class="text-primary text-sm font-semibold uppercase tracking-[0.18em]">
			Bring Your Own
		</p>
		<h1 class="font-heading text-3xl font-bold tracking-tight">
			Save stations from anywhere
		</h1>
		<p class="text-muted-foreground max-w-2xl text-sm sm:text-base">
			Paste stream links you find elsewhere, keep them in local storage, and play them like the directory stations. <strong>(Note: these stations are only saved in this browser and won't sync across devices!)</strong>
		</p>
	</div>

	<div class="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] xl:items-start">
		<div
			class={`border-border bg-card/70 self-start rounded-3xl border transition-all ${
				isAddStationOpen ? 'p-5 shadow-sm' : 'px-4 py-3 shadow-none sm:px-5 sm:py-4'
			}`}
		>
			<div class={`flex justify-between gap-4 ${isAddStationOpen ? 'items-start' : 'items-center'}`}>
				<div class={`min-w-0 ${isAddStationOpen ? 'space-y-1' : 'space-y-0.5'}`}>
					<h2 class="text-lg font-semibold">Add a custom station</h2>
					<p class={`text-muted-foreground text-sm ${isAddStationOpen ? '' : 'hidden'}`}>
						Saved stations stay in this browser until you remove them.
					</p>
					{#if !isAddStationOpen}
						<p class="text-muted-foreground truncate text-xs sm:text-sm">
							Form hidden. Expand to add a stream URL.
						</p>
					{/if}
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					class={`shrink-0 ${isAddStationOpen ? '' : 'self-center'}`}
					onclick={toggleAddStationSection}
					aria-expanded={isAddStationOpen}
				>
					<ChevronDownIcon class={`transition-transform ${isAddStationOpen ? 'rotate-180' : ''}`} />
					{isAddStationOpen ? 'Collapse' : 'Expand'}
				</Button>
			</div>

			{#if isAddStationOpen}
				<form class="mt-5 space-y-5" onsubmit={handleSubmit}>
					<div class="space-y-3">
						<label class="block text-sm leading-none font-medium" for="station-name">Station name</label>
					<Input id="station-name" bind:value={draft.name} placeholder="NTS Radio 1" required />
				</div>

					<div class="space-y-3">
						<label class="block text-sm leading-none font-medium" for="station-stream-url">Stream URL</label>
					<Input
						id="station-stream-url"
						bind:value={draft.streamUrl}
						type="url"
						placeholder="https://example.com/live.mp3"
						required
					/>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-3">
							<label class="block text-sm leading-none font-medium" for="station-country">Country</label>
						<Input id="station-country" bind:value={draft.country} placeholder="United Kingdom" />
					</div>
						<div class="space-y-3">
							<label class="block text-sm leading-none font-medium" for="station-language">Language</label>
						<Input id="station-language" bind:value={draft.language} placeholder="English" />
						</div>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div class="space-y-3">
							<label class="block text-sm leading-none font-medium" for="station-favicon">Favicon URL</label>
						<Input
							id="station-favicon"
							bind:value={draft.favicon}
							type="url"
							placeholder="https://example.com/logo.png"
						/>
					</div>
						<div class="space-y-3">
							<label class="block text-sm leading-none font-medium" for="station-homepage">Homepage URL</label>
						<Input
							id="station-homepage"
							bind:value={draft.homepage}
							type="url"
							placeholder="https://station.example"
						/>
						</div>
					</div>

					<div class="space-y-3">
						<label class="block text-sm leading-none font-medium" for="station-tags">Tags</label>
					<Input
						id="station-tags"
						bind:value={draft.tags}
						placeholder="electronic, ambient, talk"
					/>
					<p class="text-muted-foreground text-xs">
						Separate tags with commas. Up to 8 tags are saved.
					</p>
					</div>

					{#if formError}
						<p class="text-destructive text-sm font-medium">{formError}</p>
					{/if}

					<div class="flex flex-wrap gap-3">
						<Button type="submit" size="lg" class="h-9">
							<PlusIcon />
							Save station
						</Button>
						<Button type="button" variant="outline" size="lg" class="h-9" onclick={resetDraft}>
							Reset
						</Button>
					</div>
				</form>
			{/if}
		</div>

		<div class="space-y-4">
			<input
				bind:this={importInput}
				type="file"
				accept="application/json,.json"
				class="hidden"
				onchange={handleImport}
			/>
			<div class="flex items-end justify-between gap-3">
				<div class="space-y-1">
					<h2 class="text-lg font-semibold">Your saved stations</h2>
					<p class="text-muted-foreground text-sm">
						{customStations.length} saved {customStations.length === 1 ? 'station' : 'stations'} in local storage.
					</p>
				</div>
				<div class="flex flex-wrap justify-end gap-2">
					<Button type="button" variant="outline" size="lg" class="h-9" onclick={handleImportClick}>
						<UploadIcon />
						Import
					</Button>
					<Button
						type="button"
						variant="outline"
						size="lg"
						class="h-9"
						onclick={handleExport}
						disabled={customStations.length === 0}
					>
						<DownloadIcon />
						Export
					</Button>
					<Button href="/app/stations" variant="outline" size="lg" class="h-9">
						<GlobeIcon />
						Browse directory
					</Button>
				</div>
			</div>

			{#if customStations.length === 0}
				<Empty.Root class="min-h-72 rounded-3xl border px-6 py-10">
					<Empty.Header>
						<Empty.Media
							variant="icon"
							class="bg-primary/10 text-primary size-14 rounded-full [&_svg:not([class*='size-'])]:size-7"
						>
							<PlusIcon class="size-7" />
						</Empty.Media>
						<Empty.Title>No custom stations yet</Empty.Title>
						<Empty.Description>
							Add a custom station or import stations and they will appear here instantly.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{:else}
				<div class="grid auto-rows-fr gap-4 md:grid-cols-2">
					{#each customStations as station}
						<div class="space-y-3">
							<StationCard {station} showVotes={false}>
								{#snippet actionArea({ station })}
									<Button
										variant="destructive"
										size="sm"
                    class="h-8 rounded-lg px-3"
										onclick={(event) => {
											event.stopPropagation();
											handleDelete(station);
										}}
									>
										<Trash2Icon />
										Remove
									</Button>
								{/snippet}
							</StationCard>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>