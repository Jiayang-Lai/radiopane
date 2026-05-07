<script lang="ts" module>
	import HomeIcon from '@lucide/svelte/icons/house';
	import CirclePlusIcon from '@lucide/svelte/icons/circle-plus';
	import MapIcon from '@lucide/svelte/icons/map';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import RadioIcon from '@lucide/svelte/icons/radio';
	import SunIcon from '@lucide/svelte/icons/sun';
	import ScrollTextIcon from '@lucide/svelte/icons/scroll-text';
	import packageJson from '../../../../package.json';

	const options = {
		appName: 'Radio Pane',
		appVersion: `v${packageJson.version}`,
		navItems: [
			{
				title: 'Discover',
				url: '/app',
				icon: HomeIcon
			},
			{
				title: 'Stations',
				url: '/app/stations',
				icon: RadioIcon
			},
			{
				title: 'Radio Map',
				url: '/app/map',
				icon: MapIcon
			},
			{
				title: 'Bring Your Own Station',
				url: '/app/bring-your-own-station',
				icon: CirclePlusIcon
			},
		]
	};
</script>

<script lang="ts">
	import AppSidebarNav from '$lib/components/custom/app-sidebar-nav.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { mode, toggleMode } from 'mode-watcher';
	import type { ComponentProps } from 'svelte';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();

	const isDarkMode = $derived(mode.current !== 'light');
	const modeToggleLabel = $derived(isDarkMode ? 'Switch to light mode' : 'Switch to dark mode');
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header class="border-sidebar-border border-b px-3 py-4 group-data-[collapsible=icon]:px-2">
		<a
			href="/app"
			class="flex w-full items-center gap-3 rounded-lg transition-colors hover:bg-sidebar-accent group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:self-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:px-0"
		>
			<div class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-lg group-data-[collapsible=icon]:bg-transparent">
				<RadioIcon class="size-5" />
			</div>
			<div class="min-w-0 group-data-[collapsible=icon]:hidden">
				<p class="truncate text-sm font-semibold">{options.appName} <span class="text-muted-foreground text-xs font-medium">{options.appVersion}</span></p>
				<p class="text-muted-foreground text-xs">Stream what you love</p>
			</div>
		</a>
	</Sidebar.Header>
	<Sidebar.Content class="px-2 py-3">
		<AppSidebarNav items={options.navItems} />
	</Sidebar.Content>
	<Sidebar.Footer class="border-sidebar-border border-t px-2 py-3">
		<div class="flex items-center justify-between gap-3 group-data-[collapsible=icon]:justify-center">
			<p class="text-muted-foreground px-2 text-xs leading-relaxed group-data-[collapsible=icon]:hidden">
				Made with
				<a
					href="/app/debug-storage"
					class="text-foreground hover:text-primary px-0.5 transition-colors"
					aria-label="Open debug storage page"
					title="Open debug storage page"
				>
					&#10084;&#65039;
				</a>
				by <a href="https://github.com/Jiayang-Lai" class="text-foreground hover:text-primary px-0.5 transition-colors" target="_blank" aria-label="Open developer's GitHub" title="Open developer's GitHub">JL</a>
			</p>
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						onclick={toggleMode}
						tooltipContent={modeToggleLabel}
						class="text-muted-foreground hover:text-foreground"
						aria-label={modeToggleLabel}
						title={modeToggleLabel}
					>
						{#if isDarkMode}
							<SunIcon class="size-4" />
							<span>Light mode</span>
						{:else}
							<MoonIcon class="size-4" />
							<span>Dark mode</span>
						{/if}
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
				<Sidebar.MenuItem>
					<Sidebar.MenuButton
						tooltipContent="Open changelog page"
						class="text-muted-foreground hover:text-foreground"
						aria-label="Open changelog page"
						title="Open changelog page"
					>
						<a href="/app/changelog" class="flex items-center gap-2">
							<ScrollTextIcon class="size-4" />
							<span>Changelog</span>
						</a>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</div>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
