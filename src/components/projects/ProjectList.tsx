'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/app/utils/api';

interface Project {
	id: string;
	title: string;
	created_at: string;
}

interface ProjectListProps {
	refreshTrigger?: number;
}

export function ProjectList({ refreshTrigger = 0 }: ProjectListProps) {
	const [projects, setProjects] = useState<Project[]>([]);
	const pathname = usePathname();

	useEffect(() => {
		const loadProjects = async () => {
			try {
				const response = await fetch(getApiUrl('/api/projects'));
				if (!response.ok) {
					throw new Error('Failed to load projects');
				}
				const data = await response.json();
				// Sort projects by creation date (newest first)
				setProjects(
					data.sort(
						(a: Project, b: Project) =>
							new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
					)
				);
			} catch (error) {
				console.error('Error loading projects:', error);
			}
		};

		loadProjects();
	}, [refreshTrigger]);

	if (projects.length === 0) {
		return <p className="px-2 text-sm text-muted-foreground">No projects yet</p>;
	}

	return (
		<div className="space-y-1">
			{projects.map((project) => (
				<Link
					key={project.id}
					href={`/projects/${project.id}`}
					className={cn(
						'block rounded-lg px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground',
						pathname === `/projects/${project.id}`
							? 'bg-accent text-accent-foreground'
							: 'text-muted-foreground'
					)}
				>
					{project.title}
				</Link>
			))}
		</div>
	);
}
