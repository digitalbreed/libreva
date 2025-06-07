'use client';

import { useState } from 'react';
import { Upload, X, Mars, Venus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Voice } from '@/types/voice';
import { getApiUrl } from '@/app/utils/api';
import { useToast } from '@/hooks/use-toast';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from './config';

interface VoiceUploadFormProps {
	onVoiceAdded: (voice: Voice) => void;
	onClose: () => void;
}

export function VoiceUploadForm({ onVoiceAdded, onClose }: VoiceUploadFormProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [newVoice, setNewVoice] = useState({
		name: '',
		notes: '',
		tags: [] as string[],
		tagInput: '',
		gender: null as 'male' | 'female' | null,
	});
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const { toast } = useToast();

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.type !== 'audio/wav') {
			toast({
				title: 'Invalid file type',
				description: 'Please select a WAV file.',
				variant: 'destructive',
			});
			return;
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			toast({
				title: 'File too large',
				description: `File size must be less than ${MAX_FILE_SIZE_MB}MB.`,
				variant: 'destructive',
			});
			return;
		}

		setSelectedFile(file);
	};

	const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && newVoice.tagInput.trim()) {
			e.preventDefault();
			if (!newVoice.tags.includes(newVoice.tagInput.trim())) {
				setNewVoice((prev) => ({
					...prev,
					tags: [...prev.tags, prev.tagInput.trim()],
					tagInput: '',
				}));
			}
		}
	};

	const removeTag = (tagToRemove: string) => {
		setNewVoice((prev) => ({
			...prev,
			tags: prev.tags.filter((tag) => tag !== tagToRemove),
		}));
	};

	const handleUpload = async () => {
		if (!selectedFile || !newVoice.name.trim()) {
			toast({
				title: 'Missing information',
				description: 'Please provide a name and select a WAV file.',
				variant: 'destructive',
			});
			return;
		}

		setIsUploading(true);
		try {
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append('name', newVoice.name);
			formData.append('notes', newVoice.notes);
			formData.append('tags', JSON.stringify(newVoice.tags));
			formData.append('gender', newVoice.gender || '');

			const response = await fetch(getApiUrl('/api/voices'), {
				method: 'POST',
				body: formData,
			});

			if (!response.ok) {
				throw new Error('Failed to upload voice');
			}

			const voice = await response.json();
			onVoiceAdded(voice);
			onClose();
			toast({
				title: 'Voice created',
				description: 'The voice has been successfully created.',
			});
		} catch (error) {
			console.error('Error uploading voice:', error);
			toast({
				title: 'Error',
				description: 'Failed to upload voice. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<div className="space-y-4">
			<div>
				<label className="text-sm font-medium">Name</label>
				<Input
					value={newVoice.name}
					onChange={(e) =>
						setNewVoice((prev) => ({
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
							checked={newVoice.gender === 'male'}
							onChange={() =>
								setNewVoice((prev) => ({
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
							checked={newVoice.gender === 'female'}
							onChange={() =>
								setNewVoice((prev) => ({
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
							checked={newVoice.gender === null}
							onChange={() =>
								setNewVoice((prev) => ({
									...prev,
									gender: null,
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
					value={newVoice.notes}
					onChange={(e) =>
						setNewVoice((prev) => ({
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
					{newVoice.tags.map((tag) => (
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
					value={newVoice.tagInput}
					onChange={(e) =>
						setNewVoice((prev) => ({
							...prev,
							tagInput: e.target.value,
						}))
					}
					onKeyDown={handleTagInputKeyDown}
					placeholder="Add tags (press Enter)"
				/>
			</div>

			<div>
				<label className="text-sm font-medium">Voice Sample</label>
				<div className="mt-2">
					<Input type="file" accept=".wav" onChange={handleFileSelect} />
					<p className="text-sm text-muted-foreground mt-1">
						Maximum file size: {MAX_FILE_SIZE_MB}MB
					</p>
				</div>
			</div>

			<Button
				onClick={handleUpload}
				disabled={isUploading || !selectedFile || !newVoice.name.trim()}
				className="w-full"
			>
				<Upload className="mr-2 h-4 w-4" />
				{isUploading ? 'Uploading...' : 'Upload Voice'}
			</Button>
		</div>
	);
}
