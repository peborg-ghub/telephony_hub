// Pre-build check for public/files/ (runs before every `npm run build`).
//  - FAILS if any file is over 25 MB (GitHub hard-blocks files over 100 MB; we keep well under).
//  - WARNS about files that no entry in src/data/documents.yaml points to (orphans).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse } from 'yaml';

const MAX_BYTES = 25 * 1024 * 1024;
const FILES_DIR = join(import.meta.dirname, '..', 'public', 'files');
const DOCS_YAML = join(import.meta.dirname, '..', 'src', 'data', 'documents.yaml');
const IGNORED = new Set(['.gitkeep', '.DS_Store', 'Thumbs.db', 'desktop.ini']);

function walk(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
		const full = join(dir, d.name);
		if (d.isDirectory()) return walk(full);
		return IGNORED.has(d.name) ? [] : [full];
	});
}

const files = walk(FILES_DIR).map((full) => ({
	full,
	rel: relative(FILES_DIR, full).split(sep).join('/'),
	bytes: statSync(full).size,
}));

const tooBig = files.filter((f) => f.bytes > MAX_BYTES);
if (tooBig.length) {
	console.error('\n✖ File size check failed. These files are over the 25 MB limit:\n');
	for (const f of tooBig) {
		console.error(`  public/files/${f.rel}  (${(f.bytes / 1024 / 1024).toFixed(1)} MB)`);
	}
	console.error('\n  Fix: compress the file, split it, or host it elsewhere and add it as a link (url:) instead.\n');
	process.exit(1);
}

let referenced = new Set<string>();
try {
	const entries = parse(readFileSync(DOCS_YAML, 'utf8'));
	if (Array.isArray(entries)) {
		referenced = new Set(entries.map((e) => (e && typeof e.file === 'string' ? e.file.trim() : '')).filter(Boolean));
	}
} catch {
	// documents.yaml errors are reported by the build itself, with better messages.
}

const orphans = files.filter((f) => !referenced.has(f.rel));
for (const f of orphans) {
	console.warn(`⚠ public/files/${f.rel} is not listed in src/data/documents.yaml, so it won't appear on the site.`);
}

console.log(`✔ File check passed: ${files.length} file(s) in public/files/, none over 25 MB.`);
