import { expect, test } from '@playwright/test';

function createRadioBrowserStation(overrides: Record<string, unknown> = {}) {
	return {
		changeuuid: 'change-1',
		stationuuid: 'station-1',
		serveruuid: null,
		name: 'Radio Pane FM',
		url: 'https://stream.example.com/live',
		url_resolved: 'https://stream.example.com/live',
		homepage: 'https://example.com/station',
		favicon: '',
		country: 'Canada',
		countrycode: 'CA',
		state: 'Ontario',
		iso_3166_2: 'CA-ON',
		tags: 'indie,electronic',
		languagecodes: 'en',
		votes: 1234,
		language: 'English',
		lastchangetime: '',
		lastchangetime_iso8601: '',
		codec: 'MP3',
		bitrate: 128,
		hls: 0,
		lastcheckok: 1,
		lastchecktime: '',
		lastchecktime_iso8601: '',
		lastcheckoktime: '',
		lastcheckoktime_iso8601: '',
		lastlocalchecktime: '',
		lastlocalchecktime_iso8601: '',
		clicktimestamp: '',
		clicktimestamp_iso8601: null,
		clickcount: 0,
		clicktrend: 0,
		ssl_error: 0,
		geo_lat: 43.6532,
		geo_long: -79.3832,
		geo_distance: null,
		...overrides
	};
}

test('selects a station from the real map and opens its details', async ({ page }) => {
	await page.route('https://de1.api.radio-browser.info/json/stations**', async (route) => {
		const url = new URL(route.request().url());

		if (url.searchParams.get('has_geo_info') === 'true') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify([
					createRadioBrowserStation({
						stationuuid: 'exact-1',
						name: 'Exact One',
						votes: 1500,
						geo_lat: 43.6532,
						geo_long: -79.3832
					})
				])
			});
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify([
				createRadioBrowserStation({ stationuuid: 'discover-1', name: 'Discover One' }),
				createRadioBrowserStation({ stationuuid: 'discover-2', name: 'Discover Two', votes: 999 })
			])
		});
	});

	await page.goto('/app');
	await expect(page.getByRole('heading', { name: 'Discover Radio Stations' })).toBeVisible();

	await page.getByRole('link', { name: 'Radio Map' }).click();

	await expect(page.getByText('1 stations mapped')).toBeVisible();
	const mapSurface = page.locator('.leaflet-container');
	await expect(mapSurface).toBeVisible();
	const mapBounds = await mapSurface.boundingBox();

	expect(mapBounds).not.toBeNull();

	await page.mouse.click(
		(mapBounds?.x ?? 0) + (mapBounds?.width ?? 0) / 2,
		(mapBounds?.y ?? 0) + (mapBounds?.height ?? 0) / 2
	);

	await expect(page.getByText('Selected station')).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Exact One' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Play station' })).toBeVisible();
});