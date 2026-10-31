import type { APIRoute } from 'astro';
import { readEntriesCsv } from '../../lib/practice-store';
import { buildDate } from '../../lib/site';

export const prerender = false;

/**
 * GET /api/export → downloads every form submission as entries-YYYY-MM-DD.csv (today in SITE_TIMEZONE).
 * Same rows as /api/entries.csv, but starts with a UTF-8 byte order mark so Excel shows characters
 * like the en dash in "8:00 AM – 5:00 PM" correctly. practices.csv's parser skips the mark.
 */
export const GET: APIRoute = async () =>
	new Response('﻿' + (await readEntriesCsv()), {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="entries-${buildDate()}.csv"`,
			'Cache-Control': 'no-store',
		},
	});
