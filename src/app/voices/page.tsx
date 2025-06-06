'use client';

import { useState, useEffect } from 'react';
import { Mic } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VoiceCard } from '@/components/voices/VoiceCard';
import { VoiceUploadForm } from '@/components/voices/VoiceUploadForm';
import { Voice } from '@/types/voice';
import { getApiUrl } from '@/app/utils/api';
import { useToast } from '@/hooks/use-toast';
import VoicePackUploadForm from '@/components/voices/VoicePackUploadForm';
import { AddVoiceButton } from '@/components/voices/AddVoiceButton';
import { AudioProvider } from '@/contexts/AudioContext';
import { Pagination } from '@/components/ui/pagination';

export default function VoicesPage() {
	const [voices, setVoices] = useState<Voice[]>([]);
	const [searchQuery, setSearchQuery] = useState('');
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [isVoicePackDialogOpen, setIsVoicePackDialogOpen] = useState(false);
	const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const { toast } = useToast();

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearchQuery(searchQuery);
		}, 300);

		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Load voices
	useEffect(() => {
		const loadVoices = async () => {
			try {
				const response = await fetch(
					getApiUrl(
						`/api/voices?page=${page}&limit=10&search=${encodeURIComponent(debouncedSearchQuery)}`
					)
				);
				if (!response.ok) {
					throw new Error('Failed to load voices');
				}
				const data = await response.json();
				setVoices(data.voices);
				setTotalPages(data.pagination.totalPages);
			} catch (error) {
				console.error('Error loading voices:', error);
				toast({
					title: 'Error',
					description: 'Failed to load voices. Please try again.',
					variant: 'destructive',
				});
			}
		};

		loadVoices();
	}, [toast, page, debouncedSearchQuery]);

	const handleToggleFavorite = async (voice: Voice) => {
		try {
			const response = await fetch(getApiUrl(`/api/voices/${voice.id}`), {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_favorite: !voice.is_favorite }),
			});

			if (!response.ok) {
				throw new Error('Failed to update voice');
			}

			const updatedVoice = await response.json();
			setVoices((prev) => prev.map((v) => (v.id === voice.id ? updatedVoice : v)));
		} catch (error) {
			console.error('Error updating voice:', error);
			toast({
				title: 'Error',
				description: 'Failed to update voice. Please try again.',
				variant: 'destructive',
			});
		}
	};

	const handleVoiceUpdated = (updatedVoice: Voice) => {
		setVoices((prev) => prev.map((v) => (v.id === updatedVoice.id ? updatedVoice : v)));
	};

	const handleVoiceDeleted = (deletedVoiceId: string) => {
		setVoices((prev) => prev.filter((v) => v.id !== deletedVoiceId));
	};

	const handleVoiceAdded = (voice: Voice) => {
		setVoices((prev) => [...prev, voice]);
	};

	const handleVoicePackAdded = (newVoices: Voice[]) => {
		setVoices((prev) => [...prev, ...newVoices]);
		setIsVoicePackDialogOpen(false);
	};

	return (
		<AudioProvider>
			<div className="p-6 w-full">
				<h1 className="text-2xl font-semibold mb-6">Voices</h1>
				<div className="flex items-center justify-between gap-4 mb-6 w-full">
					<div className="flex-1">
						<Input
							placeholder="Search voices..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full"
						/>
					</div>
					<AddVoiceButton
						onUploadVoice={() => setIsUploadDialogOpen(true)}
						onUploadVoicePack={() => setIsVoicePackDialogOpen(true)}
					/>
				</div>

				{voices.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<div className="rounded-full bg-muted p-4 mb-4">
							<Mic className="h-8 w-8 text-muted-foreground" />
						</div>
						<h3 className="text-lg font-semibold mb-2">No voices found</h3>
						<p className="text-muted-foreground mb-4">
							{searchQuery
								? 'No voices match your search. Try adjusting your search terms.'
								: 'Get started by uploading your first voice sample.'}
						</p>
						<AddVoiceButton
							onUploadVoice={() => setIsUploadDialogOpen(true)}
							onUploadVoicePack={() => setIsVoicePackDialogOpen(true)}
						/>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex flex-col gap-4 w-full">
							{voices.map((voice) => (
								<VoiceCard
									key={voice.id}
									voice={voice}
									onToggleFavorite={handleToggleFavorite}
									onVoiceUpdated={handleVoiceUpdated}
									onVoiceDeleted={handleVoiceDeleted}
								/>
							))}
						</div>
						<Pagination
							currentPage={page}
							totalPages={totalPages}
							onPageChange={setPage}
						/>
					</div>
				)}

				<Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
					<DialogContent className="max-w-2xl !animate-none data-[state=open]:!animate-none data-[state=closed]:!animate-none transition-opacity duration-200 opacity-0 data-[state=open]:opacity-100">
						<DialogHeader>
							<DialogTitle>Upload New Voice</DialogTitle>
						</DialogHeader>
						<VoiceUploadForm
							onVoiceAdded={handleVoiceAdded}
							onClose={() => setIsUploadDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>

				<Dialog open={isVoicePackDialogOpen} onOpenChange={setIsVoicePackDialogOpen}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Upload Voice Pack</DialogTitle>
						</DialogHeader>
						<VoicePackUploadForm
							existingVoices={voices}
							onVoicesAdded={handleVoicePackAdded}
							onClose={() => setIsVoicePackDialogOpen(false)}
						/>
					</DialogContent>
				</Dialog>
			</div>
		</AudioProvider>
	);
}
