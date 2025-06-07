import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AppSidebar } from '@/components/AppSidebar';
import { Toaster } from '@/components/ui/toaster';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: 'LibreVA - Text-to-Speech for Indie Game Developers, based on Chatterbox TTS',
	description:
		'LibreVA is a self-hosted, open-source platform for generating high-quality voice acting for indie games. It provides a web interface for managing projects and voices, and a powerful text-to-speech backend based on Chatterbox TTS (https://github.com/resemble-ai/chatterbox), both containerized using Docker.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={cn('min-h-screen bg-background antialiased', inter.className)}>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<ProjectProvider>
						<div className="flex min-h-screen">
							<div className="flex-shrink-0">
								<AppSidebar />
							</div>
							<main className="flex-1 overflow-auto">
								<div className="max-w-7xl mx-auto w-full">{children}</div>
							</main>
						</div>
					</ProjectProvider>
				</ThemeProvider>
				<Toaster />
			</body>
		</html>
	);
}
