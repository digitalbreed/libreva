'use client';

import { useState } from 'react';
import { Star, Tag, Mars, Venus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Voice } from '@/types/voice';
import { getApiUrl } from '@/app/utils/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VoiceEditForm } from './VoiceEditForm';
import { AudioPlayer } from '@/components/audio/AudioPlayer';

interface VoiceCardProps {
	voice: Voice;
	onToggleFavorite: (voice: Voice) => void;
	onVoiceUpdated: (voice: Voice) => void;
	onVoiceDeleted: (voiceId: string) => void;
}

export function VoiceCard({
	voice,
	onToggleFavorite,
	onVoiceUpdated,
	onVoiceDeleted,
}: VoiceCardProps) {
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

	return (
		<>
			<AudioPlayer
				audioUrl={getApiUrl(`/api/voices/${voice.id}/audio`)}
				waveformUrl={getApiUrl(`/api/voices/${voice.id}/waveform`)}
				id={voice.id}
			>
				{/* Title and notes column */}
				<div className="flex-1 min-w-0 px-4 flex flex-col justify-center bg-background/80 z-10">
					<div className="flex items-center gap-2 mb-2">
						<h3 className="text-lg font-medium truncate">{voice.name}</h3>
						{voice.gender && (
							<span className="text-muted-foreground">
								{voice.gender === 'male' ? (
									<Mars className="h-4 w-4" />
								) : (
									<Venus className="h-4 w-4" />
								)}
							</span>
						)}
					</div>
					{voice.notes?.trim() && (
						<p className="text-sm text-muted-foreground line-clamp-2">{voice.notes}</p>
					)}
				</div>

				{/* Tags column */}
				<div className="flex-1 px-4 flex items-center bg-background/80 z-10">
					<div className="flex flex-wrap gap-2">
						{voice.tags?.map((tag) => (
							<Badge key={tag} variant="secondary">
								<Tag className="mr-1 h-3 w-3" />
								{tag}
							</Badge>
						))}
					</div>
				</div>

				{/* Action buttons column */}
				<div className="flex-none px-4 flex items-center gap-2 border-l bg-background/80 z-10">
					<Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(true)}>
						<Pencil className="h-5 w-5" />
					</Button>
					<Button variant="ghost" size="icon" onClick={() => onToggleFavorite(voice)}>
						<Star
							className={`h-5 w-5 ${
								voice.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''
							}`}
						/>
					</Button>
				</div>
			</AudioPlayer>

			<Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
				<DialogContent className="max-w-2xl !animate-none data-[state=open]:!animate-none data-[state=closed]:!animate-none transition-opacity duration-200 opacity-0 data-[state=open]:opacity-100">
					<DialogHeader>
						<DialogTitle>Edit Voice</DialogTitle>
					</DialogHeader>
					<VoiceEditForm
						voice={voice}
						onVoiceUpdated={onVoiceUpdated}
						onVoiceDeleted={onVoiceDeleted}
						onClose={() => setIsEditDialogOpen(false)}
					/>
				</DialogContent>
			</Dialog>
		</>
	);
}
