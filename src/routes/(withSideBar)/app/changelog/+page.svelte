<!-- Changelog here -->
<script lang="ts">
  type ChangelogEntry = {
    version: string;
    changes: string[];
  };
  const changelog: ChangelogEntry[] = [
    {
      version: "0.1.6",
      changes: [
        "Implemented virtual station list for better performance.",
      ],
    },
    {
      version: "0.1.5",
      changes: [
        "Drastically improved the UI with more adaptive layouts and better styling.",
        "Added map selection support for small display devices.",
      ],
    },
    {
      version: "0.1.4",
      changes: [
        "Fixed an issue where station dialog overflows on smaller screens.",
      ],
    },
    {
      version: "0.1.3",
      changes: [
        "Improved the radio map feature with better clustering and UX.",
      ],
    },
    {
      version: "0.1.2",
      changes: [
        "Added a radio map feature to explore stations worldwide. (Experimental)",
      ],
    },
    {
      version: "0.1.1",
      changes: [
        "Added a debug storage page to inspect localStorage data.",
      ],
    },
    {
      version: "0.1.0",
      changes: [
        "Added support for saving custom stations in localStorage.",
        "Fixed various bugs and improved performance.",
      ],
    },
    {
      version: "0.0.9",
      changes: [
        "Added support for displaying station metadata in the player widget.",
        "Improved the discover page with better station categorization.",
      ],
    },
    {
      version: "0.0.8",
      changes: [
        "Added a changelog page to keep users informed about updates.",
      ],
    },
    {
      version: "0.0.7",
      changes: [
        "Improved error handling in the player widget.",
      ],
    },
    {
      version: "0.0.6",
      changes: [
        "Improved the station card dialog with better metadata formatting.",
      ],
    },
    {
      version: "0.0.5",
      changes: [
        "Added a discover page as home page to show popular radio stations.",
        "Added support for saving currently playing station in localStorage.",
      ],
    },
    {
      version: "0.0.4",
      changes: [
        "Made player widget show current station and metadata when folded.",
      ],
    },
    {
      version: "0.0.3",
      changes: [
        "Added support for displaying ICY metadata from radio streams.",
      ],
    },
    {
      version: "0.0.2",
      changes: [
        "Improved the application sidebar with better navigation and icons.",
      ],
    },
    {
      version: "0.0.1",
      changes: [
        "Initial release of RadioPane 🎉🎉",
        "Added support for browsing and playing radio stations.",
        "Implemented a basic user interface.",
      ],
    },
  ];
</script>

<section class="space-y-6 px-2 pt-2 pb-2 md:px-2 md:pt-2 lg:px-4 lg:pt-4 lg:pb-4">
  <div class="space-y-2">
    <p class="text-primary text-sm font-semibold uppercase tracking-[0.18em]">
      Changelog
    </p>
    <h1 class="font-heading text-3xl font-bold tracking-tight">
      Application Changelog
    </h1>
    <p class="text-muted-foreground max-w-2xl text-sm sm:text-base">
      Check out the latest updates and changes in RadioPane.
    </p>
  </div>

  {#each changelog as entry}
    <div class="space-y-4">
      <h2 class="font-heading text-2xl font-bold tracking-tight">
        Version {entry.version}
      </h2>
      <!-- The list should respect the horizontal padding -->
      <ul class="list-disc list-outside pl-5 space-y-1 text-sm">
        {#each entry.changes as change}
          <li>{change}</li>
        {/each}
      </ul>
    </div>
  {/each}
</section>
