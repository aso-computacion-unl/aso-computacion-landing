import { describe, expect, it } from 'vitest';
import { contactEmail } from './site';

describe('contactEmail', () => {
	it('is the association address, the one value the footer and the structured data share', () => {
		expect(contactEmail).toBe('aso.computacion@gmail.com');
	});
});
