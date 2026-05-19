import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import HomeIcon from '@lucide/svelte/icons/house';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AppSidebarNavTestWrapper from './app-sidebar-nav.test-wrapper.svelte';

let isMobileViewport = false;

const appStateMock = vi.hoisted(() => ({
	page: {
		url: {
			pathname: '/app'
		}
	}
}));

vi.mock('$app/state', () => ({
	page: appStateMock.page
}));

const items = [
	{ title: 'Discover', url: '/app', icon: HomeIcon },
	{ title: 'Stations', url: '/app/stations', icon: HomeIcon },
	{ title: 'Map', url: '/app/map', icon: HomeIcon }
];

describe('AppSidebarNav', () => {
	beforeEach(() => {
		appStateMock.page.url.pathname = '/app';
		isMobileViewport = false;
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: isMobileViewport && query.includes('767'),
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn()
			}))
		});
	});

	it('marks the most specific matching route as active', () => {
		appStateMock.page.url.pathname = '/app/stations/favorites';

		render(AppSidebarNavTestWrapper, {
			props: {
				items
			}
		});

		expect(screen.getByRole('link', { name: 'Stations' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: 'Discover' })).not.toHaveAttribute('aria-current');
		expect(screen.getByRole('link', { name: 'Map' })).not.toHaveAttribute('aria-current');
	});

	it('falls back to the item isActive flag when the current route is unknown', () => {
		appStateMock.page.url.pathname = '/unknown';

		render(AppSidebarNavTestWrapper, {
			props: {
				items: [
					{ title: 'Discover', url: '/app', icon: HomeIcon },
					{ title: 'Legacy', url: '/legacy', icon: HomeIcon, isActive: true }
				]
			}
		});

		const fallbackLink = screen.getByRole('link', { name: 'Legacy' });

		expect(fallbackLink).toHaveAttribute('aria-current', 'page');
		expect(fallbackLink).toHaveAttribute('tabindex', '-1');
	});

	it('closes the mobile sidebar after navigation', async () => {
		const user = userEvent.setup();
		appStateMock.page.url.pathname = '/app';
		isMobileViewport = true;

		render(AppSidebarNavTestWrapper, {
			props: {
				items,
				startOpenMobile: true
			}
		});

		const link = screen.getByRole('link', { name: 'Discover' });
		link.addEventListener('click', (event) => {
			event.preventDefault();
		});

		expect(screen.getByTestId('mobile-state')).toHaveTextContent('open');

		await user.click(link);

		expect(screen.getByTestId('mobile-state')).toHaveTextContent('closed');
	});
});