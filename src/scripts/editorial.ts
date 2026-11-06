// Pure helpers of the editorial motion layer (the choreography itself lives in editorial-motion.ts).

// How far a card dealt in leans before it settles, in degrees: alternating sides, small enough to read as a card.
export const DEAL_TILTS = [-3, 2, -1.5];

export const dealTilt = (index: number) => DEAL_TILTS[index % DEAL_TILTS.length];

interface Box {
	left: number;
	top: number;
	width: number;
	height: number;
}

// A magnetic button follows the pointer by a fraction of its distance to the centre (more vertically than
// horizontally, since the button is wide), and never by more than a fraction of its own size.
const PULL = { x: 0.12, y: 0.2 };

const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

export function magnetOffset(box: Box, pointer: { x: number; y: number }) {
	const dx = pointer.x - (box.left + box.width / 2);
	const dy = pointer.y - (box.top + box.height / 2);
	return { x: clamp(dx * PULL.x, box.width * PULL.x), y: clamp(dy * PULL.y, box.height * PULL.y) };
}
