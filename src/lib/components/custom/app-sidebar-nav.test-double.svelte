<script lang="ts">
	let { items = [] }: { items?: Array<{ title: string; url: string }> } = $props();
</script>

<div data-testid="app-sidebar-nav-double">
	{#each items as item}
		<span>{item.title}</span>
	{/each}
</div>