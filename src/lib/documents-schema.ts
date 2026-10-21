import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'astro/zod';

export const SECTIONS = ['practice-info', 'ai-projects', 'power-bi'] as const;
export const SUBSECTIONS = ['soundhound', 'sierra', 'iva-studio'] as const;
export const FILE_TYPES = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'pptx'] as const;

export type Section = (typeof SECTIONS)[number];
export type Subsection = (typeof SUBSECTIONS)[number];

export const FILES_DIR = join(process.cwd(), 'public', 'files');

/** "Call Volume" → "call-volume" */
export function normalizeTag(tag: string): string {
	return tag
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * True only if every segment of `rel` exists with exactly this capitalisation.
 * Windows ignores case but Netlify (Linux) doesn't, so "Report.PDF" vs "report.pdf"
 * would work locally and 404 once deployed.
 */
function existsExactCase(rel: string): boolean {
	let dir = FILES_DIR;
	for (const part of rel.split('/')) {
		if (!existsSync(dir) || !readdirSync(dir).includes(part)) return false;
		dir = join(dir, part);
	}
	return true;
}

const optional = <T extends z.ZodType>(schema: T) => schema.nullish().transform((v) => v ?? undefined);

const isoDate = z.preprocess(
	(v) => (v instanceof Date && !Number.isNaN(v.valueOf()) ? v.toISOString().slice(0, 10) : v),
	z
		.string({ error: 'dateAdded is required (format YYYY-MM-DD, e.g. 2026-10-20)' })
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'dateAdded must be YYYY-MM-DD, e.g. 2026-10-20')
		.refine((s) => {
			const d = new Date(`${s}T00:00:00Z`);
			return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
		}, 'dateAdded is not a real calendar date')
		.transform((s) => new Date(`${s}T00:00:00Z`)),
);

const requiredText = (field: string) =>
	z.string({ error: `${field} is required` }).trim().min(1, `${field} is required and can't be empty`);

// NOTE: Videos are out of scope. When added, they'll be hosted on an external platform
// and embedded (probably a new `video:` field holding the embed URL) — never stored in this repo.
export const documentSchema = z
	.strictObject(
		{
			id: z.string(),
			title: requiredText('title'),
			description: requiredText('description').max(200, 'description must be 200 characters or fewer'),
			section: z.enum(SECTIONS, { error: `section must be one of: ${SECTIONS.join(', ')}` }),
			subsection: optional(z.enum(SUBSECTIONS, { error: `subsection must be one of: ${SUBSECTIONS.join(', ')}` })),
			file: optional(z.string().trim().min(1)),
			url: optional(z.url({ protocol: /^https$/, error: 'url must be a full https:// link' })),
			dateAdded: isoDate,
			owner: optional(z.string().trim()).transform((v) => v || 'Pete'),
			tags: optional(z.array(z.string(), { error: 'tags must be a list, e.g. [reporting, call-volume]' })).transform(
				(tags) => [...new Set((tags ?? []).map(normalizeTag).filter(Boolean))],
			),
		},
		{ error: (iss) => (iss.code === 'unrecognized_keys' ? `Unknown field(s): ${iss.keys.join(', ')} — check spelling` : undefined) },
	)
	.superRefine((d, ctx) => {
		const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });

		if (d.section === 'ai-projects' && !d.subsection) {
			issue('subsection', `ai-projects entries need a subsection: ${SUBSECTIONS.join(', ')}`);
		}
		if (d.section !== 'ai-projects' && d.subsection) {
			issue('subsection', `remove subsection — it's only used for ai-projects (this entry is ${d.section})`);
		}

		if (d.file && d.url) issue('file', 'set either file OR url, not both');
		if (!d.file && !d.url) issue('file', 'set either file (path under public/files/) or url (https:// link)');
		if (!d.file) return;

		const file = d.file;
		if (file.includes('\\')) return issue('file', 'use forward slashes in file paths, e.g. power-bi/report.pdf');
		if (file.startsWith('/') || file.startsWith('public/') || file.startsWith('files/')) {
			return issue('file', `file is relative to public/files/ — write it like "${d.section}/name.pdf"`);
		}
		if (file.split('/').includes('..')) return issue('file', 'file path cannot contain ".."');

		const ext = file.split('.').pop()?.toLowerCase() ?? '';
		if (!(FILE_TYPES as readonly string[]).includes(ext)) {
			issue('file', `unsupported file type ".${ext}". Supported: ${FILE_TYPES.join(', ')}`);
		}

		const folder = d.section === 'ai-projects' && d.subsection ? `ai-projects/${d.subsection}/` : `${d.section}/`;
		if (d.section !== 'ai-projects' || d.subsection) {
			if (!file.startsWith(folder)) issue('file', `file must be in the ${folder} folder to match its section`);
		}

		if (!existsExactCase(file)) {
			issue(
				'file',
				`public/files/${file} was not found. Check the folder, spelling, and capitalisation (Netlify is case-sensitive).`,
			);
		}
	});

export type DocumentData = z.infer<typeof documentSchema>;
