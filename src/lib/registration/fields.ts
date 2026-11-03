// The open form's fields and the admin's limits for them (`POST /api/public/events/<slug>/registrations`). The admin
// validates again and has the last word; this only saves a round trip and names the field that needs attention.
export const formFields = ['name', 'email', 'career', 'semester'] as const;
export type FormField = (typeof formFields)[number];

export type FormValues = Record<FormField, string>;

export const LIMITS = { name: 120, email: 254, career: 120, semesterMin: 1, semesterMax: 12 } as const;

// Control characters are refused by the admin in every text field.
const CONTROL = /\p{Cc}/u;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value: string, max: number): boolean => {
	const trimmed = value.trim();
	return trimmed.length > 0 && trimmed.length <= max && !CONTROL.test(trimmed);
};

const valid: Record<FormField, (value: string) => boolean> = {
	name: (value) => text(value, LIMITS.name),
	email: (value) => text(value, LIMITS.email) && EMAIL.test(value.trim()),
	career: (value) => text(value, LIMITS.career),
	semester: (value) => {
		const trimmed = value.trim();
		return /^\d{1,2}$/.test(trimmed) && Number(trimmed) >= LIMITS.semesterMin && Number(trimmed) <= LIMITS.semesterMax;
	},
};

export function firstInvalidField(values: FormValues): FormField | null {
	return formFields.find((field) => !valid[field](values[field])) ?? null;
}

export interface RegistrationPayload {
	name: string;
	email: string;
	career: string;
	semester: number;
	turnstileToken: string;
}

export function buildPayload(values: FormValues, turnstileToken: string): RegistrationPayload {
	return {
		name: values.name.trim(),
		email: values.email.trim(),
		career: values.career.trim(),
		semester: Number(values.semester.trim()),
		turnstileToken,
	};
}
