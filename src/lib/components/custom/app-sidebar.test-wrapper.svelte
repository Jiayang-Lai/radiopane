<script lang="ts">
	import AppSidebar from './app-sidebar.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
</script>

<Sidebar.Provider>
	<AppSidebar />
</Sidebar.Provider>