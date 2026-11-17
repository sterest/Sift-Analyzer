/**
 * Facts the privacy policy needs that only the operator can supply.
 * Replace every value in [brackets] before launch. Until then the policy page shows a draft notice.
 */
export const LEGAL = {
  /** Who runs Sift and is responsible for the data: a person's name or a registered company. */
  operator: "[Operator name]",
  /** Postal or registered address of the operator. */
  address: "[Operator address]",
  /** Address people write to about their data. */
  contactEmail: "[privacy@example.com]",
  /** Country whose law governs the operator, e.g. "Nigeria" or "the United Kingdom". */
  country: "[Country]",
  /** The data protection authority people can complain to, e.g. "the Nigeria Data Protection Commission". */
  regulator: "[Data protection authority]",
  /** The region chosen when the Supabase project was created, e.g. "West EU (Ireland)". */
  dataRegion: "[Supabase project region]",
  /** Date this version of the policy takes effect. */
  effectiveDate: "[Effective date]",
};

export const legalIsDraft = Object.values(LEGAL).some((v) => v.startsWith("["));
