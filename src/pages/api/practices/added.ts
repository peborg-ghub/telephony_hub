import type { APIRoute } from 'astro';
import { toPractice, type Practice } from '../../../lib/practices';
import { json, readEntries } from '../../../lib/practice-store';
import { toCsvLine } from '../../../lib/practice-submission';

export const prerender = false;

/**
 * Practices added through the Add a New Practice form (entries.csv in Netlify Blobs), not practices.csv.
 * GET /api/practices/added            → { "8135550101": { name, address, hours, tz, notes }, … } for the lookup
 * GET /api/practices/added?format=csv → the same practices as practices.csv rows, to paste into the file
 * The full entries.csv, with who submitted each one, is at /api/entries.csv.
 */
export const GET: APIRoute = async ({ url }) => {
	const entries = await readEntries();
	if (url.searchParams.get('format') === 'csv') {
		const lines = entries.map((e) => toCsvLine(e));
		return new Response(lines.join('\n') + (lines.length ? '\n' : ''), {
			headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' },
		});
	}
	const practices: Record<string, Practice> = {};
	for (const e of entries) practices[e.number] = toPractice(e);
	return json(practices);
};
