import type { INodePropertyOptions } from 'n8n-workflow';

export const mcpLocationNames = {
	NA: 'North America',
	EU: 'Europe',
	APAC: 'Asia Pacific',
	LATAM: 'Latin America',
	MEA: 'Middle East and Africa',
	US: 'United States',
	GB: 'United Kingdom',
	CA: 'Canada',
	AU: 'Australia',
	DE: 'Germany',
	FR: 'France',
	JP: 'Japan',
	CN: 'China',
	IN: 'India',
	BR: 'Brazil',
	MX: 'Mexico',
	ES: 'Spain',
	IT: 'Italy',
	NL: 'Netherlands',
	SE: 'Sweden',
	NO: 'Norway',
	DK: 'Denmark',
	FI: 'Finland',
	PL: 'Poland',
	RU: 'Russia',
	KR: 'South Korea',
	SG: 'Singapore',
	HK: 'Hong Kong',
	TW: 'Taiwan',
	TH: 'Thailand',
	VN: 'Vietnam',
	ID: 'Indonesia',
	MY: 'Malaysia',
	PH: 'Philippines',
	ZA: 'South Africa',
	AE: 'United Arab Emirates',
	SA: 'Saudi Arabia',
	IL: 'Israel',
	TR: 'Turkey',
	AR: 'Argentina',
	CL: 'Chile',
	CO: 'Colombia',
	NZ: 'New Zealand',
	IE: 'Ireland',
	CH: 'Switzerland',
	AT: 'Austria',
	BE: 'Belgium',
	PT: 'Portugal',
	CZ: 'Czechia',
	RO: 'Romania',
	HU: 'Hungary',
	GR: 'Greece',
	UA: 'Ukraine',
	EG: 'Egypt',
	RS: 'Serbia',
	AM: 'Armenia',
	AL: 'Albania',
	BG: 'Bulgaria',
	CY: 'Cyprus',
	DZ: 'Algeria',
	IQ: 'Iraq',
	KE: 'Kenya',
	NG: 'Nigeria',
	PA: 'Panama',
	SK: 'Slovakia',
	TT: 'Trinidad and Tobago',
	LK: 'Sri Lanka',
	AG: 'Antigua and Barbuda',
} as const;

export type McpLocationCode = keyof typeof mcpLocationNames;

export const mcpLocationCodes = Object.keys(mcpLocationNames) as McpLocationCode[];

export const mcpLocationOptions: INodePropertyOptions[] = mcpLocationCodes.map((code) => ({
	name: `${mcpLocationNames[code]} (${code})`,
	value: code,
}));

export const mcpRegionCodes = ['NA', 'EU', 'APAC', 'LATAM', 'MEA'] as const;

export type McpRegionCode = (typeof mcpRegionCodes)[number];

export const mcpRegionOptions: INodePropertyOptions[] = mcpRegionCodes.map((code) => ({
	name: `${mcpLocationNames[code]} (${code})`,
	value: code,
}));
