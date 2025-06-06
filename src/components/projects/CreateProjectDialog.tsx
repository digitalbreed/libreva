'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/app/utils/api';

interface CreateProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateProjectDialog({ open, onOpenChange }: CreateProjectDialogProps) {
	const [projectName, setProjectName] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();
	const { toast } = useToast();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!projectName.trim()) return;

		setIsSubmitting(true);
		try {
			const response = await fetch(getApiUrl('/api/projects'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title: projectName.trim() }),
			});

			if (!response.ok) {
				throw new Error('Failed to create project');
			}

			const project = await response.json();
			onOpenChange(false);
			router.push(`/projects/${project.id}`);
			toast({
				title: 'Project created',
				description: `Project "${project.title}" has been created successfully.`,
			});
		} catch (error) {
			console.error('Error creating project:', error);
			toast({
				title: 'Error',
				description: 'Failed to create project. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg !animate-none data-[state=open]:!animate-none data-[state=closed]:!animate-none transition-opacity duration-200 opacity-0 data-[state=open]:opacity-100">
				<DialogHeader>
					<DialogTitle>Create New Project</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<Input
						placeholder="Enter project name"
						value={projectName}
						onChange={(e) => setProjectName(e.target.value)}
						autoFocus
					/>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting || !projectName.trim()}>
							Create Project
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
