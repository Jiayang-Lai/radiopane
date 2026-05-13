import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('svelte/transition', () => ({
	scale: () => ({
		duration: 0
	})
}));

import PlayerWidget from './player-widget.svelte';

describe('PlayerWidget', () => {
	it('renders the main playback metadata', () => {
		render(PlayerWidget, {
			props: {
				title: 'Night Drive',
				artist: 'Chromatics',
				station: 'Radio Pane FM'
			}
		});

		expect(screen.getByText('Now playing')).toBeInTheDocument();
		expect(screen.getByText('Night Drive')).toBeInTheDocument();
		expect(screen.getByText('Chromatics')).toBeInTheDocument();
		expect(screen.getByText('Radio Pane FM')).toBeInTheDocument();
		expect(screen.getByLabelText('Play playback')).toBeInTheDocument();
	});

	it('invokes the playback callback when the control is clicked', async () => {
		const user = userEvent.setup();
		const onTogglePlayback = vi.fn();

		render(PlayerWidget, {
			props: {
				title: 'Night Drive',
				artist: 'Chromatics',
				onTogglePlayback
			}
		});

		await user.click(screen.getByLabelText('Play playback'));

		expect(onTogglePlayback).toHaveBeenCalledTimes(1);
	});

	it('collapses into the compact player when hidden', async () => {
		const user = userEvent.setup();

		render(PlayerWidget, {
			props: {
				title: 'Night Drive',
				artist: 'Chromatics'
			}
		});

		await user.click(screen.getByLabelText('Hide player widget'));

		expect(screen.queryByLabelText('Hide player widget')).not.toBeInTheDocument();
		expect(screen.getAllByLabelText('Show player widget')).toHaveLength(2);
	});

	it('shows loading and error states in the primary view', () => {
		render(PlayerWidget, {
			props: {
				title: 'Night Drive',
				artist: 'Chromatics',
				errorMessage: 'Connection lost.'
			}
		});

		expect(screen.getByText('Playback failed')).toBeInTheDocument();
		expect(screen.getByText('Connection lost.')).toBeInTheDocument();
	});

	it('shows the loading state while connecting', () => {
		render(PlayerWidget, {
			props: {
				title: 'Night Drive',
				artist: 'Chromatics',
				isLoading: true
			}
		});

		expect(screen.getByText('Connecting to stream...')).toBeInTheDocument();
		expect(screen.getByRole('status', { name: 'Connecting to playback' })).toBeInTheDocument();
	});
});