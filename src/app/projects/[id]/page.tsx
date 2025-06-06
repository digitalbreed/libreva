'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getApiUrl } from '@/app/utils/api';
import TtsConverter from '@/components/TtsConverter';
import { OutputCard } from '@/components/outputs/OutputCard';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AudioProvider } from '@/contexts/AudioContext';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Pagination } from '@/components/ui/pagination';

interface Project {
	id: string;
	title: string;
	created_at: string;
}

interface Output {
	id: string;
	text: string;
	voice_id: string;
	voice_name: string;
	temperature: number;
	exaggeration: number;
	created_at: string;
}

export default function ProjectPage() {
	const { id } = useParams();
	const router = useRouter();
	const [project, setProject] = useState<Project | null>(null);
	const [outputs, setOutputs] = useState<Output[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	const loadOutputs = useCallback(
		async (pageNum: number = 1) => {
			try {
				const response = await fetch(
					getApiUrl(`/api/projects/${id}/outputs?page=${pageNum}&limit=10`)
				);
				if (!response.ok) {
					throw new Error('Failed to load outputs');
				}
				const data = await response.json();
				setOutputs(data.outputs);
				setTotalPages(data.pagination.totalPages);
				setPage(pageNum);
			} catch (error) {
				console.error('Error loading outputs:', error);
			} finally {
				setIsLoading(false);
			}
		},
		[id]
	);

	useEffect(() => {
		const loadProject = async () => {
			try {
				const response = await fetch(getApiUrl(`/api/projects/${id}`));
				if (!response.ok) {
					if (response.status === 404) {
						// Project not found, redirect to homepage
						router.push('/');
						return;
					}
					throw new Error('Failed to load project');
				}
				const data = await response.json();
				setProject(data);
			} catch (error) {
				console.error('Error loading project:', error);
				// On any error, redirect to homepage
				router.push('/');
			}
		};

		loadProject();
		loadOutputs(1);
	}, [id, router, loadOutputs]);

	const handleOutputDeleted = (outputId: string) => {
		// Optimistically remove from UI
		setOutputs(outputs.filter((output) => output.id !== outputId));

		// Fire and forget the delete API call
		fetch(getApiUrl(`/api/outputs/${outputId}`), {
			method: 'DELETE',
		}).catch((error) => {
			console.error('Error deleting output:', error);
			// Optionally, you could show a toast notification here
			// and reload the outputs list to restore the deleted item
		});
	};

	const handleProjectDelete = async () => {
		try {
			const response = await fetch(getApiUrl(`/api/projects/${id}`), {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete project');
			}

			// Redirect to home page after successful deletion
			router.push('/');
		} catch (error) {
			console.error('Error deleting project:', error);
			// You might want to show an error toast here
		}
	};

	if (!project) {
		return <div className="p-6">Loading...</div>;
	}

	return (
		<AudioProvider>
			<div className="p-6 space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-semibold">{project.title}</h1>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="icon">
								<Trash2 className="h-5 w-5" />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete Project</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete this project? This action cannot
									be undone. All outputs and their associated files will be
									permanently deleted.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={handleProjectDelete}
									className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>

				<TtsConverter projectId={project.id} onOutputCreated={() => loadOutputs(1)} />

				<div className="space-y-4">
					<h2 className="text-xl font-semibold">Generated Outputs</h2>
					{isLoading ? (
						<div>Loading outputs...</div>
					) : outputs.length === 0 ? (
						<div className="text-muted-foreground">No outputs generated yet.</div>
					) : (
						<div className="space-y-4">
							{outputs.map((output) => (
								<OutputCard
									key={output.id}
									output={output}
									onDelete={handleOutputDeleted}
								/>
							))}
							<Pagination
								currentPage={page}
								totalPages={totalPages}
								onPageChange={loadOutputs}
							/>
						</div>
					)}
				</div>
			</div>
		</AudioProvider>
	);
}
