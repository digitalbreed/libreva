'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Mic, Folder, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader as DialogH,
	DialogTitle as DialogT,
} from '@/components/ui/dialog';
import { getApiUrl } from '@/app/utils/api';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { VoiceUploadForm } from '@/components/voices/VoiceUploadForm';
import { AudioPlayer } from '@/components/audio/AudioPlayer';
import { AudioProvider } from '@/contexts/AudioContext';
import type { Voice } from '@/types/voice';

interface Project {
	id: string;
	title: string;
	created_at: string;
}

const SUBTITLE = 'Generate high-quality voice acting for your indie games using LibreVA';

function MiniVoiceCard({ voice }: { voice: Voice }) {
	return (
		<AudioPlayer
			audioUrl={getApiUrl(`/api/voices/${voice.id}/audio`)}
			waveformUrl={getApiUrl(`/api/voices/${voice.id}/waveform`)}
			id={voice.id}
			className="mb-3"
		>
			<div className="flex-1 min-w-0 px-4 flex flex-col justify-center bg-background/80 z-10">
				<div className="font-medium truncate">{voice.name}</div>
				{voice.notes && (
					<div className="text-sm text-muted-foreground truncate">{voice.notes}</div>
				)}
			</div>
		</AudioPlayer>
	);
}

export default function HomePage() {
	const [projects, setProjects] = useState<Project[]>([]);
	const [voices, setVoices] = useState<Voice[]>([]);
	const [showCreateProject, setShowCreateProject] = useState(false);
	const [showUploadVoice, setShowUploadVoice] = useState(false);

	useEffect(() => {
		fetch(getApiUrl('/api/projects?page=1&limit=12'))
			.then((res) => res.json())
			.then((data) => setProjects(data.projects))
			.catch(() => setProjects([]));

		fetch(getApiUrl('/api/voices?page=1&limit=5'))
			.then((res) => res.json())
			.then((data) => setVoices(data.voices))
			.catch(() => setVoices([]));
	}, []);

	return (
		<div className="min-h-screen flex flex-col">
			<div className="p-6 max-w-4xl mx-auto flex-1">
				<div className="flex flex-col items-center mb-8">
					<Image
						src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/LibreVA-Logo.png`}
						alt="LibreVA Logo"
						width={96}
						height={96}
						className="mb-4"
					/>
					<h1 className="text-3xl font-bold mb-2">LibreVA</h1>
					<p className="text-muted-foreground text-lg text-center max-w-xl">{SUBTITLE}</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{/* Voices Column */}
					<Card>
						<CardHeader>
							<CardTitle>Your voices</CardTitle>
							<div className="text-muted-foreground text-sm">
								Here are your most recent voice creations. Play, review, or add new
								voices to bring your characters to life.
							</div>
						</CardHeader>
						<CardContent>
							<AudioProvider>
								{voices.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8">
										<div className="rounded-full bg-muted p-4 mb-4">
											<Mic className="h-8 w-8 text-muted-foreground" />
										</div>
										<div className="text-lg font-semibold mb-2">
											No voices yet
										</div>
										<div className="text-muted-foreground mb-4">
											Upload your first voice sample to get started.
										</div>
										<Button onClick={() => setShowUploadVoice(true)}>
											<Plus className="mr-2 h-4 w-4" />
											Upload Voice
										</Button>
										<Dialog
											open={showUploadVoice}
											onOpenChange={setShowUploadVoice}
										>
											<DialogContent className="max-w-2xl">
												<DialogH>
													<DialogT>Upload New Voice</DialogT>
												</DialogH>
												<VoiceUploadForm
													onVoiceAdded={() => setShowUploadVoice(false)}
													onClose={() => setShowUploadVoice(false)}
												/>
											</DialogContent>
										</Dialog>
									</div>
								) : (
									<div className="flex flex-col gap-2">
										{voices.map((voice) => (
											<MiniVoiceCard key={voice.id} voice={voice} />
										))}
										<Button asChild variant="outline" className="mt-4 w-fit">
											<Link href="/voices">
												<Plus className="mr-2 h-4 w-4" />
												Add Voice
											</Link>
										</Button>
									</div>
								)}
							</AudioProvider>
						</CardContent>
					</Card>
					{/* Projects Column */}
					<Card>
						<CardHeader>
							<CardTitle>Your projects</CardTitle>
							<div className="text-muted-foreground text-sm">
								Ready to continue your work? Select a project below or start a new
								one to organize your voice acting adventures.
							</div>
						</CardHeader>
						<CardContent>
							{projects.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8">
									<div className="rounded-full bg-muted p-4 mb-4">
										<Folder className="h-8 w-8 text-muted-foreground" />
									</div>
									<div className="text-lg font-semibold mb-2">
										No projects yet
									</div>
									<div className="text-muted-foreground mb-4">
										Get started by creating your first project.
									</div>
									<Button onClick={() => setShowCreateProject(true)}>
										<Plus className="mr-2 h-4 w-4" />
										Create Project
									</Button>
									<Dialog
										open={showCreateProject}
										onOpenChange={setShowCreateProject}
									>
										<DialogContent className="max-w-lg">
											<DialogH>
												<DialogT>Create New Project</DialogT>
											</DialogH>
											<CreateProjectDialog
												open={showCreateProject}
												onOpenChange={setShowCreateProject}
											/>
										</DialogContent>
									</Dialog>
								</div>
							) : (
								<div className="flex flex-col gap-2">
									{projects.map((project) => (
										<Link
											key={project.id}
											href={`/projects/${project.id}`}
											className="block rounded-lg px-3 py-2 text-base hover:bg-accent hover:text-accent-foreground text-muted-foreground font-medium flex items-center gap-2"
										>
											{project.title}
											<ExternalLink className="h-4 w-4 opacity-50" />
										</Link>
									))}
									<Button asChild variant="outline" className="mt-4 w-fit">
										<Link href="/projects/new">
											<Plus className="mr-2 h-4 w-4" />
											Create Project
										</Link>
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>
			<footer className="text-center text-muted-foreground/40 py-8">
				Built with <span className="text-red-500/60">♥</span> by{' '}
				<a
					href="https://bsky.app/profile/digitalbreed.bsky.social"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:underline hover:text-muted-foreground/60"
				>
					@digitalbreed
				</a>
			</footer>
		</div>
	);
}
