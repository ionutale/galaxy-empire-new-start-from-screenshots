import { expect, test } from '@playwright/test';

test.describe('User Authentication Flow', () => {
	test('should register a new user, logout, and login again', async ({ page }) => {
		// Generate unique test credentials
		const timestamp = Date.now();
		const username = `testuser_${timestamp}`;
		const email = `testuser_${timestamp}@example.com`;
		const password = 'testpassword123';

		// Step 1: Navigate to home page
		await page.goto('/');
		await expect(page.locator('h1')).toContainText('Galaxy Empire');

		// Step 2: Click register link
		await page.locator('a[href="/register"]').click();
		await expect(page.locator('h1')).toContainText('Join the Empire');

		// Step 3: Fill out registration form
		await page.locator('#username').fill(username);
		await page.locator('#email').fill(email);
		await page.locator('#password').fill(password);

		// Step 4: Submit registration form
		await page.locator('button[type="submit"]').click();

		// Step 5: Verify redirect to game page
		await page.waitForURL('**/game');
		expect(page.url()).toMatch(/\/game$/);

		// Step 6: Verify we're logged in (check for username in header)
		await expect(page.locator('header')).toContainText(username);

		// Step 7: Navigate to settings page
		await page.locator('a[href="/game/settings"]').click();
		await expect(page.locator('h2')).toContainText('Settings');

		// Step 8: Click logout button
		await page.locator('button', { hasText: 'Log Out' }).click();

		// Step 9: Verify redirect to login page
		await page.waitForURL('**/login');
		expect(page.url()).toMatch(/\/login$/);

		// Step 10: Fill out login form with same credentials
		await page.locator('#username').fill(username);
		await page.locator('#password').fill(password);

		// Step 11: Submit login form
		await page.locator('button[type="submit"]').click();

		// Step 12: Verify redirect back to game page
		await page.waitForURL('**/game');
		expect(page.url()).toMatch(/\/game$/);

		// Step 13: Verify we're logged in again
		await expect(page.locator('header')).toContainText(username);
	});

	test('should show validation errors for invalid registration', async ({ page }) => {
		await page.goto('/register');

		// Fill in partial data and try to submit
		await page.locator('#username').fill('testuser');
		await page.locator('#email').fill('invalid-email'); // Invalid email format
		await page.locator('#password').fill('short');

		// Try to submit form
		await page.locator('button[type="submit"]').click();

		// The form might show browser validation or server validation
		// Just verify we stay on the register page
		await expect(page.url()).toMatch(/\/register/);
	});

	test('should show error for invalid login credentials', async ({ page }) => {
		await page.goto('/login');

		// Try to login with invalid credentials
		await page.locator('#username').fill('nonexistentuser');
		await page.locator('#password').fill('wrongpassword');

		await page.locator('button[type="submit"]').click();

		// Should show invalid credentials error
		await expect(page.locator('text=Invalid username or password')).toBeVisible();

		// Should stay on login page
		expect(page.url()).toMatch(/\/login$/);
	});

	test('should navigate between login and register pages', async ({ page }) => {
		// Start at home page
		await page.goto('/');
		await expect(page.locator('h1')).toContainText('Galaxy Empire');

		// Go to login
		await page.locator('a[href="/login"]').click();
		await expect(page.locator('h1')).toContainText('Commander Login');

		// Navigate to register from login page
		await page.locator('a[href="/register"]').click();
		await expect(page.locator('h1')).toContainText('Join the Empire');

		// Navigate back to login from register page
		await page.locator('a[href="/login"]').click();
		await expect(page.locator('h1')).toContainText('Commander Login');
	});

	test.describe('Building Upgrades', () => {
		test('should register test user, login, and upgrade buildings', async ({ page }) => {
			// Use a unique username to avoid conflicts with parallel tests
			const timestamp = Date.now();
			const username = `test_user_${timestamp}`;
			const email = `test_user_${timestamp}@test.com`;
			const password = 'test_pass';

			// Register a new user
			await page.goto('/register');
			await page.locator('#username').fill(username);
			await page.locator('#email').fill(email);
			await page.locator('#password').fill(password);
			await page.locator('button[type="submit"]').click();
			await page.waitForURL('**/game');

			// Verify we're on the game page
			expect(page.url()).toMatch(/\/game$/);

			// Get the current planet ID from the planet selector
			const planetSelector = page.locator('select').first();
			const planetId = await planetSelector.inputValue();

			// Navigate to planet management page
			await page.goto(`/game/planet/${planetId}`);

			// Wait for the page to load and buildings to appear
			await page.waitForSelector('h3:has-text("Resource Production")');

			// Define the buildings to upgrade (try just one first to test)
			const buildingsToUpgrade = [
				'Metal Mine'
				// 'Crystal Mine',
				// 'Gas Extractor',
				// 'Solar Plant'
			];

			// Upgrade each building
			for (const buildingName of buildingsToUpgrade) {
				await upgradeBuilding(page, buildingName);
			}

			// Verify that buildings are in the construction queue
			await page.waitForSelector('h3:has-text("Construction Queue")');

			// Check that all buildings are in the queue by looking for "Level X" text
			for (const buildingName of buildingsToUpgrade) {
				await expect(page.locator('.space-y-2 .rounded.bg-gray-800.p-3').filter({ hasText: buildingName })).toBeVisible();
			}
		});
	});
});

async function upgradeBuilding(page: any, buildingName: string) {
	// Find the building card by name
	const buildingCard = page.locator('.rounded.border', { hasText: buildingName }).first();

	// Check if the upgrade button is enabled
	const upgradeButton = buildingCard.locator('button', { hasText: 'Upgrade to Level' });

	// Wait for button to be visible and check if it's enabled
	await upgradeButton.waitFor({ state: 'visible', timeout: 5000 });

	const isDisabled = await upgradeButton.isDisabled();
	if (isDisabled) {
		console.log(`Upgrade button for ${buildingName} is disabled - possibly insufficient resources`);
		return; // Skip this building
	}

	// Click the upgrade button
	await upgradeButton.click();

	// Wait for the upgrade to process - button should become disabled or show "Upgrading..."
	await page.waitForTimeout(2000);

	// Verify the building is now upgrading - look for the "Upgrading..." text in the header
	const upgradingText = buildingCard.locator('span.text-yellow-400').filter({ hasText: 'Upgrading...' });
	await expect(upgradingText).toBeVisible();
}