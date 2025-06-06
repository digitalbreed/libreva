import { createContext, useContext, useState, ReactNode } from 'react';

interface AudioContextType {
	currentlyPlayingId: string | null;
	setCurrentlyPlayingId: (id: string | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export function AudioProvider({ children }: { children: ReactNode }) {
	const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

	return (
		<AudioContext.Provider value={{ currentlyPlayingId, setCurrentlyPlayingId }}>
			{children}
		</AudioContext.Provider>
	);
}

export function useAudio() {
	const context = useContext(AudioContext);
	if (context === undefined) {
		throw new Error('useAudio must be used within an AudioProvider');
	}
	return context;
}
