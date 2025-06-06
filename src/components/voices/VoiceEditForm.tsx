'use client';

import { useState } from 'react';
import { Save, Trash2, Mars, Venus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Voice } from '@/types/voice';
import { getApiUrl } from '@/app/utils/api';
import { useToast } from '@/hooks/use-toast';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VoiceEditFormProps {
	voice: Voice;
	onVoiceUpdated: (voice: Voice) => void;
	onVoiceDeleted: (voiceId: string) => void;
	onClose: () => void;
}

export function VoiceEditForm({
	voice,
	onVoiceUpdated,
	onVoiceDeleted,
	onClose,
}: VoiceEditFormProps) {
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [editedVoice, setEditedVoice] = useState({
		name: voice.name,
		notes: voice.notes,
		tags: voice.tags || [],
		tagInput: '',
		gender: voice.gender,
	});
	const { toast } = useToast();

	const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && editedVoice.tagInput.trim()) {
			e.preventDefault();
			if (!editedVoice.tags.includes(editedVoice.tagInput.trim())) {
				setEditedVoice((prev) => ({
					...prev,
					tags: [...prev.tags, prev.tagInput.trim()],
					tagInput: '',
				}));
			}
		}
	};

	const removeTag = (tagToRemove: string) => {
		setEditedVoice((prev) => ({
			...prev,
			tags: prev.tags.filter((tag) => tag !== tagToRemove),
		}));
	};

	const handleSave = async () => {
		setIsSaving(true);
		try {
			const response = await fetch(getApiUrl(`/api/voices/${voice.id}`), {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editedVoice.name,
					notes: editedVoice.notes,
					gender: editedVoice.gender,
					tags: editedVoice.tags,
				}),
			});

			if (!response.ok) {
				throw new Error('Failed to update voice');
			}

			const updatedVoice = await response.json();
			onVoiceUpdated(updatedVoice);
			onClose();
			toast({
				title: 'Voice updated',
				description: 'The voice has been successfully updated.',
			});
		} catch (error) {
			console.error('Error updating voice:', error);
			toast({
				title: 'Error',
				description: 'Failed to update voice. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const response = await fetch(getApiUrl(`/api/voices/${voice.id}`), {
				method: 'DELETE',
			});

			if (!response.ok) {
				throw new Error('Failed to delete voice');
			}

			onVoiceDeleted(voice.id);
			onClose();
			toast({
				title: 'Voice deleted',
				description: 'The voice has been successfully deleted.',
			});
		} catch (error) {
			console.error('Error deleting voice:', error);
			toast({
				title: 'Error',
				description: 'Failed to delete voice. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<div className="space-y-4">
			<div>
				<label className="text-sm font-medium">Name</label>
				<Input
					value={editedVoice.name}
					onChange={(e) =>
						setEditedVoice((prev) => ({
							...prev,
							name: e.target.value,
						}))
					}
					placeholder="Enter voice name"
				/>
			</div>

			<div>
				<label className="text-sm font-medium">Gender</label>
				<div className="flex gap-4 mt-2">
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="gender"
							checked={editedVoice.gender === 'male'}
							onChange={() =>
								setEditedVoice((prev) => ({
									...prev,
									gender: 'male',
								}))
							}
							className="h-4 w-4"
						/>
						<Mars className="h-4 w-4" />
						<span>Male</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="gender"
							checked={editedVoice.gender === 'female'}
							onChange={() =>
								setEditedVoice((prev) => ({
									...prev,
									gender: 'female',
								}))
							}
							className="h-4 w-4"
						/>
						<Venus className="h-4 w-4" />
						<span>Female</span>
					</label>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="gender"
							checked={editedVoice.gender === null}
							onChange={() =>
								setEditedVoice((prev) => ({
									...prev,
									gender: undefined,
								}))
							}
							className="h-4 w-4"
						/>
						<span>Unspecified</span>
					</label>
				</div>
			</div>

			<div>
				<label className="text-sm font-medium">Notes</label>
				<Textarea
					value={editedVoice.notes}
					onChange={(e) =>
						setEditedVoice((prev) => ({
							...prev,
							notes: e.target.value,
						}))
					}
					placeholder="Add any notes about this voice"
				/>
			</div>

			<div>
				<label className="text-sm font-medium">Tags</label>
				<div className="flex flex-wrap gap-2 mb-2">
					{editedVoice.tags.map((tag) => (
						<Badge key={tag} variant="secondary" className="flex items-center gap-1">
							{tag}
							<button
								onClick={() => removeTag(tag)}
								className="hover:text-destructive"
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
				<Input
					value={editedVoice.tagInput}
					onChange={(e) =>
						setEditedVoice((prev) => ({
							...prev,
							tagInput: e.target.value,
						}))
					}
					onKeyDown={handleTagInputKeyDown}
					placeholder="Add tags (press Enter)"
				/>
			</div>

			<div className="flex gap-2">
				<Button
					onClick={handleSave}
					disabled={isSaving || !editedVoice.name.trim()}
					className="flex-1"
				>
					<Save className="mr-2 h-4 w-4" />
					{isSaving ? 'Saving...' : 'Save Changes'}
				</Button>
				<Button
					variant="destructive"
					onClick={() => setShowDeleteConfirm(true)}
					disabled={isDeleting}
				>
					<Trash2 className="mr-2 h-4 w-4" />
					{isDeleting ? 'Deleting...' : 'Delete'}
				</Button>
			</div>

			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This will mark the voice as deleted. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
