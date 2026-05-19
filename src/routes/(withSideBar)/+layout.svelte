<script lang="ts">
	import { page } from '$app/state';
	import AppSidebar from '$lib/components/custom/app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ModeWatcher } from "mode-watcher";

	let { children } = $props();

	type MobileHeaderMeta = {
		title: string;
		description: string;
	};

	const mobileHeaderMetaByPath: Array<{ path: string; meta: MobileHeaderMeta }> = [
		{
			path: '/app/stations',
			meta: {
				title: 'Stations',
				description: 'Browse and search stations.'
			}
		},
		{
			path: '/app/browse',
			meta: {
				title: 'Browse',
				description: 'Explore more listening spaces as this section fills in.'
			}
		},
		{
			path: '/app/bring-your-own-station',
			meta: {
				title: 'Bring Your Own',
				description: 'Save custom stations in this browser.'
			}
		},
		{
			path: '/app',
			meta: {
				title: 'Discover',
				description: 'Explore popular stations.'
			}
		},
		{
			path: '/app/map',
			meta: {
				title: 'Radio Map',
				description: 'Explore stations on a world map.'
			}
		}
	];

	function matchesPath(path: string, pathname: string) {
		return pathname === path || pathname.startsWith(`${path}/`);
	}

	const mobileHeaderMeta = $derived.by(() => {
		const pathname = page.url.pathname;
		const matchedMeta = mobileHeaderMetaByPath
			.filter((entry) => matchesPath(entry.path, pathname))
			.sort((left, right) => right.path.length - left.path.length)[0]?.meta;

		return matchedMeta ?? {
			title: 'Navigation',
			description: 'Move between sections and open the sidebar.'
		};
	});
</script>

<ModeWatcher />
<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header
			class="bg-background/95 supports-backdrop-filter:bg-background/70 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:hidden"
		>
			<Sidebar.Trigger class="-ms-1" />
			<Separator orientation="vertical" class="data-[orientation=vertical]:h-4" />
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-medium">{mobileHeaderMeta.title}</p>
				<p class="text-muted-foreground truncate text-xs">{mobileHeaderMeta.description}</p>
			</div>
		</header>
		{@render children()}
	</Sidebar.Inset>
</Sidebar.Provider>

<Toaster position="top-center" richColors />