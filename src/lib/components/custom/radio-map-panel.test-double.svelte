<script lang="ts">
	let {
		selectedCluster = null,
		selectedStation = null
	}: {
		selectedCluster?: { pointCount: number } | null;
		selectedStation?: { name: string } | null;
	} = $props();
</script>

<div data-testid="radio-map-panel-double">
	<span data-testid="radio-map-panel-cluster">{selectedCluster ? selectedCluster.pointCount : 'none'}</span>
	<span data-testid="radio-map-panel-station">{selectedStation ? selectedStation.name : 'none'}</span>
</div>