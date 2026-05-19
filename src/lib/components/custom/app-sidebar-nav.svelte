<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';
	import type { Component } from 'svelte';

	type NavItem = {
		title: string;
		url: string;
		icon: Component<{ class?: string }>;
		isActive?: boolean;
	};

	let { items }: { items: NavItem[] } = $props();

	const sidebar = useSidebar();

	function matchesPath(url: string, pathname: string) {
		if (url === '/') {
			return pathname === '/';
		}

		if (url === '/app') {
			return pathname === '/app';
		}

		return pathname === url || pathname.startsWith(`${url}/`);
	}

	const activeUrl = $derived.by(() => {
		const pathname = page.url.pathname;
		const matchedItem = items
			.filter((item) => matchesPath(item.url, pathname))
			.sort((left, right) => right.url.length - left.url.length)[0];

		return matchedItem?.url;
	});

	const hasKnownActiveItem = $derived(!!activeUrl);

	function isItemActive(url: string, fallback = false) {
		return activeUrl === url || (!activeUrl && fallback);
	}

	function handleNavigationClick() {
		if (sidebar.isMobile) {
			sidebar.setOpenMobile(false);
		}
	}
</script>

<Sidebar.Menu>
	{#each items as item}
		<Sidebar.MenuItem>
			<Sidebar.MenuButton
				isActive={isItemActive(item.url, item.isActive)}
				tooltipContent={item.title}
				class="transition-colors duration-200 ease-out hover:bg-sidebar-accent/80"
			>
				{#snippet child({ props })}
					<a
						{...props}
						href={item.url}
						tabindex={hasKnownActiveItem ? undefined : -1}
						onclick={handleNavigationClick}
						aria-current={isItemActive(item.url, item.isActive) ? 'page' : undefined}
					>
						<item.icon class="size-4" />
						<span class="transition-transform duration-200 ease-out group-hover/menu-button:translate-x-0.5">{item.title}</span>
					</a>
				{/snippet}
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>
	{/each}
</Sidebar.Menu>