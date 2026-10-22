import { createHash } from 'node:crypto';

// Decorative 7-character id derived from an entry slug. It is not a real git hash.
export const shortHash = (id: string) => createHash('sha1').update(id).digest('hex').slice(0, 7);
