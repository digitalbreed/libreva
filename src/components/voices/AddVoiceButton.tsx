import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface AddVoiceButtonProps {
	onUploadVoice: () => void;
	onUploadVoicePack: () => void;
	variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
}

export function AddVoiceButton({
	onUploadVoice,
	onUploadVoicePack,
	variant = 'default',
}: AddVoiceButtonProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant={variant}>
					<Plus className="mr-2 h-4 w-4" /> Add Voice
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={onUploadVoice}>
					<Upload className="mr-2 h-4 w-4" /> Upload Voice
				</DropdownMenuItem>
				<DropdownMenuItem onClick={onUploadVoicePack}>
					<Upload className="mr-2 h-4 w-4" /> Upload Voice Pack
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
