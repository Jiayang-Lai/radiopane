import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

afterEach(() => {
	cleanup();
});

if (typeof globalThis.ResizeObserver === 'undefined') {
	class MockResizeObserver implements ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	}

	globalThis.ResizeObserver = MockResizeObserver;
}

if (typeof globalThis.requestAnimationFrame === 'undefined') {
	globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
		setTimeout(() => callback(performance.now()), 0);
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
	globalThis.cancelAnimationFrame = (handle: number) => {
		clearTimeout(handle);
	};
}

if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener() {},
			removeEventListener() {},
			addListener() {},
			removeListener() {},
			dispatchEvent() {
				return false;
			}
		})
	});
}