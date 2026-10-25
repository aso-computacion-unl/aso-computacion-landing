// The production content gate: decides, from the build environment and how the content was resolved, whether a build
// may ship. Pure (no I/O, no process.env), so it is unit-tested; src/data/content.ts runs it once per build.
export const DEFAULT_PRODUCTION_BRANCH = 'main';

export interface GateEnv {
	CF_PAGES_BRANCH?: string;
	PRODUCTION_BRANCH?: string;
	ALLOW_CONTENT_FALLBACK?: string;
}

export interface GateInput {
	env: GateEnv;
	// ADMIN_CONTENT_URL as configured. Only its host is ever printed.
	url: string | undefined;
	source: 'api' | 'fallback';
	// Why the build fell back (from the loader); only meaningful when source is 'fallback'.
	reason?: string;
	// Demo surfaces that would be rendered, from detectDemoContent.
	demo: string[];
	// The landing's own join copy is still marked `demo` (it never comes from the admin).
	joinDemo?: boolean;
	// Make joinDemo fail production builds too. Off until the board approves the join copy.
	strictJoin?: boolean;
}

export type GateResult = { status: 'ok' } | { status: 'warn'; message: string } | { status: 'fail'; message: string };

const isProduction = (env: GateEnv) => {
	const branch = env.CF_PAGES_BRANCH?.trim();
	return !!branch && branch === (env.PRODUCTION_BRANCH?.trim() || DEFAULT_PRODUCTION_BRANCH);
};

const emergencyOverride = (env: GateEnv) =>
	['1', 'true'].includes(env.ALLOW_CONTENT_FALLBACK?.trim().toLowerCase() ?? '');

const hostOf = (value: string) => {
	try {
		return new URL(value).host;
	} catch {
		return undefined;
	}
};

// Never echo a URL: it can carry a token in the path or the query. Keep the host only.
const redactUrls = (text: string) => text.replace(/https?:\/\/[^\s"'<>)]+/gi, (match) => hostOf(match) ?? '[url]');

// The admin host to name in a message, or nothing when no URL is configured (the reason already says so).
const describeAdmin = (url: string | undefined) => {
	if (!url?.trim()) return undefined;
	return `admin host ${hostOf(url.trim()) ?? '(ADMIN_CONTENT_URL is not a valid URL)'}`;
};

const JOIN_NOTE =
	'the join section copy (src/data/site.ts `join`) is still marked demo pending board approval and renders a "demo" tag';

export function evaluateContentGate(input: GateInput): GateResult {
	const { env, source, demo, joinDemo = false, strictJoin = false } = input;
	const production = isProduction(env);
	const reason = redactUrls(input.reason ?? 'unknown reason');
	const admin = describeAdmin(input.url);

	const problems: string[] = [];
	if (source === 'fallback')
		problems.push(`content fell back to src/data/fallback.json (${[reason, admin].filter(Boolean).join('; ')})`);
	if (demo.length > 0) problems.push(`demo content (${demo.join(', ')}) would be rendered`);
	const joinProblem = joinDemo ? JOIN_NOTE : undefined;

	if (production && strictJoin && joinProblem) problems.push(joinProblem);

	if (problems.length === 0) {
		if (!joinProblem) return { status: 'ok' };
		return { status: 'warn', message: `[content-gate] Note: ${joinProblem}.` };
	}

	if (production && !emergencyOverride(env)) {
		return {
			status: 'fail',
			message:
				`[content-gate] Production build aborted: ${problems.join('; ')}. ` +
				'The previous deployment stays live. Fix the admin or ADMIN_CONTENT_URL and redeploy, ' +
				'or set ALLOW_CONTENT_FALLBACK=1 for an emergency deploy.',
		};
	}

	const lines = [
		'[content-gate] WARNING: this build does not use real admin content.',
		...problems.map((p) => `  - ${p}`),
	];
	if (joinProblem && !problems.includes(joinProblem)) lines.push(`  - ${joinProblem}`);
	if (production) lines.push('  - ALLOW_CONTENT_FALLBACK=1 is set: a production build is shipping this on purpose.');
	else lines.push('  - Not a production build, so it continues. Production would fail here.');
	return { status: 'warn', message: lines.join('\n') };
}

// The surfaces of the composed content (one entry per locale) that are demo placeholders.
export function detectDemoContent(
	contents: {
		timeline: { demo?: boolean }[];
		pillars: { demo?: boolean }[];
		faq: { demo: boolean };
		team: { fun?: unknown }[];
	}[],
): string[] {
	const found: string[] = [];
	const flag = (name: string, present: boolean) => present && !found.includes(name) && found.push(name);
	for (const content of contents) {
		flag(
			'events',
			content.timeline.some((entry) => entry.demo),
		);
		flag(
			'pillars',
			content.pillars.some((pillar) => pillar.demo),
		);
		flag('faq', content.faq.demo);
		flag(
			'board',
			content.team.some((member) => member.fun),
		);
	}
	return found;
}
