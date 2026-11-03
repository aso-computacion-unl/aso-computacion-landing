import { describe, expect, it } from 'vitest';
import { detectDemoContent, evaluateContentGate, type GateInput } from './gate';

const URL_OK = 'https://admin.example.test/api/public/content';
const PROD = { CF_PAGES_BRANCH: 'main' };

const api = (overrides: Partial<GateInput> = {}): GateInput => ({
	env: PROD,
	url: URL_OK,
	source: 'api',
	demo: [],
	...overrides,
});
const fallback = (overrides: Partial<GateInput> = {}): GateInput =>
	api({ source: 'fallback', reason: 'the admin answered HTTP 503', ...overrides });

describe('evaluateContentGate', () => {
	it('is ok in production when the API answered and no demo content is rendered', () => {
		expect(evaluateContentGate(api())).toEqual({ status: 'ok' });
	});

	it('fails a production build that fell back to fallback.json, naming the reason and the API host', () => {
		const result = evaluateContentGate(fallback());
		expect(result.status).toBe('fail');
		if (result.status !== 'fail') return;
		expect(result.message).toContain('the admin answered HTTP 503');
		expect(result.message).toContain('admin.example.test');
		expect(result.message).toContain('previous deployment stays live');
		expect(result.message).toContain('ALLOW_CONTENT_FALLBACK=1');
		expect(result.message).not.toContain('\n');
	});

	it('fails a production build that would render demo content even if the API answered', () => {
		const result = evaluateContentGate(api({ demo: ['events', 'faq'] }));
		expect(result.status).toBe('fail');
		if (result.status !== 'fail') return;
		expect(result.message).toContain('demo content (events, faq)');
		expect(result.message).not.toContain('\n');
	});

	it('downgrades a production fallback to a loud warning with ALLOW_CONTENT_FALLBACK=1', () => {
		const result = evaluateContentGate(fallback({ env: { ...PROD, ALLOW_CONTENT_FALLBACK: '1' } }));
		expect(result.status).toBe('warn');
		if (result.status !== 'warn') return;
		expect(result.message).toContain('ALLOW_CONTENT_FALLBACK=1');
		expect(result.message).toContain('the admin answered HTTP 503');
	});

	it('only accepts ALLOW_CONTENT_FALLBACK=1 (or true), not arbitrary values', () => {
		expect(evaluateContentGate(fallback({ env: { ...PROD, ALLOW_CONTENT_FALLBACK: '0' } })).status).toBe('fail');
		expect(evaluateContentGate(fallback({ env: { ...PROD, ALLOW_CONTENT_FALLBACK: '' } })).status).toBe('fail');
		expect(evaluateContentGate(fallback({ env: { ...PROD, ALLOW_CONTENT_FALLBACK: 'true' } })).status).toBe('warn');
	});

	it('warns, never fails, on a Pages preview branch that fell back', () => {
		const result = evaluateContentGate(fallback({ env: { CF_PAGES_BRANCH: 'feat/seo-sharing' } }));
		expect(result.status).toBe('warn');
		if (result.status !== 'warn') return;
		expect(result.message).toContain('fallback');
		expect(result.message).toContain('the admin answered HTTP 503');
		expect(result.message.split('\n').length).toBeGreaterThan(1);
	});

	it('warns on local and GitHub CI builds (no Cloudflare env) that fell back', () => {
		const result = evaluateContentGate(fallback({ env: {}, url: undefined, reason: 'ADMIN_CONTENT_URL is not set' }));
		expect(result.status).toBe('warn');
		if (result.status !== 'warn') return;
		expect(result.message).toContain('ADMIN_CONTENT_URL is not set');
	});

	it('treats a blank CF_PAGES_BRANCH as not production', () => {
		expect(evaluateContentGate(fallback({ env: { CF_PAGES_BRANCH: '  ' } })).status).toBe('warn');
	});

	it('is ok outside production when the API answered and nothing is demo', () => {
		expect(evaluateContentGate(api({ env: {} }))).toEqual({ status: 'ok' });
	});

	it('respects a custom PRODUCTION_BRANCH', () => {
		const env = { CF_PAGES_BRANCH: 'release', PRODUCTION_BRANCH: 'release' };
		expect(evaluateContentGate(fallback({ env })).status).toBe('fail');
		// With the override, `main` is just another preview branch.
		expect(evaluateContentGate(fallback({ env: { ...env, CF_PAGES_BRANCH: 'main' } })).status).toBe('warn');
	});

	it('never prints secrets: only the host of the URL, and URLs inside the reason are reduced to their host', () => {
		const secretUrl = 'https://admin.example.test/api/public/content?token=s3cr3t-token-value';
		const result = evaluateContentGate(
			fallback({ url: secretUrl, reason: `request to ${secretUrl} failed`, env: PROD }),
		);
		expect(result.status).toBe('fail');
		if (result.status !== 'fail') return;
		expect(result.message).toContain('admin.example.test');
		expect(result.message).not.toContain('s3cr3t-token-value');
		expect(result.message).not.toContain('token=');
		expect(result.message).not.toContain('/api/public/content');
	});

	it('names an unset or invalid ADMIN_CONTENT_URL instead of a host', () => {
		const unset = evaluateContentGate(fallback({ url: undefined, reason: 'ADMIN_CONTENT_URL is not set' }));
		expect(unset.status === 'fail' && unset.message).toContain('ADMIN_CONTENT_URL is not set');
		const invalid = evaluateContentGate(fallback({ url: 'not a url?token=abc', reason: 'bad url' }));
		expect(invalid.status === 'fail' && invalid.message).not.toContain('token=abc');
	});

	it('warns about demo content on a non-production build, listing what is demo', () => {
		const result = evaluateContentGate(api({ env: {}, demo: ['pillars'] }));
		expect(result.status).toBe('warn');
		if (result.status !== 'warn') return;
		expect(result.message).toContain('pillars');
	});
});

describe('join copy marked demo', () => {
	it('adds a separate warning line but does not fail by default', () => {
		const result = evaluateContentGate(api({ joinDemo: true }));
		expect(result.status).toBe('warn');
		if (result.status !== 'warn') return;
		expect(result.message).toContain('join');
		expect(result.message).toContain('board approval');
	});

	it('fails a production build with strictJoin on', () => {
		const result = evaluateContentGate(api({ joinDemo: true, strictJoin: true }));
		expect(result.status).toBe('fail');
		if (result.status !== 'fail') return;
		expect(result.message).toContain('join');
	});

	it('strictJoin does not fail non-production builds', () => {
		expect(evaluateContentGate(api({ env: {}, joinDemo: true, strictJoin: true })).status).toBe('warn');
	});

	it('is ignored when join is not demo', () => {
		expect(evaluateContentGate(api({ joinDemo: false, strictJoin: true }))).toEqual({ status: 'ok' });
	});
});

describe('detectDemoContent', () => {
	const clean = { timeline: [{}], pillars: [{}], faq: { demo: false }, team: [{}] };

	it('finds nothing in real content', () => {
		expect(detectDemoContent([clean])).toEqual([]);
	});

	it('lists every demo surface once, across locales', () => {
		const dirty = {
			timeline: [{ demo: true }],
			pillars: [{ demo: true }],
			faq: { demo: true },
			team: [{ fun: { language: 'x', motto: 'y', demo: true } }],
		};
		expect(detectDemoContent([dirty, dirty])).toEqual(['events', 'pillars', 'faq', 'board']);
	});
});
