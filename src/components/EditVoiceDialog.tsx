import { useState } from 'react';
import { Voice } from '@/types/voice';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditVoiceDialogProps {
	voice: Voice;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (voice: Voice) => void;
}

export function EditVoiceDialog({ voice, open, onOpenChange, onSave }: EditVoiceDialogProps) {
	const [editedVoice, setEditedVoice] = useState<Voice>({
		...voice,
		tags: voice.tags || [],
	});
	const [newTag, setNewTag] = useState('');
	const { toast } = useToast();

	const handleSave = () => {
		onSave(editedVoice);
		onOpenChange(false);
		toast({
			title: 'Voice updated',
			description: 'The voice has been successfully updated.',
		});
	};

	const handleAddTag = () => {
		if (newTag && !editedVoice.tags?.includes(newTag)) {
			setEditedVoice({
				...editedVoice,
				tags: [...(editedVoice.tags || []), newTag],
			});
			setNewTag('');
		}
	};

	const handleRemoveTag = (tagToRemove: string) => {
		setEditedVoice({
			...editedVoice,
			tags: (editedVoice.tags || []).filter((tag) => tag !== tagToRemove),
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Voice</DialogTitle>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="name">Name</Label>
						<Input
							id="name"
							value={editedVoice.name}
							onChange={(e) =>
								setEditedVoice({ ...editedVoice, name: e.target.value })
							}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="notes">Notes</Label>
						<Textarea
							id="notes"
							value={editedVoice.notes || ''}
							onChange={(e) =>
								setEditedVoice({ ...editedVoice, notes: e.target.value })
							}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="gender">Gender</Label>
						<Select
							value={editedVoice.gender || ''}
							onValueChange={(value) =>
								setEditedVoice({
									...editedVoice,
									gender: (value as 'male' | 'female') || undefined,
								})
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select gender" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">None</SelectItem>
								<SelectItem value="male">Male</SelectItem>
								<SelectItem value="female">Female</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="grid gap-2">
						<Label>Tags</Label>
						<div className="flex gap-2">
							<Input
								value={newTag}
								onChange={(e) => setNewTag(e.target.value)}
								placeholder="Add a tag"
								onKeyDown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										handleAddTag();
									}
								}}
							/>
							<Button type="button" onClick={handleAddTag}>
								Add
							</Button>
						</div>
						<div className="flex flex-wrap gap-2 mt-2">
							{(editedVoice.tags || []).map((tag) => (
								<Badge key={tag} variant="secondary">
									{tag}
									<button
										className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
										onClick={() => handleRemoveTag(tag)}
									>
										<X className="h-3 w-3" />
										<span className="sr-only">Remove tag</span>
									</button>
								</Badge>
							))}
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSave}>Save changes</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
