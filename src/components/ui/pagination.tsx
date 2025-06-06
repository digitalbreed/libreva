import { Button } from '@/components/ui/button';

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
	// Don't render if there's only one page or no pages
	if (totalPages <= 1) return null;

	return (
		<div className="flex items-center justify-center gap-2 mt-4">
			<Button
				variant="outline"
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage <= 1}
			>
				Previous
			</Button>
			<div className="flex items-center gap-1">
				{Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
					<Button
						key={pageNum}
						variant={pageNum === currentPage ? 'default' : 'outline'}
						onClick={() => onPageChange(pageNum)}
						className="w-10"
					>
						{pageNum}
					</Button>
				))}
			</div>
			<Button
				variant="outline"
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage >= totalPages}
			>
				Next
			</Button>
		</div>
	);
}
