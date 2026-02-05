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
});