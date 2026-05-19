<script lang="ts">
	import type { Component } from 'svelte';
	import AppSidebarNav from './app-sidebar-nav.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { setSidebar } from '$lib/components/ui/sidebar/context.svelte.js';

	type NavItem = {
		title: string;
		url: string;
		icon: Component<{ class?: string }>;
		isActive?: boolean;
	};

	let {
		items,
		startOpenMobile = false
	}: {
		items: NavItem[];
		startOpenMobile?: boolean;
	} = $props();

	const sidebar = setSidebar({
		open: () => true,
		setOpen: () => {}
	});

	$effect(() => {
		sidebar.setOpenMobile(startOpenMobile);
	});
</script>

<Tooltip.Provider>
	<AppSidebarNav {items} />

	<p data-testid="mobile-state">{sidebar.openMobile ? 'open' : 'closed'}</p>
</Tooltip.Provider>