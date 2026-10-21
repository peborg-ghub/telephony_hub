import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

export const DOCUMENTS_FILE = 'src/data/documents.yaml';

export interface DocumentsFile {
	/** Raw entries, each given an id like "#3 Q3 Call Volume Summary" so errors point at the right one. */
	entries: Record<string, unknown>[];
	/** Problems that involve the whole file or several entries. Empty when the file is fine. */
	problems: string[];
}

export function readDocumentsFile(text: string): DocumentsFile {
	let raw: unknown;
	try {
		raw = parse(text);
	} catch (e) {
		return { entries: [], problems: [`${DOCUMENTS_FILE} is not valid YAML. ${(e as Error).message}`] };
	}
	if (raw == null) return { entries: [], problems: [] };
	if (!Array.isArray(raw)) {
		return { entries: [], problems: [`${DOCUMENTS_FILE} must be a list of entries, each starting with "- title:"`] };
	}

	const problems: string[] = [];
	const entries: Record<string, unknown>[] = [];
	const seen = new Map<string, string>();

	raw.forEach((entry, i) => {
		const n = i + 1;
		if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
			problems.push(`entry #${n} is not a valid entry. Each entry starts with "- title:" followed by its fields.`);
			return;
		}
		const title = typeof entry.title === 'string' && entry.title.trim() ? entry.title.trim() : '(no title)';
		const id = `#${n} ${title}`;

		for (const key of ['file', 'url'] as const) {
			const value = typeof entry[key] === 'string' ? entry[key].trim() : '';
			if (!value) continue;
			const other = seen.get(`${key}:${value}`);
			if (other) problems.push(`entry ${id} uses the same ${key} as entry ${other}: ${value}`);
			else seen.set(`${key}:${value}`, id);
		}
		entries.push({ ...entry, id });
	});

	return { entries, problems };
}

/** Throws (failing the build) if documents.yaml has file-level problems. */
export function assertDocumentsFile(): void {
	const { problems } = readDocumentsFile(readFileSync(DOCUMENTS_FILE, 'utf8'));
	if (problems.length) {
		throw new Error(`Problem(s) in ${DOCUMENTS_FILE}:\n  - ${problems.join('\n  - ')}\n`);
	}
}
