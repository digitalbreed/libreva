'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/app/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Voice {
	id: string;
	name: string;
	gender: 'male' | 'female' | null;
}

interface TtsConverterProps {
	projectId: string;
	onOutputCreated?: () => void;
}

const MAX_CHARS = 3000;

export default function TtsConverter({ projectId, onOutputCreated }: TtsConverterProps) {
	const [text, setText] = useState('');
	const [voiceId, setVoiceId] = useState<string>('');
	const [voices, setVoices] = useState<Voice[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [exaggeration, setExaggeration] = useState(0.5);
	const [temperature, setTemperature] = useState(0.5);
	const { toast } = useToast();

	useEffect(() => {
		// Fetch available voices
		fetch(getApiUrl('/api/voices'))
			.then((res) => res.json())
			.then((data) => {
				if (!data.voices || !Array.isArray(data.voices)) {
					console.error('Invalid voices response:', data);
					toast({
						title: 'Error',
						description: 'Invalid response from voices API',
						variant: 'destructive',
					});
					return;
				}
				setVoices(data.voices);
			})
			.catch((error) => {
				console.error('Failed to fetch voices:', error);
				toast({
					title: 'Error',
					description: 'Failed to load voices. Please try again.',
					variant: 'destructive',
				});
			});
	}, [toast]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!voiceId) {
			toast({
				title: 'Error',
				description: 'Please select a voice before generating speech.',
				variant: 'destructive',
			});
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch(getApiUrl('/api/tts'), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ text, voiceId, projectId, exaggeration, temperature }),
			});

			if (!response.ok) {
				throw new Error('Failed to generate speech');
			}

			toast({
				title: 'Success',
				description: 'Speech generated and saved to project.',
			});
			onOutputCreated?.();
		} catch (error) {
			console.error('Error:', error);
			toast({
				title: 'Error',
				description: 'Failed to generate speech. Please try again.',
				variant: 'destructive',
			});
		} finally {
			setIsLoading(false);
		}
	};

	const handleNumberChange = (
		value: string,
		setter: (value: number) => void,
		min: number,
		max: number
	) => {
		const num = parseFloat(value);
		if (!isNaN(num) && num >= min && num <= max) {
			setter(parseFloat(num.toFixed(1)));
		}
	};

	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>Generate Speech</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="flex flex-col gap-6">
					<div className="flex gap-4 items-end">
						<div className="flex-1">
							<Label htmlFor="voice">Select Voice</Label>
							<Select value={voiceId} onValueChange={setVoiceId}>
								<SelectTrigger>
									<SelectValue placeholder="Select a voice" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="default">Default Voice</SelectItem>
									{voices.map((voice) => (
										<SelectItem key={voice.id} value={voice.id}>
											{voice.name} {voice.gender ? `(${voice.gender})` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="w-32">
							<Label htmlFor="exaggeration">Exaggeration</Label>
							<Input
								id="exaggeration"
								type="number"
								min="0"
								max="2"
								step="0.1"
								value={exaggeration}
								onChange={(e) =>
									handleNumberChange(e.target.value, setExaggeration, 0, 2)
								}
							/>
						</div>
						<div className="w-32">
							<Label htmlFor="temperature">Temperature</Label>
							<Input
								id="temperature"
								type="number"
								min="0"
								max="1"
								step="0.1"
								value={temperature}
								onChange={(e) =>
									handleNumberChange(e.target.value, setTemperature, 0, 1)
								}
							/>
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<div className="flex justify-between items-center">
							<Label htmlFor="text">Text to Convert</Label>
							<span className="text-sm text-muted-foreground">
								{text.length}/{MAX_CHARS} characters
							</span>
						</div>
						<Textarea
							id="text"
							value={text}
							onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
							placeholder="Enter the text you want to convert to speech..."
							className="min-h-[150px]"
							required
						/>
					</div>

					<Button type="submit" disabled={isLoading || text.length < 3 || !voiceId}>
						{isLoading ? 'Generating...' : 'Generate Speech'}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}
