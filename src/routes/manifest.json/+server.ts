import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const GET = async () => {
	const runEnv = env.RUN_ENV || 'development';
	let name = 'Galaxy Empire';
	let short_name = 'GalaxyEmpire';

	if (runEnv !== 'production') {
		name = `${name} (${runEnv})`;
		short_name = `${short_name} (${runEnv})`;
	}

	const manifest = {
		name,
		short_name,
		start_url: '/',
		display: 'standalone',
		background_color: '#111827',
		theme_color: '#1f2937',
		description: 'A space strategy MMO game.',
		icons: [
			{
				src: '/icons/icon_web_PWA192_192x192.png',
				sizes: '192x192',
				type: 'image/png'
			},
			{
				src: '/icons/icon_web_PWA512_512x512.png',
				sizes: '512x512',
				type: 'image/png'
			},
			{
				src: '/icons/icon_android_LauncherXXHDPI_192x192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'maskable'
			},
			{
				src: '/icons/icon_android_PlayStore_512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable'
			}
		]
	};

	return json(manifest);
};
