import type { APIRoute } from 'astro';
import { ENTRIES_FILE, readEntriesCsv } from '../../lib/practice-store';

export const prerender = false;

/** GET /api/entries.csv → downloads entries.csv: every form submission, with who sent it and when. */
export const GET: APIRoute = async () =>
	new Response(await readEntriesCsv(), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${ENTRIES_FILE}"`,
			'Cache-Control': 'no-store',
		},
	});
