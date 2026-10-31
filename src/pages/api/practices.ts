import type { APIRoute } from 'astro';
import { createHash, timingSafeEqual } from 'node:crypto';
import csvText from '../../data/practices.csv?raw';
import { parsePracticeRows, parsePractices, toListItem, toPractice, type Practice } from '../../lib/practices';
import { appendEntries, json } from '../../lib/practice-store';
import { toEntry, validateSubmission } from '../../lib/practice-submission';

// Runs on Netlify as a function; every other page stays static.
export const prerender = false;

function passcodeMatches(given: string, expected: string): boolean {
	const hash = (s: string) => createHash('sha256').update(s).digest();
	return timingSafeEqual(hash(given), hash(expected));
}

/**
 * GET /api/practices → every practice in practices.csv, newest date_added first:
 *   [{ number, name, address, hours, tz, notes?, dateAdded, dateModified? }, …]
 * Practices on the same date keep file order reversed, so a row lower in the file comes first.
 * The CSV is bundled at deploy time, so this reflects practices.csv as of the last deploy.
 * Practices added through the form are at /api/practices/added.
 */
export const GET: APIRoute = () => {
	const list = parsePracticeRows(csvText)
		.map(toListItem)
		.reverse()
		.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
	return json(list);
};

/**
 * POST /api/practices with the form's JSON → appends one row per phone number to entries.csv
 * (Netlify Blobs) and returns 201 { entries: [the saved rows], practices: { number: lookup card } }.
 * The practice shows in the lookup immediately.
 */
export const POST: APIRoute = async ({ request }) => {
	// process.env is read at request time on Netlify; import.meta.env covers .env in local dev.
	const expected = process.env.PRACTICE_FORM_PASSCODE || import.meta.env.PRACTICE_FORM_PASSCODE;
	if (!expected) {
		return json({ problems: ["The form isn't set up yet: the team passcode hasn't been configured."] }, 503);
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ problems: ['The request was not valid.'] }, 400);
	}

	const result = validateSubmission(body);
	if ('problems' in result) return json({ problems: result.problems, field: result.field }, 400);
	const { rows, submission } = result;

	// Pretend success to bots so they don't retry, but store nothing.
	if (submission.bot_field) return json({ entries: [], practices: {} }, 201);

	if (!passcodeMatches(submission.passcode, expected)) {
		return json({ problems: ['The team passcode is incorrect.'], field: 'passcode' }, 403);
	}

	const inCsv = parsePractices(csvText);
	const taken = (numbers: string[]) =>
		json({ problems: [`Already in the lookup: ${numbers.join(', ')}.`], field: 'numbers' }, 409);
	const inPracticesCsv = rows.filter((r) => inCsv[r.number]).map((r) => r.number);
	if (inPracticesCsv.length) return taken(inPracticesCsv);

	const now = new Date().toISOString();
	const appended = await appendEntries(rows.map((row) => toEntry(row, submission, now)));
	if ('taken' in appended) return taken(appended.taken);

	// entries: the rows exactly as saved in entries.csv. practices: the same data in the lookup's shape.
	const practices: Record<string, Practice> = {};
	for (const entry of appended.saved) practices[entry.number] = toPractice(entry);
	return json({ entries: appended.saved, practices }, 201);
};
