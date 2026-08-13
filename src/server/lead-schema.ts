import { z } from 'zod';

const optionalUtm = z.string().trim().max(120).optional().default('');

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  preferredContact: z.string().trim().min(3).max(120),
  situation: z.string().trim().min(10).max(1000),
  consent: z.literal(true),
  consentVersion: z.literal('1.0'),
  website: z.string().max(0).optional().default(''),
  startedAt: z.coerce.number().int().positive().optional(),
  requestToken: z.uuid().optional(),
  utmSource: optionalUtm,
  utmMedium: optionalUtm,
  utmCampaign: optionalUtm,
  utmContent: optionalUtm,
  utmTerm: optionalUtm,
});

export type LeadInput = z.infer<typeof leadSchema>;

export interface LeadReplayValues {
  name: string;
  preferredContact: string;
  situation: string;
  consent: boolean;
  consentVersion: '1.0' | '';
}

export class UnsupportedMediaTypeError extends Error {
  constructor() {
    super('Unsupported request content type');
    this.name = 'UnsupportedMediaTypeError';
  }
}

const leadFields = [
  'name',
  'preferredContact',
  'situation',
  'consent',
  'consentVersion',
  'website',
  'startedAt',
  'requestToken',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm',
] as const;

type LeadField = (typeof leadFields)[number];
type LeadSource = Partial<Record<LeadField, unknown>>;

function sourceFromJson(value: unknown): LeadSource {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return {};

  const record = value as Record<string, unknown>;
  const source: LeadSource = {};

  for (const field of leadFields) {
    source[field] = Object.hasOwn(record, field) ? record[field] : undefined;
  }
  return source;
}

function sourceFromForm(form: FormData): LeadSource {
  const source: LeadSource = {};

  for (const field of leadFields) {
    const values = form.getAll(field);
    source[field] = values.length <= 1 ? values[0] : values;
  }

  return source;
}

function replayString(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.slice(0, maxLength) : '';
}

function replayValuesFromSource(source: LeadSource): LeadReplayValues {
  return {
    name: replayString(source.name, 80),
    preferredContact: replayString(source.preferredContact, 120),
    situation: replayString(source.situation, 1000),
    consent:
      source.consent === true || source.consent === 'on' || source.consent === 'true',
    consentVersion: source.consentVersion === '1.0' ? '1.0' : '',
  };
}

export function replayValuesFromParsed(input: LeadInput): LeadReplayValues {
  return {
    name: input.name,
    preferredContact: input.preferredContact,
    situation: input.situation,
    consent: input.consent,
    consentVersion: input.consentVersion,
  };
}

export async function parseLeadRequest(request: Request) {
  const contentType = (request.headers.get('content-type') ?? '')
    .split(';', 1)[0]
    ?.trim()
    .toLowerCase();

  let source: LeadSource;

  if (contentType === 'application/json') {
    source = sourceFromJson(await request.json());
  } else if (
    contentType === 'application/x-www-form-urlencoded' ||
    contentType === 'multipart/form-data'
  ) {
    source = sourceFromForm(await request.formData());
  } else {
    throw new UnsupportedMediaTypeError();
  }

  const validation = leadSchema.safeParse({
    name: source.name,
    preferredContact: source.preferredContact,
    situation: source.situation,
    consent:
      source.consent === true || source.consent === 'on' || source.consent === 'true',
    consentVersion: source.consentVersion,
    website: source.website,
    startedAt: source.startedAt === '' ? undefined : source.startedAt,
    requestToken: source.requestToken === '' ? undefined : source.requestToken,
    utmSource: source.utmSource,
    utmMedium: source.utmMedium,
    utmCampaign: source.utmCampaign,
    utmContent: source.utmContent,
    utmTerm: source.utmTerm,
  });

  return Object.assign(validation, { replay: replayValuesFromSource(source) });
}
