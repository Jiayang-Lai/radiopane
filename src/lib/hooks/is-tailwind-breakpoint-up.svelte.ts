import { MediaQuery } from 'svelte/reactivity';

// https://tailwindcss.com/docs/responsive-design
const DEFAULT_TAILWIND_BREAKPOINTS = {
	sm: '40rem',
	md: '48rem',
	lg: '64rem',
	xl: '80rem',
	'2xl': '96rem'
} as const;

export type TailwindBreakpointName = keyof typeof DEFAULT_TAILWIND_BREAKPOINTS;

function resolveTailwindBreakpoint(
	breakpoint: TailwindBreakpointName,
	fallback: string = DEFAULT_TAILWIND_BREAKPOINTS[breakpoint]
) {
	if (typeof document === 'undefined') {
		return fallback;
	}

	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(`--breakpoint-${breakpoint}`)
		.trim();

	return value || fallback;
}

export class IsTailwindBreakpointUp extends MediaQuery {
	constructor(
		breakpoint: TailwindBreakpointName = 'xl',
		fallback: string = DEFAULT_TAILWIND_BREAKPOINTS[breakpoint]
	) {
		super(`min-width: ${resolveTailwindBreakpoint(breakpoint, fallback)}`);
	}
}