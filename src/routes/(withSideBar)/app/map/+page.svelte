<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import RadioMap from '$lib/components/custom/radio-map.svelte';
  import * as Empty from '$lib/components/ui/empty/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
  import { Spinner } from '$lib/components/ui/spinner/index.js';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
	let isIntroCollapsed = $state(false);
  let isRetrying = $state(false);

  async function handleRetry() {
    if (isRetrying) {
      return;
    }

    isRetrying = true;

    try {
      await invalidateAll();
    } finally {
      isRetrying = false;
    }
  }
</script>

<svelte:head>
	<title>Radio Map | Radio Pane</title>
</svelte:head>

<section class="flex min-h-0 flex-1 flex-col px-2 pt-2 md:px-2 md:pt-2 lg:px-4 lg:pt-4 lg:pb-4">
	<!-- <div class="px-3 py-2.5 transition-all sm:px-4 sm:py-3">
    <div class="min-w-0 space-y-0.5 sm:space-y-1">
      <p class="text-primary text-sm font-semibold uppercase tracking-[0.18em]">
        Radio Map
        <span class="bg-muted text-muted-foreground mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border border-current/10">
          <Button
            variant="ghost"
            size="icon"
            class="size-3 rounded-full p-0 data-[state=open]:bg-current/10"
            onclick={() => (isIntroCollapsed = !isIntroCollapsed)}
            aria-label={isIntroCollapsed ? 'Expand intro' : 'Collapse intro'}
          >
          <ChevronDownIcon class={`size-2 transition-transform ${!isIntroCollapsed ? 'rotate-180' : ''}`} />
          </Button>
        </span>
      </p>
      {#if !isIntroCollapsed}
        <h1 class="font-heading text-xl font-bold tracking-tight sm:text-3xl">
          Browse stations on the world map
        </h1>
      {/if}
    </div>

		{#if !isIntroCollapsed}
			<p class="text-muted-foreground max-w-2xl pt-1.5 text-sm sm:pt-2 sm:text-base">
				Explore stations around the world.
			</p>
		{/if}
	</div> -->

  {#await data.stations}
    <Empty.Root class="min-h-88 rounded-none px-0 py-8 sm:min-h-112 xl:min-h-128">
      <Empty.Header>
        <Empty.Media
          variant="icon"
          class="bg-primary/10 text-primary size-14 rounded-full [&_svg:not([class*='size-'])]:size-7"
        >
          <Spinner class="size-7" />
        </Empty.Media>
        <Empty.Title>Loading mapped stations</Empty.Title>
        <Empty.Description>
          Preparing the world map with station coordinates and clustering data.
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  {:then stations}
    <RadioMap {stations} />
  {:catch error}
    <Empty.Root class="min-h-88 rounded-none px-0 py-8 sm:min-h-112 xl:min-h-128">
      <Empty.Header>
        <Empty.Media
          variant="icon"
          class="bg-destructive/10 text-destructive size-14 rounded-full [&_svg:not([class*='size-'])]:size-7"
        >
          <TriangleAlertIcon class="size-7" />
        </Empty.Media>
        <Empty.Title>Could not load map stations</Empty.Title>
        <Empty.Description>
          {error instanceof Error ? error.message : 'Unable to load stations right now.'}
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button variant="outline" onclick={handleRetry} disabled={isRetrying}>
          {#if isRetrying}
            <Spinner />
            Retrying
          {:else}
            Retry
          {/if}
        </Button>
      </Empty.Content>
    </Empty.Root>
  {/await}
</section>