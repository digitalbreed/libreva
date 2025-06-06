'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Mic, History, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ProjectList } from '@/components/projects/ProjectList';

const mainNavItems = [
	{
		title: 'Home',
		href: '/',
		icon: Home,
	},
	{
		title: 'Voices',
		href: '/voices',
		icon: Mic,
	},
	{
		title: 'History',
		href: '/history',
		icon: History,
	},
];

export function AppSidebar() {
	const pathname = usePathname();
	const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const handleProjectCreated = () => {
		setRefreshTrigger((prev) => prev + 1);
	};

	return (
		<Sidebar className="h-full">
			<SidebarHeader className="flex items-center justify-between px-4 py-2">
				<div className="flex items-center gap-2">
					<Image
						src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/LibreVA-Logo.png`}
						alt="LibreVA Logo"
						width={24}
						height={24}
						className="rounded-sm"
					/>
					<h2 className="text-lg font-semibold">LibreVA</h2>
				</div>
				<ThemeToggle />
			</SidebarHeader>
			<SidebarContent>
				<nav className="grid gap-1 px-2">
					{mainNavItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
								pathname === item.href
									? 'bg-accent text-accent-foreground'
									: 'transparent'
							)}
						>
							<item.icon className="h-4 w-4" />
							{item.title}
						</Link>
					))}
				</nav>
				<div className="mt-6 px-4">
					<div className="mb-2 flex items-center justify-between px-2">
						<h3 className="text-sm font-semibold">Projects</h3>
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6"
							onClick={() => setIsCreateProjectDialogOpen(true)}
						>
							<Plus className="h-4 w-4" />
						</Button>
					</div>
					<ProjectList refreshTrigger={refreshTrigger} />
				</div>
			</SidebarContent>
			<CreateProjectDialog
				open={isCreateProjectDialogOpen}
				onOpenChange={(open) => {
					setIsCreateProjectDialogOpen(open);
					if (!open) handleProjectCreated();
				}}
			/>
		</Sidebar>
	);
}
