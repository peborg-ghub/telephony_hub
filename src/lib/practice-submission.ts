import { COLUMNS, DAYS, isValidTimeZone, type Row } from './practices';
import { buildDate } from './site';

/** What the Add a New Practice form sends to /api/practices. */
export interface Submission {
	passcode: string;
	numbers: string[];
	practice_name: string;
	address_line1: string;
	address_line2: string;
	city: string;
	state: string;
	zip: string;
	/** Hours for mon..sun, already formatted, e.g. "8:00 AM – 5:00 PM", "Closed" or "". */
	hours: string[];
	timezone: string;
	notes: string;
	submitted_by: string;
	email: string;
	/** Honeypot: people never see it, so anything in it came from a bot. */
	bot_field?: string;
}

/** entries.csv columns: practices.csv's, so rows can be pasted straight in, then who sent it and when. */
export const ENTRY_COLUMNS = [...COLUMNS, 'submitted_by', 'email', 'submitted_at'] as const;

/** One row of entries.csv. */
export type EntryRow = Record<(typeof ENTRY_COLUMNS)[number], string>;

const LIMITS: Partial<Record<keyof Submission, number>> = {
	practice_name: 120,
	address_line1: 120,
	address_line2: 120,
	city: 80,
	notes: 500,
	submitted_by: 120,
	email: 200,
};

function text(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/** Same rule as the lookup: strip formatting, drop a leading country code 1. */
export function normalizeNumber(value: string): string {
	const digits = value.replace(/\D/g, '');
	return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** One day's hours, in the format the form produces: "8:00 AM – 5:00 PM" (en dash) or "Closed". */
const HOURS = /^(Closed|(1[0-2]|[1-9]):[0-5]\d (AM|PM) – (1[0-2]|[1-9]):[0-5]\d (AM|PM))$/;

/** Characters a phone number may be typed with: digits plus ( ) - . + and spaces. */
const PHONE_CHARS = /^[\d\s().+-]+$/;

/**
 * Checks the phone numbers exactly as sent, before any formatting is stripped, so letters or a
 * minus sign are reported instead of silently dropped. Returns the problems and the 10-digit numbers.
 */
function checkNumbers(value: unknown): { problems: string[]; numbers: string[] } {
	// A single value is treated as a list of one. JSON numbers are accepted too (e.g. 8135550101).
	const list: unknown[] = Array.isArray(value) ? value : value == null ? [] : [value];
	const given = list
		.map((n) => (typeof n === 'number' && Number.isFinite(n) ? String(n) : text(n)))
		.filter(Boolean);
	if (!given.length) return { problems: ['A phone number is required.'], numbers: [] };

	const problems: string[] = [];
	const withLetters = given.filter((n) => /[a-z]/i.test(n));
	const negative = given.filter((n) => n.startsWith('-'));
	const otherChars = given.filter((n) => !withLetters.includes(n) && !PHONE_CHARS.test(n));
	if (withLetters.length) problems.push(`Phone numbers can't contain letters: ${withLetters.join(', ')}`);
	if (negative.length) problems.push(`Phone numbers can't be negative: ${negative.join(', ')}`);
	if (otherChars.length) {
		problems.push(`Phone numbers can only contain digits, spaces and ( ) - . +: ${otherChars.join(', ')}`);
	}
	if (problems.length) return { problems, numbers: [] };

	const numbers = given.map(normalizeNumber);
	if (numbers.length > 20) problems.push('Enter 20 phone numbers or fewer.');
	const short = given.filter((_, i) => !/^\d{10}$/.test(numbers[i]));
	if (short.length) problems.push(`These aren't 10-digit phone numbers: ${short.join(', ')}`);
	if (new Set(numbers).size !== numbers.length) problems.push('A phone number is listed twice.');
	return { problems, numbers };
}

/**
 * Checks a submission without trusting the browser. Returns the problems found (with `field`
 * set when they're all about the phone numbers), or the practices.csv rows ready to store.
 */
export function validateSubmission(
	body: unknown,
): { problems: string[]; field?: 'numbers' } | { rows: Row[]; submission: Submission } {
	const raw = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
	const phone = checkNumbers(raw.numbers);
	const s: Submission = {
		passcode: text(raw.passcode),
		numbers: phone.numbers,
		practice_name: text(raw.practice_name),
		address_line1: text(raw.address_line1),
		address_line2: text(raw.address_line2),
		city: text(raw.city),
		state: text(raw.state).toUpperCase(),
		zip: text(raw.zip),
		hours: Array.isArray(raw.hours) ? raw.hours.map(text) : [],
		timezone: text(raw.timezone),
		notes: text(raw.notes).replace(/\s*\n\s*/g, '; '),
		submitted_by: text(raw.submitted_by),
		email: text(raw.email),
		bot_field: text(raw.bot_field),
	};
	const problems: string[] = [];

	if (!s.practice_name) problems.push('Enter the practice name.');
	problems.push(...phone.problems);
	if (s.state && !/^[A-Z]{2}$/.test(s.state)) problems.push('State should be 2 letters, e.g. FL.');
	if (s.zip && !/^\d{5}(-\d{4})?$/.test(s.zip)) problems.push('ZIP should be 5 digits, e.g. 33602.');
	if (!s.timezone || !isValidTimeZone(s.timezone)) problems.push('Choose a time zone.');
	if (s.hours.length !== DAYS.length) {
		problems.push('Hours of operation are required for all 7 days.');
	} else {
		const missing = DAY_NAMES.filter((_, i) => !s.hours[i]);
		const malformed = DAY_NAMES.filter((_, i) => s.hours[i] && !HOURS.test(s.hours[i]));
		if (missing.length) problems.push(`Enter hours, or "Closed", for: ${missing.join(', ')}.`);
		if (malformed.length) {
			problems.push(`Hours must look like "8:00 AM – 5:00 PM" or "Closed" for: ${malformed.join(', ')}.`);
		}
	}
	if (!s.submitted_by) problems.push('Enter your name.');
	if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) problems.push('Enter a valid email address, or leave it blank.');
	for (const [key, max] of Object.entries(LIMITS)) {
		if ((s[key as keyof Submission] as string).length > max!) problems.push(`${key.replace('_', ' ')} must be ${max} characters or fewer.`);
	}
	if (problems.length) {
		// Point the form at the phone numbers field when that's the only thing wrong.
		return phone.problems.length === problems.length ? { problems, field: 'numbers' } : { problems };
	}

	const rows = s.numbers.map((number) => {
		const row = Object.fromEntries(COLUMNS.map((c) => [c, ''])) as Row;
		Object.assign(row, {
			number,
			practice_name: s.practice_name,
			address_line1: s.address_line1,
			address_line2: s.address_line2,
			city: s.city,
			state: s.state,
			zip: s.zip,
			timezone: s.timezone,
			notes: s.notes,
			// Today in SITE_TIMEZONE, so a CSV export of added practices passes the date_added check.
			date_added: buildDate(),
		});
		DAYS.forEach((d, i) => (row[d] = s.hours[i]));
		return row;
	});
	return { rows, submission: s };
}

export function toEntry(row: Row, s: Submission, submittedAt: string): EntryRow {
	return { ...row, submitted_by: s.submitted_by, email: s.email, submitted_at: submittedAt };
}

/** One CSV line with the given columns (practices.csv's by default), quoting values that need it. */
export function toCsvLine(row: Partial<Record<string, string>>, columns: readonly string[] = COLUMNS): string {
	return columns
		.map((c) => {
			const v = row[c] ?? '';
			return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
		})
		.join(',');
}
