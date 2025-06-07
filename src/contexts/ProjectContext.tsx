'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ProjectContextType {
	refreshProjects: () => void;
	refreshTrigger: number;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
	const [refreshTrigger, setRefreshTrigger] = useState(0);

	const refreshProjects = useCallback(() => {
		setRefreshTrigger((prev) => prev + 1);
	}, []);

	return (
		<ProjectContext.Provider value={{ refreshProjects, refreshTrigger }}>
			{children}
		</ProjectContext.Provider>
	);
}

export function useProjects() {
	const context = useContext(ProjectContext);
	if (context === undefined) {
		throw new Error('useProjects must be used within a ProjectProvider');
	}
	return context;
}
