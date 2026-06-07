<script lang="ts">
	import RadioIcon from '@lucide/svelte/icons/radio';
	import PlayCircleIcon from '@lucide/svelte/icons/play-circle';
	import StarIcon from '@lucide/svelte/icons/star';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import { Button } from '$lib/components/ui/button';
</script>

<main class="relative min-h-screen w-full overflow-hidden bg-linear-to-br from-slate-900 via-slate-800 to-slate-900">
	<!-- Animated background elements -->
	<div class="absolute inset-0 overflow-hidden">
		<div
			class="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500 opacity-20 blur-3xl animate-pulse"
		></div>
		<div
			class="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-500 opacity-20 blur-3xl animate-pulse animation-delay-2000"
		></div>
		<div
			class="absolute top-1/2 left-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400 opacity-10 blur-3xl"
		></div>
	</div>

	<!-- Content -->
	<div class="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
		<div class="mx-auto w-full max-w-3xl text-center">
			<!-- Icon -->
			<div class="mb-6 flex justify-center pt-4">
				<div
					class="rounded-2xl bg-linear-to-br from-blue-500 to-cyan-400 p-4 shadow-2xl shadow-blue-500/50"
				>
					<RadioIcon class="h-12 w-12 text-white" />
				</div>
			</div>

			<!-- Heading -->
			<h1 class="mb-6 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
				Your <span class="bg-linear-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent"
					>Radio</span
				>
				<br />
				<span class="text-4xl sm:text-5xl lg:text-6xl">Anywhere</span>
			</h1>

			<!-- Subheading -->
			<p class="mb-8 text-lg text-slate-300 sm:text-xl lg:text-2xl">
				Discover thousands of radio stations from around the world. Stream your favorite radio stations in one place.
			</p>

			<!-- Feature highlights -->
			<div class="mb-12 grid gap-4 sm:grid-cols-4">
				<div class="rounded-lg bg-slate-800/50 backdrop-blur p-4 border border-slate-700/50">
					<ZapIcon class="mx-auto mb-2 h-6 w-6 text-cyan-400" />
					<p class="text-sm font-medium text-slate-200">Instant Streaming</p>
				</div>
				<div class="rounded-lg bg-slate-800/50 backdrop-blur p-4 border border-slate-700/50">
					<RadioIcon class="mx-auto mb-2 h-6 w-6 text-blue-400" />
					<p class="text-sm font-medium text-slate-200">1000+ Stations</p>
				</div>
				<a
					href="https://github.com/Jiayang-Lai/radiopane"
					target="_blank"
					class="rounded-lg bg-slate-800/50 backdrop-blur p-4 border border-slate-700/50"
				>
					<StarIcon class="mx-auto mb-2 h-6 w-6 text-yellow-400" />
					<p class="text-sm font-medium text-slate-200">Open Source</p>
				</a>
				<div class="rounded-lg bg-slate-800/50 backdrop-blur p-4 border border-slate-700/50">
					<PlayCircleIcon class="mx-auto mb-2 h-6 w-6 text-purple-400" />
					<p class="text-sm font-medium text-slate-200">Zero Ads</p>
				</div>
			</div>

			<!-- CTA Buttons -->
			<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
				<a href="/app">
					<Button
						size="lg"
						class="bg-linear-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500 font-semibold text-lg px-8"
					>
						<PlayCircleIcon class="mr-2 h-5 w-5" />
						Start Listening
					</Button>
				</a>
				<a href="/app/stations">
					<Button
						size="lg"
						variant="outline"
						class="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white font-semibold text-lg px-8"
					>
						Explore Stations
					</Button>
				</a>
			</div>

			<!-- Trust badges -->
			<div class="mt-16 flex flex-wrap justify-center gap-6 text-sm text-slate-400">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-green-400"></div>
					<span>Live & Updated</span>
				</div>
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 rounded-full bg-green-400"></div>
					<span>Easy to Use</span>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	@keyframes pulse-slow {
		0%,
		100% {
			opacity: 0.2;
		}
		50% {
			opacity: 0.4;
		}
	}

	:global(.animation-delay-2000) {
		animation-delay: 2s;
	}

	:global(.animate-pulse) {
		animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
