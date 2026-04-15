import type { IDataObject } from 'n8n-workflow';

function isPlainObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasValue(value: unknown): boolean {
	if (value === undefined || value === null || value === '') {
		return false;
	}

	if (Array.isArray(value)) {
		return value.length > 0;
	}

	if (isPlainObject(value)) {
		return Object.keys(value).length > 0;
	}

	return true;
}

export function cleanMcpArguments(args: IDataObject): IDataObject {
	const cleaned: IDataObject = {};

	for (const [key, value] of Object.entries(args)) {
		const nextValue = isPlainObject(value) ? cleanMcpArguments(value) : value;

		if (hasValue(nextValue)) {
			cleaned[key] = nextValue;
		}
	}

	return cleaned;
}
