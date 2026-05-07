<script lang="ts">
  import {
    goto,
    invalidateAll,
    pushState,
    replaceState,
  } from "$app/navigation";
  import { page } from "$app/state";
  import { tick } from "svelte";
  import StationCard from "$lib/components/custom/station-card.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { Spinner } from "$lib/components/ui/spinner/index.js";
  import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
  import SearchIcon from "@lucide/svelte/icons/search";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  type Station = Awaited<PageData["stations"]>["stations"][number];

  let searchDraft = $state("");
  let isRefreshing = $state(false);
  let isSearching = $state(false);
  let localSearchQuery = $state("");
  let localSearchResults = $state<Station[] | null>(null);

  $effect(() => {
    if (!localSearchQuery) {
      searchDraft = data.query;
    }
  });

  function filterStations(stations: Station[], query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return stations;
    }

    return stations.filter((station) => {
      return [
        station.name,
        station.country,
        station.language,
        station.tags.join(" "),
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }

  function resetLocalSearch() {
    localSearchQuery = "";
    localSearchResults = null;
  }

  function buildStationsUrl(query: string, page: number) {
    const searchParams = new URLSearchParams();

    if (query) {
      searchParams.set("q", query);
    }

    if (page > 1) {
      searchParams.set("page", String(page));
    }

    return searchParams.size
      ? `/app/stations?${searchParams.toString()}`
      : "/app/stations";
  }

  function updateStationsUrl(
    query: string,
    historyMode: "push" | "replace" = "push",
  ) {
    const url = buildStationsUrl(query, 1);

    if (historyMode === "replace") {
      replaceState(url, page.state);
      return;
    }

    pushState(url, page.state);
  }

  async function handleSearchSubmit(event: SubmitEvent) {
    event.preventDefault();

    const nextQuery = searchDraft.trim();
    const activeQuery = localSearchQuery || data.query;

    if (nextQuery === activeQuery || isSearching) {
      return;
    }

    if (!nextQuery) {
      resetLocalSearch();

      if (!data.query) {
        return;
      }

      isSearching = true;

      try {
        await goto("/app/stations", { keepFocus: true, noScroll: true });
        await tick();
        await data.stations.catch(() => undefined);
      } finally {
        isSearching = false;
      }

      return;
    }

    const currentStations = await data.stations.catch(() => null);

    if (currentStations) {
      const matchedStations = filterStations(
        currentStations.stations,
        nextQuery,
      );

      if (matchedStations.length > 0) {
        updateStationsUrl(nextQuery);
        localSearchQuery = nextQuery;
        localSearchResults = matchedStations;
        return;
      }
    }

    resetLocalSearch();

    isSearching = true;

    try {
      await goto(buildStationsUrl(nextQuery, 1), {
        keepFocus: true,
        noScroll: true,
      });

      await tick();
      await data.stations.catch(() => undefined);
    } finally {
      isSearching = false;
    }
  }

  async function clearSearch() {
    searchDraft = "";
    resetLocalSearch();

    if (!data.query) {
      updateStationsUrl("", "replace");
      return;
    }

    isSearching = true;

    try {
      await goto("/app/stations", { keepFocus: true, noScroll: true });
      await tick();
      await data.stations.catch(() => undefined);
    } finally {
      isSearching = false;
    }
  }

  function handleSearchInput() {
    if (searchDraft.trim() || isSearching) {
      return;
    }

    if (!localSearchQuery && !data.query) {
      return;
    }

    void clearSearch();
  }

  async function handleRefresh() {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;

    try {
      await invalidateAll();

      // Wait for the refreshed page-data promise to be bound into props,
      // then keep the button spinner active until that promise settles.
      await tick();
      const refreshedStations = await data.stations.catch(() => null);

      if (refreshedStations && localSearchQuery) {
        localSearchResults = filterStations(
          refreshedStations.stations,
          localSearchQuery,
        );
      }
    } finally {
      isRefreshing = false;
    }
  }

  async function handleFullSearch() {
    const query = localSearchQuery.trim();

    if (!query || isSearching || isRefreshing) {
      return;
    }

    resetLocalSearch();
    isSearching = true;

    try {
      await goto(buildStationsUrl(query, 1), {
        keepFocus: true,
        noScroll: true,
        invalidateAll: true,
      });

      await tick();
      await data.stations.catch(() => undefined);
    } finally {
      isSearching = false;
    }
  }

  async function handlePageChange(nextPage: number) {
    if (isSearching || isRefreshing || nextPage === data.page || nextPage < 1) {
      return;
    }

    resetLocalSearch();
    isSearching = true;

    try {
      await goto(buildStationsUrl(data.query, nextPage), {
        keepFocus: true,
      });

      await tick();
      await data.stations.catch(() => undefined);
    } finally {
      isSearching = false;
    }
  }
</script>

<svelte:head>
  <title>Stations | Radio Pane</title>
</svelte:head>

<section class="space-y-6">
  <div class="space-y-2">
    <p class="text-primary text-sm font-semibold uppercase tracking-[0.18em]">
      Stations
    </p>
    <h1 class="font-heading text-3xl font-bold tracking-tight">
      Find Radio stations
    </h1>
    <p class="text-muted-foreground max-w-2xl text-sm sm:text-base">
      Browse and search stations around the world.
    </p>
  </div>

  <div
    class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
  >
    <form class="flex w-full sm:max-w-md" onsubmit={handleSearchSubmit}>
      <Input
        bind:value={searchDraft}
        oninput={handleSearchInput}
        type="search"
        placeholder="Search the directory by station name"
        class="h-9 rounded-r-none border-r-0"
        aria-label="Search stations"
      />

      <Button
        variant="outline"
        size="lg"
        class="h-9 rounded-l-none px-3"
        type="submit"
        disabled={isSearching}
      >
        {#if isSearching}
          <Spinner />
          Searching
        {:else}
          <SearchIcon />
          Search
        {/if}
      </Button>
    </form>

    <Button
      variant="outline"
      size="lg"
      class="h-9"
      onclick={handleRefresh}
      disabled={isRefreshing}
    >
      {#if isRefreshing}
        <Spinner />
        Refreshing
      {:else}
        Refresh
      {/if}
    </Button>
  </div>

  {#await data.stations}
    <Empty.Root class="min-h-56 rounded-none px-0 py-8">
      <Empty.Header>
        <Empty.Media
          variant="icon"
          class="bg-primary/10 text-primary size-14 rounded-full [&_svg:not([class*='size-'])]:size-7"
        >
          <Spinner class="size-7" />
        </Empty.Media>
        <Empty.Title>Loading stations</Empty.Title>
        <Empty.Description>Fetching the music :)</Empty.Description>
      </Empty.Header>
    </Empty.Root>
  {:then stations}
    {@const activeQuery = localSearchQuery || data.query}
    {@const displayedStations = localSearchResults ?? stations.stations}

    {#if displayedStations.length === 0}
      <div class="space-y-8 pt-2">
        <Separator />
        <Empty.Root class="min-h-56 rounded-none px-0 pt-0">
          <Empty.Header>
            <Empty.Title
              >{activeQuery
                ? "No stations match your search"
                : "No stations found"}</Empty.Title
            >
            <Empty.Description>
              {activeQuery
                ? "Try a different station name or clear the current search."
                : "Try refreshing or adjusting the source query."}
            </Empty.Description>
          </Empty.Header>
          {#if activeQuery}
            <Empty.Content>
              <Button
                variant="outline"
                onclick={clearSearch}
                disabled={isSearching}>Clear search</Button
              >
            </Empty.Content>
          {/if}
        </Empty.Root>
      </div>
    {:else}
      <div
        class="text-muted-foreground flex items-center justify-between text-sm"
      >
        <p>
          Showing {displayedStations.length}
          {#if localSearchResults}
            of {stations.stations.length}{/if} stations
        </p>

        {#if activeQuery}
          <p>Search: “{activeQuery}”</p>
        {/if}
      </div>

      {#if localSearchResults}
        <div class="flex items-center gap-2">
          <p class="text-muted-foreground text-sm">
            Found {displayedStations.length} stations matching “{activeQuery}”
            from {stations.stations.length} total results
          </p>

          <Button
            variant="outline"
            size="sm"
            onclick={handleFullSearch}
            disabled={isSearching || isRefreshing}
          >
            Search all stations
          </Button>
        </div>
      {/if}

      <div class="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
        {#each displayedStations as station, index}
          <StationCard {station} />
        {/each}
      </div>

      <div class="flex items-center justify-between gap-3 pt-2">
        <p class="text-muted-foreground text-sm">
          Page {data.page}
        </p>

        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            onclick={() => handlePageChange(data.page - 1)}
            disabled={data.page === 1 ||
              isSearching ||
              isRefreshing ||
              !!localSearchResults}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onclick={() => handlePageChange(data.page + 1)}
            disabled={!stations.hasNextPage ||
              isSearching ||
              isRefreshing ||
              !!localSearchResults}
          >
            Next
          </Button>
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
        <Empty.Title>Could not load stations</Empty.Title>
        <Empty.Description>
          {error instanceof Error
            ? error.message
            : "Unable to load stations right now."}
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button
          variant="outline"
          onclick={handleRefresh}
          disabled={isRefreshing}
        >
          {#if isRefreshing}
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
