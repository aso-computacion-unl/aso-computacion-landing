import type { RegistrationPayload } from './fields';
import { classifyResponse, type Outcome } from './outcome';

export const SUBMIT_TIMEOUT_MS = 15_000;

// Posts one registration to the admin and says how it went. It never throws: a request that fails or times out is the
// `network` outcome, and an answer that is not JSON is classified by its status alone.
export async function submitRegistration(
	endpoint: string,
	payload: RegistrationPayload,
	doFetch: typeof fetch = fetch,
	timeoutMs = SUBMIT_TIMEOUT_MS,
): Promise<Outcome> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await doFetch(endpoint, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload),
			// No cookies cross to the admin: the endpoint is public and its CORS grants no credentials.
			credentials: 'omit',
			signal: controller.signal,
		});
		const body: unknown = await response.json().catch(() => null);
		return classifyResponse(response.status, body);
	} catch {
		return { code: 'network' };
	} finally {
		clearTimeout(timer);
	}
}
