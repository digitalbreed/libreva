export interface Voice {
	id: string;
	name: string;
	notes?: string;
	gender?: 'male' | 'female';
	is_favorite: boolean;
	tags?: string[];
	created_at: string;
	updated_at: string;
}
