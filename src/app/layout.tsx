import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AppSidebar } from '@/components/AppSidebar';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'LibreVA - Text-to-Speech for Indie Game Developers, based on Chatterbox TTS',
	description: 'Generate high-quality voice acting for your indie games using LibreVA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={inter.className}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<div className="flex min-h-screen">
						<div className="flex-shrink-0">
							<AppSidebar />
						</div>
						<main className="flex-1 overflow-auto">
							<div className="max-w-7xl mx-auto w-full">{children}</div>
						</main>
					</div>
				</ThemeProvider>
				<Toaster />
			</body>
		</html>
	);
}
