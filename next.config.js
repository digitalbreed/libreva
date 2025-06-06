/** @type {import('next').NextConfig} */
const nextConfig = {
	basePath: '/libreva',
	trailingSlash: true,
	env: {
		NEXT_PUBLIC_BASE_PATH: '/libreva',
	},
	experimental: {
		serverActions: {
			bodySizeLimit: '5mb',
		},
	},
};

module.exports = nextConfig;
