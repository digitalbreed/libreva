import { NextRequest, NextResponse } from 'next/server';
import { query, run } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Specify Node.js runtime
export const runtime = 'nodejs';

// Service configuration
const ttsServiceUrl = process.env.TTS_SERVICE_URL || 'http://libreva-tts:3100';

type TtsRequest = {
	text: string;
	voice: 'default' | 'custom';
	voice_sample?: string;
	exaggeration: number;
	temperature: number;
};

class VoiceNotFoundError extends Error {
	constructor(voiceId: string) {
		super(`Voice with ID ${voiceId} not found`);
		this.name = 'VoiceNotFoundError';
	}
}

class TtsServiceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TtsServiceError';
	}
}

async function generateSpeech(
	text: string,
	voiceId: string | null,
	exaggeration: number,
	temperature: number
): Promise<ArrayBuffer> {
	let requestBody: TtsRequest = {
		text,
		voice: 'default',
		exaggeration,
		temperature,
	};

	if (!voiceId || voiceId === 'default') {
		requestBody.voice = 'default';
	} else {
		// Check if voice exists
		const [voice] = await query<{ id: string }>('SELECT id FROM voices WHERE id = ?', [
			voiceId,
		]);

		if (!voice) {
			throw new VoiceNotFoundError(voiceId);
		}

		// Read voice file
		const voicesDir = process.env.VOICES_DIR || path.join(process.cwd(), 'data', 'voices');
		const voicePath = path.join(voicesDir, `${voiceId}.wav`);
		const voiceBuffer = await readFile(voicePath);

		requestBody = {
			text,
			voice: 'custom',
			voice_sample: voiceBuffer.toString('base64'),
			exaggeration,
			temperature,
		};
	}

	const response = await fetch(`${ttsServiceUrl}/tts`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		throw new TtsServiceError('Failed to generate speech');
	}

	return response.arrayBuffer();
}

async function generateWaveform(audioPath: string, waveformPath: string): Promise<void> {
	// Create form data with the audio file
	const formData = new FormData();
	formData.append(
		'file',
		new Blob([await readFile(audioPath)], { type: 'audio/wav' }),
		path.basename(audioPath)
	);

	const waveformResponse = await fetch(`${ttsServiceUrl}/generate-waveform`, {
		method: 'POST',
		body: formData,
	});

	if (!waveformResponse.ok) {
		throw new Error('Failed to generate waveform');
	}

	// Save waveform image
	await writeFile(waveformPath, Buffer.from(await waveformResponse.arrayBuffer()));
}

export async function POST(request: NextRequest) {
	try {
		const { text, voiceId, projectId, exaggeration, temperature } = await request.json();

		if (!text?.trim()) {
			return NextResponse.json({ error: 'Text is required' }, { status: 400 });
		}

		if (!projectId) {
			return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
		}

		// Validate exaggeration and temperature
		if (typeof exaggeration !== 'number' || exaggeration < 0 || exaggeration > 2) {
			return NextResponse.json(
				{ error: 'Exaggeration must be a number between 0 and 2' },
				{ status: 400 }
			);
		}

		if (typeof temperature !== 'number' || temperature < 0 || temperature > 1) {
			return NextResponse.json(
				{ error: 'Temperature must be a number between 0 and 1' },
				{ status: 400 }
			);
		}

		// Generate speech
		const audioBuffer = await generateSpeech(text, voiceId, exaggeration, temperature);

		// Generate a unique ID for the output
		const outputId = uuidv4();

		// Save the audio file in project-specific directory
		const outputsDir = process.env.OUTPUTS_DIR || path.join(process.cwd(), 'data', 'outputs');
		const projectDir = path.join(outputsDir, projectId);
		const outputPath = path.join(projectDir, `${outputId}.wav`);

		// Ensure project directory exists
		await mkdir(projectDir, { recursive: true });
		await writeFile(outputPath, Buffer.from(audioBuffer));

		// Generate and save waveform in the same project directory
		const waveformPath = path.join(projectDir, `${outputId}.png`);
		await generateWaveform(outputPath, waveformPath);

		// Store output in database
		await run(
			`INSERT INTO outputs (id, project_id, voice_id, text, exaggeration, temperature, created_at)
			VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
			[outputId, projectId, voiceId || 'default', text, exaggeration, temperature]
		);

		return new NextResponse(audioBuffer, {
			headers: {
				'Content-Type': 'audio/wav',
				'Content-Length': audioBuffer.byteLength.toString(),
			},
		});
	} catch (error) {
		console.error('TTS error:', error);
		if (error instanceof VoiceNotFoundError) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		if (error instanceof TtsServiceError) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
		return NextResponse.json({ error: 'Failed to generate speech' }, { status: 500 });
	}
}

// Handle GET requests to prevent 404s
export async function GET() {
	return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
