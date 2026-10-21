// Color checks, run by `npm run check`. Run it after changing src/styles/tokens.css.
//  1. Every text/background pair the site uses meets WCAG AA contrast, in light AND dark themes.
//  2. The two dark-theme blocks in tokens.css (OS setting / toggle) have identical values.
//  3. No color values are hard-coded anywhere in src/ except tokens.css.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const TOKENS = join(ROOT, 'src', 'styles', 'tokens.css');
const css = readFileSync(TOKENS, 'utf8');
const problems: string[] = [];

function block(selector: RegExp, label: string): Record<string, string> {
	const body = css.match(selector)?.[1];
	if (!body) {
		problems.push(`tokens.css: couldn't find the ${label} block`);
		return {};
	}
	return Object.fromEntries([...body.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const light = block(/:root\s*\{([^}]*)\}/, 'light theme (:root)');
const darkOs = block(/:root:not\(\[data-theme='light'\]\)\s*\{([^}]*)\}/, 'dark theme (prefers-color-scheme)');
const darkToggle = block(/:root\[data-theme='dark'\]\s*\{([^}]*)\}/, "dark theme (:root[data-theme='dark'])");

// 2. Dark blocks must match.
for (const key of new Set([...Object.keys(darkOs), ...Object.keys(darkToggle)])) {
	if (darkOs[key] !== darkToggle[key]) {
		problems.push(`tokens.css: --color-${key} differs between the two dark blocks (${darkOs[key]} vs ${darkToggle[key]}). Keep them identical.`);
	}
}

// 1. Contrast.
function luminance(hex: string): number {
	const full = hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex;
	const [r, g, b] = [1, 3, 5]
		.map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
		.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

// [text, background, minimum ratio]. 4.5 = normal text (AA); 3 = focus ring / UI (AA).
const PAIRS: [string, string, number][] = [
	['text', 'bg', 4.5], ['text', 'surface', 4.5], ['text', 'surface-raised', 4.5],
	['text-muted', 'bg', 4.5], ['text-muted', 'surface', 4.5], ['text-muted', 'surface-raised', 4.5],
	['accent', 'bg', 4.5], ['accent', 'surface', 4.5], ['accent', 'surface-raised', 4.5],
	['accent-hover', 'bg', 4.5], ['accent-hover', 'surface', 4.5],
	['on-accent', 'accent', 4.5], ['on-accent', 'accent-hover', 4.5],
	['on-accent-soft', 'accent-soft', 4.5], ['text-muted', 'accent-soft', 4.5],
	['badge-text', 'badge-bg', 4.5],
	['error', 'bg', 4.5], ['error', 'surface', 4.5],
];

const report: string[] = [];
for (const [name, theme] of [['light', light], ['dark', darkToggle]] as const) {
	let lowest = Infinity;
	for (const [fg, bg, min] of PAIRS) {
		const a = theme[fg];
		const b = theme[bg];
		if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(a ?? '') || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(b ?? '')) {
			problems.push(`tokens.css (${name}): --color-${fg} and --color-${bg} must be hex colors like #1d5fbf`);
			continue;
		}
		const r = ratio(a, b);
		lowest = Math.min(lowest, r);
		if (r < min) {
			problems.push(`contrast (${name}): --color-${fg} on --color-${bg} is ${r.toFixed(2)}:1, needs at least ${min}:1`);
		}
	}
	if (Number.isFinite(lowest)) report.push(`${name} lowest ${lowest.toFixed(2)}:1`);
}

// 3. No hard-coded colors outside tokens.css.
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b(?![\w-])|\b(rgba?|hsla?|oklch|lab|lch)\(/gi;
function walk(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
		const full = join(dir, d.name);
		if (d.isDirectory()) return walk(full);
		return /\.(astro|css|ts|js|mjs)$/.test(d.name) ? [full] : [];
	});
}
for (const file of walk(join(ROOT, 'src'))) {
	if (file === TOKENS) continue;
	readFileSync(file, 'utf8')
		.split('\n')
		.forEach((line, i) => {
			// Ignore URL fragments like href="#main" or `#${id}`.
			const cleaned = line.replace(/["'`]#[\w${}-]*["'`]/g, '').replace(/#\$\{/g, '');
			if (COLOR_LITERAL.test(cleaned)) {
				problems.push(`${relative(ROOT, file).split(sep).join('/')}:${i + 1} has a hard-coded color. Use a var(--color-…) token from tokens.css.`);
			}
			COLOR_LITERAL.lastIndex = 0;
		});
}

if (problems.length) {
	console.error(`\n✖ Color check failed:\n  - ${problems.join('\n  - ')}\n`);
	process.exit(1);
}
console.log(`✔ Color check passed: WCAG AA contrast in both themes (${report.join(', ')}); no hard-coded colors.`);
