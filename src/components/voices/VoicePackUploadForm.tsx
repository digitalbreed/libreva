'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import JSZip from 'jszip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getApiUrl } from '@/app/utils/api';
import type { Voice } from '@/types/voice';
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from './config';
import { useToast } from '@/hooks/use-toast';

interface VoicePackUploadFormProps {
	existingVoices: Voice[];
	onVoicesAdded: (voices: Voice[]) => void;
	onClose: () => void;
}

interface VoiceJson {
	name: string;
	notes: string;
	gender: string;
	file_name: string;
	tags?: string[];
}

interface VoicePackMetadata {
	version: string;
	author: string;
	repository: string;
	voices: VoiceJson[];
	_jsonDir: string;
	base?: string;
}

interface Progress {
	current: number;
	total: number;
}

export default function VoicePackUploadForm({
	existingVoices,
	onVoicesAdded,
	onClose,
}: VoicePackUploadFormProps) {
	const [status, setStatus] = useState<
		'idle' | 'parsing' | 'confirming' | 'uploading' | 'done' | 'error'
	>('idle');
	const [progress, setProgress] = useState<Progress>({ current: 0, total: 0 });
	const [error, setError] = useState<string>('');
	const [droppedFile, setDroppedFile] = useState<File | null>(null);
	const [metadata, setMetadata] = useState<VoicePackMetadata | null>(null);
	const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const { toast } = useToast();

	const handleFile = async (file: File) => {
		setError('');
		setStatus('parsing');
		setProgress({ current: 0, total: 0 });
		try {
			const zip = await JSZip.loadAsync(file);
			setZipInstance(zip);

			// Try to find voices.json in root or first level directories
			let jsonFile = zip.file('voices.json');
			let jsonPath = 'voices.json';
			if (!jsonFile) {
				// Search in first level directories
				const firstLevelDirs = Object.keys(zip.files).filter((path) => {
					const parts = path.split('/');
					return parts.length === 2 && parts[1] === 'voices.json';
				});

				if (firstLevelDirs.length === 0) {
					throw new Error(
						'voices.json not found in zip (checked root and first level directories).'
					);
				}

				if (firstLevelDirs.length > 1) {
					throw new Error('Multiple voices.json files found in first level directories.');
				}

				jsonPath = firstLevelDirs[0];
				jsonFile = zip.file(jsonPath);
				if (!jsonFile) {
					throw new Error('Failed to read voices.json from first level directory.');
				}
			}

			if (!jsonFile) {
				throw new Error('Failed to read voices.json file.');
			}

			const jsonText = await jsonFile.async('string');
			let voicePack: VoicePackMetadata;
			try {
				voicePack = JSON.parse(jsonText);
			} catch {
				throw new Error('voices.json is not valid JSON.');
			}

			// Validate metadata
			if (!Array.isArray(voicePack.voices)) {
				throw new Error('voices.json must contain a voices array.');
			}

			// Validate repository URL if provided
			if (voicePack.repository) {
				try {
					new URL(voicePack.repository);
				} catch {
					throw new Error('repository must be a valid URL when provided.');
				}
			}

			// Store the directory of voices.json for later use
			const jsonDir = jsonPath.includes('/')
				? jsonPath.substring(0, jsonPath.lastIndexOf('/') + 1)
				: '';
			setMetadata({ ...voicePack, _jsonDir: jsonDir });
			setStatus('confirming');
		} catch (err: unknown) {
			setError(err instanceof Error ? err.message : 'Unknown error');
			setStatus('error');
		}
	};

	const handleConfirm = async () => {
		if (!metadata || !zipInstance) return;

		setStatus('uploading');
		// Validate and filter
		const existingNames = new Set(existingVoices.map((v) => v.name));
		const toUpload = metadata.voices.filter(
			(v: VoiceJson) => v.name && !existingNames.has(v.name)
		);
		setProgress({ current: 0, total: toUpload.length });

		const newVoices: Voice[] = [];
		const skippedVoices: string[] = [];
		for (let i = 0; i < toUpload.length; i++) {
			const v = toUpload[i];
			if (!v.name || !v.file_name || !v.gender || typeof v.notes !== 'string') {
				setError(
					`Invalid entry for voice #${i + 1}. Required: name, file_name, gender, notes.`
				);
				setStatus('error');
				return;
			}

			// Resolve the wav file path relative to voices.json location
			const basePath = metadata.base
				? `${metadata._jsonDir}${metadata.base}/`
				: metadata._jsonDir;
			const wavPath = basePath + v.file_name;
			const wavFile = zipInstance.file(wavPath);
			if (!wavFile) {
				setError(
					`File ${v.file_name} not found in zip for voice '${v.name}'. Expected at: ${wavPath}`
				);
				setStatus('error');
				return;
			}

			// Check file size limit
			const wavBlob = await wavFile.async('blob');
			if (wavBlob.size > MAX_FILE_SIZE_BYTES) {
				skippedVoices.push(v.name);
				continue;
			}

			const formData = new FormData();
			formData.append('file', new File([wavBlob], v.file_name, { type: 'audio/wav' }));
			formData.append('name', v.name);
			formData.append(
				'notes',
				metadata.repository ? `${v.notes} (via ${metadata.repository})` : v.notes
			);
			formData.append('gender', v.gender);
			formData.append('tags', JSON.stringify(Array.isArray(v.tags) ? v.tags : []));
			try {
				const response = await fetch(getApiUrl('/api/voices'), {
					method: 'POST',
					body: formData,
				});
				if (!response.ok) throw new Error();
				const created = await response.json();
				newVoices.push(created);
			} catch {
				setError(`Failed to upload voice '${v.name}'.`);
				setStatus('error');
				return;
			}
			setProgress({ current: i + 1, total: toUpload.length });
		}

		// Show toast for any skipped voices
		if (skippedVoices.length > 0) {
			toast({
				title: 'Some voices were skipped',
				description: `The following voices exceeded the ${MAX_FILE_SIZE_MB}MB size limit and were skipped: ${skippedVoices.join(', ')}`,
				variant: 'destructive',
			});
		}

		setStatus('done');
		onVoicesAdded(newVoices);
	};

	const onDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		const file = e.dataTransfer.files[0];
		if (file && file.name.endsWith('.zip')) {
			setDroppedFile(file);
			handleFile(file);
		} else {
			setError('Please drop a .zip file.');
		}
	};

	const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file && file.name.endsWith('.zip')) {
			setDroppedFile(file);
			handleFile(file);
		} else {
			setError('Please select a .zip file.');
		}
	};

	return (
		<div>
			<div
				onDrop={onDrop}
				onDragOver={(e) => e.preventDefault()}
				className="border-2 border-dashed rounded-lg p-8 text-center mb-4 cursor-pointer hover:bg-muted"
				onClick={() => inputRef.current && inputRef.current.click()}
				style={{ background: droppedFile ? 'var(--background)' : undefined }}
			>
				{droppedFile ? (
					<div className="text-foreground font-medium">{droppedFile.name}</div>
				) : (
					<div>Drag and drop a voice pack (.zip) here, or click to select</div>
				)}
				<Input
					ref={inputRef}
					type="file"
					accept=".zip"
					className="hidden"
					onChange={onFileChange}
				/>
			</div>
			{status === 'confirming' && metadata && (
				<div className="mb-4 p-4 border rounded-lg bg-muted">
					<h3 className="font-semibold mb-2">Voice Pack Information</h3>
					<div className="space-y-1">
						<p>
							<span className="font-medium">Version:</span> {metadata.version}
						</p>
						<p>
							<span className="font-medium">Author:</span> {metadata.author}
						</p>
						<p>
							<span className="font-medium">Repository:</span> {metadata.repository}
						</p>
						<p>
							<span className="font-medium">Number of voices:</span>{' '}
							{metadata.voices.length}
						</p>
					</div>
					<div className="flex gap-2 mt-4">
						<Button onClick={handleConfirm}>Confirm Upload</Button>
						<Button variant="outline" onClick={() => setStatus('idle')}>
							Discard
						</Button>
					</div>
				</div>
			)}
			{status === 'uploading' && (
				<div className="mb-2">
					Uploading {progress.current + 1} of {progress.total}...
				</div>
			)}
			{status === 'done' && (
				<div className="mb-2 text-green-600">All voices uploaded successfully!</div>
			)}
			{error && <div className="mb-2 text-red-600">{error}</div>}
			<div className="flex gap-2 mt-4 justify-end">
				<Button variant="outline" onClick={onClose} disabled={status === 'uploading'}>
					Close
				</Button>
			</div>
		</div>
	);
}
