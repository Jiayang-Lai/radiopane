# Radio Pane

Radio Pane is a SvelteKit web app for discovering, browsing, saving, and playing internet radio stations. It combines the [Radio Browser](https://www.radio-browser.info/) directory with browser-local custom stations, a clustered world map, and a compact player-focused interface.

Try out the application here: [radiopane](https://radio.humblehamster.com/).

## What It Does

- Discover popular stations from the [Radio Browser](https://www.radio-browser.info/) directory.
- Search and paginate the full station directory.
- Explore stations on an interactive world map with clustering.
- Infer approximate map positions for stations that have country or state metadata but no exact coordinates.
- Save your own custom stations in browser storage.
- Import and export custom stations as JSON.
- Open rich station dialogues with playback controls and Radio Browser metadata.
- Switch between light and dark themes.

## Tech Stack

- [Svelte](https://svelte.dev/)
- [SvelteKit](https://svelte.dev/docs/kit/introduction)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Leaflet](https://leafletjs.com/) for map rendering
- [Supercluster](https://github.com/mapbox/supercluster) for map clustering
- [icecast-metadata-player](https://github.com/eshaz/icecast-metadata-js/tree/main/src/icecast-metadata-player#readme) for streaming
- [Cloudflare Pages](https://pages.cloudflare.com/) for hosting

## Project Structure

Key areas of the app:

- `src/routes/(withSideBar)/app`: Main sidebar-style app surface and feature pages.
- `src/lib/radio-browser.ts`: Radio Browser fetching, normalization, pagination, and geo inference.
- `src/lib/custom-stations.ts`: Local custom-station persistence and import/export helpers.
- `src/lib/player-state.svelte.ts`: Shared playback state.
- `src/lib/components/custom`: App-specific UI components such as the sidebar, player, station card, and map panel.

## Main Routes

- `/app`: Discover page with a curated wall of popular stations.
- `/app/stations`: Searchable station directory with pagination.
- `/app/map`: Leaflet-powered world map with clustered station markers and a station inspector panel.
- `/app/bring-your-own-station`: Add, remove, import, and export browser-local stations.
- `/app/changelog`: Changelog view.
- `/app/debug-storage`: Internal/debug utility page linked from the sidebar footer.

## Data Sources

Radio Pane uses two station sources:

1. Radio Browser API for public station directory data.
2. Browser `localStorage` for user-added custom stations.

Custom stations are stored only in the current browser unless exported and imported elsewhere.

## Notable Behaviours

- Stream URLs are normalized to prefer `https` when possible.
- Directory stations are ordered by votes when browsing or searching remotely.
- The map loads geo-enabled stations with a high limit and groups them with `supercluster`.
- Stations without exact coordinates can still appear on the map using inferred state or country centroids (it can be extremely inaccurate).

## Development

Run commands from the app package root:

```sh
cd radiopane
npm install
npm run dev
```

Useful commands:

```sh
npm run dev
npm run check
npm run build
npm run preview
```

## Deployment

This project is configured for Cloudflare Pages.

```sh
npm run deploy
```
