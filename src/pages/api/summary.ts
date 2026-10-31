import type { APIRoute } from 'astro';
import csvText from '../../data/practices.csv?raw';
import { parsePracticeRows, toListItem, type PracticeListItem } from '../../lib/practices';
import { json } from '../../lib/practice-store';
import { SITE_TIMEZONE, buildDate } from '../../lib/site';

export const prerender = false;

const WEEK_DAYS = 7;

/** "2026-10-31" minus n days → "2026-10-25". */
function daysBefore(date: string, n: number): string {
	const d = new Date(`${date}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - n);
	return d.toISOString().slice(0, 10);
}

const newestFirst = (key: 'dateAdded' | 'dateModified') => (a: PracticeListItem, b: PracticeListItem) =>
	(b[key] ?? '').localeCompare(a[key] ?? '');

/**
 * GET /api/summary → practices in practices.csv added or modified in the last 7 days
 * (today and the 6 days before, in SITE_TIMEZONE), newest first:
 *   {
 *     from, to, timezone,
 *     counts: { added, modified },
 *     added:    [{ number, name, address, hours, tz, notes?, dateAdded, dateModified? }, …],
 *     modified: [ …same shape… ]
 *   }
 * A practice added this week is listed under added only, even if it was also modified this week.
 * The CSV is bundled at deploy time; "today" is worked out on each request.
 */
export const GET: APIRoute = () => {
	const to = buildDate();
	const from = daysBefore(to, WEEK_DAYS - 1);
	const inWeek = (date?: string) => !!date && date >= from && date <= to;

	// Reversed so that, on the same date, a row lower in the file (added later) comes first.
	const items = parsePracticeRows(csvText).map(toListItem).reverse();
	const added = items.filter((p) => inWeek(p.dateAdded)).sort(newestFirst('dateAdded'));
	const modified = items
		.filter((p) => !inWeek(p.dateAdded) && inWeek(p.dateModified))
		.sort(newestFirst('dateModified'));

	return json({
		from,
		to,
		timezone: SITE_TIMEZONE,
		counts: { added: added.length, modified: modified.length },
		added,
		modified,
	});
};
