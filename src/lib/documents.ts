import { statSync } from 'node:fs';
import { join } from 'node:path';
import { getCollection } from 'astro:content';
import { assertDocumentsFile } from './documents-file';
import { FILES_DIR, type Section, type Subsection } from './documents-schema';

export type FileType = 'PDF' | 'DOCX' | 'DOC' | 'XLSX' | 'XLS' | 'CSV' | 'PPTX' | 'Link';

export interface Doc {
	id: string;
	title: string;
	description: string;
	section: Section;
	subsection?: Subsection;
	type: FileType;
	/** Human-readable size, e.g. "1.2 MB". Undefined for links. */
	size?: string;
	href: string;
	isLink: boolean;
	dateAdded: Date;
	owner: string;
	tags: string[];
}

export const SECTION_INFO: Record<Section, { label: string; page: string }> = {
	'practice-info': { label: 'Practice Information', page: '/business-leaders/' },
	'ai-projects': { label: 'AI Projects', page: '/internal-engineers/' },
	'power-bi': { label: 'Power BI', page: '/internal-engineers/' },
};

export const SUBSECTION_INFO: Record<Subsection, { label: string }> = {
	soundhound: { label: 'SoundHound' },
	sierra: { label: 'Sierra' },
	'iva-studio': { label: 'IVA Studio' },
};

/** Where a document lives on the site, e.g. "/internal-engineers/#sierra". */
export function locationOf(doc: Doc): { href: string; label: string } {
	const section = SECTION_INFO[doc.section];
	if (doc.subsection) {
		return { href: `${section.page}#${doc.subsection}`, label: `${section.label} · ${SUBSECTION_INFO[doc.subsection].label}` };
	}
	return { href: `${section.page}#${doc.section}`, label: section.label };
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB'];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatDate(date: Date): string {
	return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

/** All documents, newest first (ties broken by title A–Z). */
export async function getDocuments(): Promise<Doc[]> {
	assertDocumentsFile();
	const entries = await getCollection('documents');
	return entries
		.map(({ data }): Doc => {
			const base = {
				id: data.id,
				title: data.title,
				description: data.description,
				section: data.section,
				subsection: data.subsection,
				dateAdded: data.dateAdded,
				owner: data.owner,
				tags: data.tags,
			};
			if (data.url) return { ...base, type: 'Link', href: data.url, isLink: true };

			const file = data.file!;
			return {
				...base,
				type: file.split('.').pop()!.toUpperCase() as FileType,
				size: formatBytes(statSync(join(FILES_DIR, file)).size),
				href: encodeURI(`/files/${file}`),
				isLink: false,
			};
		})
		.sort((a, b) => b.dateAdded.valueOf() - a.dateAdded.valueOf() || a.title.localeCompare(b.title));
}

export async function getLibrary(section: Section, subsection?: Subsection): Promise<Doc[]> {
	return (await getDocuments()).filter((d) => d.section === section && d.subsection === subsection);
}
