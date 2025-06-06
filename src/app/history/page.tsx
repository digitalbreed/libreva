'use client';

import { useEffect, useState, useCallback } from 'react';
import { getApiUrl } from '@/app/utils/api';
import { OutputCard } from '@/components/outputs/OutputCard';
import { Pagination } from '@/components/ui/pagination';
import { AudioProvider } from '@/contexts/AudioContext';
import { Mic } from 'lucide-react';

interface Output {
	id: string;
	text: string;
	voice_id: string;
	voice_name: string;
	temperature: number;
	exaggeration: number;
	created_at: string;
	project_id: string;
	project_title: string;
}

export default function HistoryPage() {
	const [outputs, setOutputs] = useState<Output[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);

	const loadOutputs = useCallback(async (pageNum: number = 1) => {
		try {
			const response = await fetch(getApiUrl(`/api/outputs?page=${pageNum}&limit=10`));
			if (!response.ok) {
				throw new Error('Failed to load outputs');
			}
			const data = await response.json();
			setOutputs(data.outputs);
			setTotalPages(data.pagination.totalPages);
			setPage(pageNum);
		} catch (error) {
			console.error('Error loading outputs:', error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		loadOutputs(1);
	}, [loadOutputs]);

	const handleOutputDeleted = (outputId: string) => {
		// Optimistically remove from UI
		setOutputs(outputs.filter((output) => output.id !== outputId));

		// Fire and forget the delete API call
		fetch(getApiUrl(`/api/outputs/${outputId}`), {
			method: 'DELETE',
		}).catch((error) => {
			console.error('Error deleting output:', error);
		});
	};

	return (
		<AudioProvider>
			<div className="p-6 space-y-6">
				<h1 className="text-2xl font-semibold">History</h1>

				<div className="space-y-4">
					{isLoading ? (
						<div>Loading outputs...</div>
					) : outputs.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-12 text-center">
							<div className="rounded-full bg-muted p-4 mb-4">
								<Mic className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-semibold mb-2">No outputs yet</h3>
							<p className="text-muted-foreground">
								Generated outputs will appear here.
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{outputs.map((output) => (
								<OutputCard
									key={output.id}
									output={output}
									onDelete={handleOutputDeleted}
									showProjectInfo={true}
								/>
							))}
							<Pagination
								currentPage={page}
								totalPages={totalPages}
								onPageChange={loadOutputs}
							/>
						</div>
					)}
				</div>
			</div>
		</AudioProvider>
	);
}
