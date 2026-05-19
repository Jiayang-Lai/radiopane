<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import StationCard from "$lib/components/custom/station-card.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import type { PageData } from "./$types";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";

  let { data }: { data: PageData } = $props();
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
  <title>Discover | Radio Pane</title>
</svelte:head>

<section class="flex flex-1 flex-col gap-8 px-2 pt-2 pb-2 md:px-2 md:pt-2 lg:px-4 lg:pt-4 lg:pb-4">
  <div class="space-y-2">
    <p class="text-primary text-sm font-semibold uppercase tracking-[0.18em]">
      Discover
    </p>
    <h1 class="font-heading text-3xl font-bold tracking-tight">
      Discover Radio Stations
    </h1>
    <p class="text-muted-foreground max-w-2xl text-sm sm:text-base">
      Explore thousands of radio stations from around the world. Find new music,
      news, and talk shows to enjoy.
    </p>
  </div>

  <div>
    {#await data.popularStations}
      <Empty.Root class="min-h-56 rounded-none px-0 py-8">
        <Empty.Header>
          <Empty.Media
            variant="icon"
            class="bg-primary/10 text-primary size-14 rounded-full [&_svg:not([class*='size-'])]:size-7"
          >
            <Spinner class="size-7" />
          </Empty.Media>
          <Empty.Title>Loading popular stations</Empty.Title>
          <Empty.Description
            >Building the discover wall for the highest-voted streams.</Empty.Description
          >
        </Empty.Header>
      </Empty.Root>
    {:then popularStations}
      {#if popularStations.stations.length === 0}
        <Empty.Root class="min-h-56 rounded-none px-0 py-8">
          <Empty.Header>
            <Empty.Title>No popular stations available</Empty.Title>
            <Empty.Description
              >Try again in a moment to reload the discover wall.</Empty.Description
            >
          </Empty.Header>
          <Empty.Content>
            <Button
              variant="outline"
              onclick={handleRetry}
              disabled={isRetrying}
            >
              {#if isRetrying}
                <Spinner />
                Retrying
              {:else}
                Retry
              {/if}
            </Button>
          </Empty.Content>
        </Empty.Root>
      {:else}
        <div class="space-y-5">
          <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {#each popularStations.stations as station, index}
              <div class="h-full">
                <StationCard {station} rank={index + 1} />
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {:catch error}
      <Empty.Root class="min-h-56 rounded-none px-0 py-8">
        <Empty.Header>
          <Empty.Media
            variant="icon"
            class="bg-destructive/10 text-destructive size-14 rounded-full [&_svg:not([class*='size-'])]:size-7"
          >
            <TriangleAlertIcon class="size-7" />
          </Empty.Media>
          <Empty.Title>Could not load popular stations</Empty.Title>
          <Empty.Description
            >{error instanceof Error
              ? error.message
              : "Unable to load stations right now."}</Empty.Description
          >
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
  </div>
</section>
