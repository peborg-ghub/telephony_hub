import { getStore } from '@netlify/blobs';
import { parse } from 'csv-parse/sync';
import { ENTRY_COLUMNS, toCsvLine, type EntryRow } from './practice-submission';

/**
 * Practices added through the form live in one CSV file, entries.csv, kept in Netlify Blobs
 * (the deployed site's own files are read-only). Download it from /api/entries.csv.
 */
export const ENTRIES_FILE = 'entries.csv';

const store = () => getStore({ name: 'practices', consistency: 'strong' });

/** Attempts before giving up when other submissions keep landing at the same moment. */
const MAX_ATTEMPTS = 10;

export function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
	});
}

/** Parses entries.csv by its own header, so files written before a column was added still load. */
function parseEntries(text: string): EntryRow[] {
	const records: Record<string, string>[] = parse(text, { bom: true, columns: true, skip_empty_lines: true });
	return records.map((r) => Object.fromEntries(ENTRY_COLUMNS.map((c) => [c, r[c] ?? ''])) as EntryRow);
}

function toEntriesCsv(rows: EntryRow[]): string {
	return [ENTRY_COLUMNS.join(','), ...rows.map((r) => toCsvLine(r, ENTRY_COLUMNS))].join('\n') + '\n';
}

/** Every row of entries.csv, oldest first. */
export async function readEntries(): Promise<EntryRow[]> {
	const text = await store().get(ENTRIES_FILE, { type: 'text' });
	return text ? parseEntries(text) : [];
}

/** entries.csv as text, always with the current header (empty file = header only). */
export async function readEntriesCsv(): Promise<string> {
	return toEntriesCsv(await readEntries());
}

/**
 * Appends rows to entries.csv. Refuses the whole batch if any number is already in the file.
 *
 * Each pass reads the file, writes it back with the missing rows only if nobody changed it in
 * the meantime, then loops to re-read it. It reports success only once a read shows every row,
 * so two submissions at the same moment can't silently overwrite each other. (Netlify's
 * conditional write should already prevent that; the local emulator's doesn't, so the re-read
 * is what guarantees it.)
 */
export async function appendEntries(newRows: EntryRow[]): Promise<{ saved: EntryRow[] } | { taken: string[] }> {
	const s = store();
	// A row counts as ours if it has our number and our exact submitted_at timestamp.
	const isOurs = (e: EntryRow, r: EntryRow) => e.number === r.number && e.submitted_at === r.submitted_at;

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
		// The etag comes from list() because the local Blobs emulator leaves it off get and head
		// responses. Reading it before the data is safe: if the file changes in between, the etag
		// is stale and the conditional write below is refused.
		const { blobs } = await s.list({ prefix: ENTRIES_FILE });
		const meta = blobs.find((b) => b.key === ENTRIES_FILE);
		const text = meta ? await s.get(ENTRIES_FILE, { type: 'text' }) : null;
		const rows = text ? parseEntries(text) : [];

		const missing = newRows.filter((r) => !rows.some((e) => isOurs(e, r)));
		if (!missing.length) return { saved: newRows };

		const taken = missing.filter((r) => rows.some((e) => e.number === r.number)).map((r) => r.number);
		if (taken.length) return { taken };

		await s.set(
			ENTRIES_FILE,
			toEntriesCsv([...rows, ...missing]),
			meta?.etag ? { onlyIfMatch: meta.etag } : { onlyIfNew: true },
		);
	}
	throw new Error(`Could not save to ${ENTRIES_FILE}: it kept changing during the write.`);
}
