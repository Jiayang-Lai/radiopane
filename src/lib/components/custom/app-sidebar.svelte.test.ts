import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import packageJson from '../../../../package.json';

const modeWatcherMock = vi.hoisted(() => ({
	mode: {
		current: 'dark'
	},
	toggleMode: vi.fn()
}));

vi.mock('mode-watcher', () => ({
	mode: modeWatcherMock.mode,
	toggleMode: modeWatcherMock.toggleMode
}));

vi.mock('$lib/components/custom/app-sidebar-nav.svelte', async () => {
	const { default: MockSidebarNav } = await import('./app-sidebar-nav.test-double.svelte');

	return {
		default: MockSidebarNav
	};
});

import AppSidebarTestWrapper from './app-sidebar.test-wrapper.svelte';

describe('AppSidebar', () => {
	beforeEach(() => {
		modeWatcherMock.mode.current = 'dark';
		modeWatcherMock.toggleMode.mockReset();
	});

	it('renders the application shell content', () => {
		render(AppSidebarTestWrapper);

		expect(screen.getByText('Radio Pane')).toBeInTheDocument();
		expect(screen.getByText(`v${packageJson.version}`)).toBeInTheDocument();
		expect(screen.getByText('Stream what you love')).toBeInTheDocument();
		expect(screen.getByTestId('app-sidebar-nav-double')).toBeInTheDocument();
		expect(screen.getByText('Discover')).toBeInTheDocument();
		expect(screen.getByText('Stations')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Changelog' })).toHaveAttribute(
			'href',
			'/app/changelog'
		);
	});

	it('shows the light-mode action when dark mode is active', () => {
		modeWatcherMock.mode.current = 'dark';

		render(AppSidebarTestWrapper);

		expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
		expect(screen.getByText('Light mode')).toBeInTheDocument();
	});

	it('toggles mode from the footer control', async () => {
		const user = userEvent.setup();
		modeWatcherMock.mode.current = 'light';

		render(AppSidebarTestWrapper);

		await user.click(screen.getByRole('button', { name: 'Switch to dark mode' }));

		expect(modeWatcherMock.toggleMode).toHaveBeenCalledTimes(1);
		expect(screen.getByText('Dark mode')).toBeInTheDocument();
	});
});