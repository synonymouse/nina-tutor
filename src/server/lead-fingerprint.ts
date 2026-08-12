import { createHmac } from 'node:crypto';
import { getServerConfig } from './config';

export interface LeadFingerprintInput {
  name: string;
  preferredContact: string;
  situation: string;
  consentVersion: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent: string;
  utmTerm: string;
}

export function createLeadFingerprint(input: LeadFingerprintInput): string {
  const canonicalPayload = JSON.stringify({
    name: input.name,
    preferredContact: input.preferredContact,
    situation: input.situation,
    consentVersion: input.consentVersion,
    utmSource: input.utmSource,
    utmMedium: input.utmMedium,
    utmCampaign: input.utmCampaign,
    utmContent: input.utmContent,
    utmTerm: input.utmTerm,
  });

  return createHmac('sha256', getServerConfig().RATE_LIMIT_SECRET)
    .update(canonicalPayload)
    .digest('hex');
}
