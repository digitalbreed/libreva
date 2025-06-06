'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAudio } from '@/contexts/AudioContext';

interface AudioPlayerProps {
	audioUrl: string;
	waveformUrl: string;
	className?: string;
	children?: React.ReactNode;
	id: string;
}

export function AudioPlayer({ audioUrl, waveformUrl, className, children, id }: AudioPlayerProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const { currentlyPlayingId, setCurrentlyPlayingId } = useAudio();

	useEffect(() => {
		return () => {
			if (audioRef.current) {
				audioRef.current.pause();
				audioRef.current = null;
			}
		};
	}, []);

	// Effect to handle external play state changes
	useEffect(() => {
		if (currentlyPlayingId !== id && isPlaying) {
			setIsPlaying(false);
			if (audioRef.current) {
				audioRef.current.pause();
			}
		}
	}, [currentlyPlayingId, id, isPlaying]);

	const handlePlayPause = () => {
		if (!audioRef.current) {
			audioRef.current = new Audio(audioUrl);
			audioRef.current.addEventListener('ended', () => {
				setIsPlaying(false);
				setProgress(0);
				setCurrentlyPlayingId(null);
			});

			// Set up progress tracking
			let animationFrameId: number;

			const updateProgress = () => {
				if (audioRef.current) {
					setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
				}
				animationFrameId = requestAnimationFrame(updateProgress);
			};

			const handlePlay = () => {
				animationFrameId = requestAnimationFrame(updateProgress);
			};

			const handlePause = () => {
				cancelAnimationFrame(animationFrameId);
			};

			audioRef.current.addEventListener('play', handlePlay);
			audioRef.current.addEventListener('pause', handlePause);
			audioRef.current.addEventListener('ended', handlePause);
		}

		if (isPlaying) {
			audioRef.current.pause();
			setCurrentlyPlayingId(null);
		} else {
			audioRef.current.play();
			setCurrentlyPlayingId(id);
		}
		setIsPlaying(!isPlaying);
	};

	return (
		<Card className={`h-24 flex w-full relative overflow-hidden ${className}`}>
			{/* Waveform background */}
			<div
				className="absolute inset-0 opacity-50 bg-cover bg-center bg-no-repeat my-2"
				style={{
					backgroundImage: `url(${waveformUrl})`,
					backgroundSize: '100% calc(100% - 1rem)',
				}}
			/>
			{/* Progress waveform overlay */}
			<div
				className="absolute inset-0 opacity-100 bg-cover bg-center bg-no-repeat my-2"
				style={{
					backgroundImage: `url(${waveformUrl})`,
					backgroundSize: '100% calc(100% - 1rem)',
					clipPath: `inset(0 ${100 - progress}% 0 0)`,
				}}
			/>
			{/* Play button */}
			<div className="flex-none w-[100px] flex items-center justify-center border-r bg-background/80 relative z-10">
				<div className="relative">
					{isPlaying && (
						<div
							className="absolute inset-0 rounded-full bg-primary/20 animate-[pulse_1s_ease-out_infinite]"
							style={{
								animation: 'pulse 1s ease-out infinite',
								transformOrigin: 'center',
							}}
						/>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-16 w-16 rounded-full hover:bg-muted relative"
						onClick={handlePlayPause}
					>
						{isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
					</Button>
				</div>
			</div>
			{/* Content area */}
			{children}
		</Card>
	);
}
