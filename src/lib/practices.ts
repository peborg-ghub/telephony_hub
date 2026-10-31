import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

export const PRACTICES_FILE = 'src/data/practices.csv';

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const COLUMNS = [
	'number',
	'practice_name',
	'address_line1',
	'address_line2',
	'city',
	'state',
	'zip',
	...DAYS,
	'timezone',
	'notes',
	'date_added',
	'date_modified',
] as const;

type Column = (typeof COLUMNS)[number];
export type Row = Record<Column, string>;

/** What the browser receives for one phone number. Kept short to keep the page small. */
export interface Practice {
	name: string;
	address: string[];
	/** Hours for mon..sun, in that order. */
	hours: string[];
	tz: string;
	notes?: string;
}

export function isValidTimeZone(tz: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz });
		return true;
	} catch {
		return false;
	}
}

export function toPractice(row: Row): Practice {
	const cityLine = [row.city, [row.state, row.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
	return {
		name: row.practice_name,
		address: [row.address_line1, row.address_line2, cityLine].filter(Boolean),
		hours: DAYS.map((d) => row[d]),
		tz: row.timezone,
		...(row.notes ? { notes: row.notes } : {}),
	};
}

/** One practice in the API lists: the lookup card's fields plus its number and dates. */
export interface PracticeListItem extends Practice {
	number: string;
	/** YYYY-MM-DD, from the date_added column. */
	dateAdded: string;
	/** YYYY-MM-DD, from the date_modified column. Left out if the row was never modified. */
	dateModified?: string;
}

export function toListItem(row: Row): PracticeListItem {
	return {
		number: row.number,
		...toPractice(row),
		dateAdded: row.date_added,
		...(row.date_modified ? { dateModified: row.date_modified } : {}),
	};
}

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const d = new Date(`${value}T00:00:00Z`);
	return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Reads and validates practices.csv. Throws (failing the build) with every problem found,
 * each tagged with its CSV line number. Returns a map of 10-digit number → practice.
 * (The lookup only needs number → practice; date_added is for the /api/practices list.)
 */
export function loadPractices(): Record<string, Practice> {
	return parsePractices(readFileSync(PRACTICES_FILE, 'utf8'));
}

/** Validates the text of practices.csv. Used directly by the server, which has no file system. */
export function parsePractices(text: string): Record<string, Practice> {
	return Object.fromEntries(parsePracticeRows(text).map((row) => [row.number, toPractice(row)]));
}

/** Validates the text of practices.csv and returns its rows in file order. Throws listing every problem. */
export function parsePracticeRows(text: string): Row[] {
	const problems: string[] = [];
	let records: { record: Row; info: { lines: number } }[];

	try {
		records = parse(text, {
			bom: true,
			trim: true,
			skip_empty_lines: true,
			info: true,
			columns: (header: string[]) => {
				const got = header.map((h) => h.trim());
				if (got.join(',') !== COLUMNS.join(',')) {
					const missing = COLUMNS.filter((c) => !got.includes(c));
					const extra = got.filter((c) => !(COLUMNS as readonly string[]).includes(c));
					throw new Error(
						`line 1: the header row must be exactly:\n    ${COLUMNS.join(',')}` +
							(missing.length ? `\n    Missing: ${missing.join(', ')}` : '') +
							(extra.length ? `\n    Unexpected: ${extra.join(', ')}` : '') +
							(!missing.length && !extra.length ? '\n    (The columns are in the wrong order.)' : ''),
					);
				}
				return got;
			},
		});
	} catch (e) {
		const err = e as Error & { lines?: number; code?: string };
		const where = err.lines && !err.message.startsWith('line ') ? `line ${err.lines}: ` : '';
		const hint =
			err.code === 'CSV_RECORD_INCONSISTENT_COLUMNS'
				? `\n    Every row needs ${COLUMNS.length} columns. If a value contains a comma, wrap the whole value in "double quotes".`
				: '';
		throw new Error(`Problem in ${PRACTICES_FILE}:\n  - ${where}${err.message}${hint}\n`);
	}

	const firstSeen = new Map<string, number>();

	for (const { record, info } of records) {
		const line = info.lines;
		const number = record.number;

		if (!/^\d{10}$/.test(number)) {
			problems.push(
				`line ${line}: number "${number}" must be exactly 10 digits with no spaces, dashes or brackets (e.g. 8135550101)`,
			);
		} else if (firstSeen.has(number)) {
			problems.push(`line ${line}: number ${number} is a duplicate of line ${firstSeen.get(number)}`);
		} else {
			firstSeen.set(number, line);
		}

		if (!record.practice_name) problems.push(`line ${line}: practice_name is empty`);

		if (!record.timezone) {
			problems.push(`line ${line}: timezone is empty (use a name like America/New_York or America/Chicago)`);
		} else if (!isValidTimeZone(record.timezone)) {
			problems.push(
				`line ${line}: timezone "${record.timezone}" isn't recognised (use a name like America/New_York or America/Chicago)`,
			);
		}

		if (!record.date_added) {
			problems.push(`line ${line}: date_added is empty (use YYYY-MM-DD, e.g. 2026-10-31)`);
		} else if (!isIsoDate(record.date_added)) {
			problems.push(`line ${line}: date_added "${record.date_added}" must be a real date written YYYY-MM-DD, e.g. 2026-10-31`);
		}

		// Optional: blank until the row is edited after it was added.
		if (record.date_modified) {
			if (!isIsoDate(record.date_modified)) {
				problems.push(
					`line ${line}: date_modified "${record.date_modified}" must be a real date written YYYY-MM-DD, or left empty`,
				);
			} else if (isIsoDate(record.date_added) && record.date_modified < record.date_added) {
				problems.push(`line ${line}: date_modified ${record.date_modified} is before date_added ${record.date_added}`);
			}
		}
	}

	if (problems.length) {
		throw new Error(`Problem(s) in ${PRACTICES_FILE}:\n  - ${problems.join('\n  - ')}\n`);
	}
	return records.map((r) => r.record);
}
