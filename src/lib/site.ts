export const SITE_NAME = 'Cloud Telephony';

/** Time zone used for the footer's "Last updated" date. */
export const SITE_TIMEZONE = 'America/New_York';

export const NAV_LINKS = [
	{ href: '/', label: 'Home' },
	{ href: '/business-leaders/', label: 'Business Leaders' },
	{ href: '/internal-engineers/', label: 'Internal Engineers' },
] as const;

/** Build date as YYYY-MM-DD in SITE_TIMEZONE. */
export function buildDate(): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: SITE_TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(new Date());
}
