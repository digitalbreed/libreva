'use client';

import { Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { getApiUrl } from '@/app/utils/api';
import { formatDistanceToNow, parseISO } from 'date-fns';
import Link from 'next/link';

interface Output {
	id: string;
	text: string;
	voice_id: string;
	voice_name?: string;
	temperature: number;
	exaggeration: number;
	created_at: string;
	project_id?: string;
	project_title?: string;
}

interface OutputCardProps {
	output: Output;
	onDelete?: (outputId: string) => void;
	showProjectInfo?: boolean;
}

export function OutputCard({ output, onDelete, showProjectInfo }: OutputCardProps) {
	const handleDownload = () => {
		const link = document.createElement('a');
		link.href = getApiUrl(`/api/outputs/${output.id}/audio`);
		link.download = `LibreVA-${output.id}.wav`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	console.log('Created at:', output.created_at);
	console.log('Parsed date:', new Date(output.created_at));
	console.log('Current time:', new Date());

	return (
		<AudioPlayer
			audioUrl={getApiUrl(`/api/outputs/${output.id}/audio`)}
			waveformUrl={getApiUrl(`/api/outputs/${output.id}/waveform`)}
			id={output.id}
		>
			<div className="flex-1 min-w-0 px-4 flex flex-col justify-center bg-background/80 relative z-10">
				<div className="flex items-center gap-2 mb-2">
					<p className="text-sm text-muted-foreground line-clamp-2">{output.text}</p>
				</div>
				<div className="flex items-center gap-2">
					{output.voice_name && (
						<Badge variant="secondary" className="text-xs">
							{output.voice_name}
						</Badge>
					)}
					<Badge variant="outline" className="text-xs">
						Temp: {output.temperature}
					</Badge>
					<Badge variant="outline" className="text-xs">
						Exag: {output.exaggeration}
					</Badge>
					{showProjectInfo && output.project_title && output.project_id && (
						<Link href={`/projects/${output.project_id}`}>
							<Badge
								variant="outline"
								className="text-xs hover:bg-accent cursor-pointer"
							>
								Project: {output.project_title}
							</Badge>
						</Link>
					)}
					<span className="text-xs text-muted-foreground">
						{formatDistanceToNow(parseISO(output.created_at + 'Z'), {
							addSuffix: true,
						})}
					</span>
				</div>
			</div>
			{onDelete && (
				<div className="flex-none px-4 flex items-center gap-2 border-l bg-background/80 relative z-10">
					<Button
						variant="ghost"
						size="icon"
						onClick={handleDownload}
						className="text-primary hover:text-primary"
					>
						<Download className="h-5 w-5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => onDelete(output.id)}
						className="text-destructive hover:text-destructive"
					>
						<Trash2 className="h-5 w-5" />
					</Button>
				</div>
			)}
		</AudioPlayer>
	);
}
