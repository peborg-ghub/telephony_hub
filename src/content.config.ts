import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { DOCUMENTS_FILE, readDocumentsFile } from './lib/documents-file';
import { documentSchema } from './lib/documents-schema';

const documents = defineCollection({
	// Problems with the file as a whole (bad YAML, duplicates) are NOT thrown here: Astro only logs
	// loader errors and keeps building. getDocuments() re-checks the file and fails the build instead.
	loader: file(DOCUMENTS_FILE, { parser: (text) => readDocumentsFile(text).entries }),
	schema: documentSchema,
});

export const collections = { documents };
