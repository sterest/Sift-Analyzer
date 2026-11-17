/**
 * Facts the privacy policy needs that only the operator can supply.
 * Replace every value in [brackets] before launch. Until then the policy page shows a draft notice.
 */
export const LEGAL = {
  /** Who runs Sift and is responsible for the data: a person's name or a registered company. */
  operator: "Stephanie Osakwe",
  /** Postal or registered address of the operator. */
  address: "Army engineers Jos Plateau State",
  /** Address people write to about their data. */
  contactEmail: "osakwestephanie5@gmail.com",
  /** Country whose law governs the operator, e.g. "Nigeria" or "the United Kingdom". */
  country: "Nigeria",
  /** The data protection authority people can complain to, e.g. "the Nigeria Data Protection Commission". */
  regulator: "the Nigeria Data Protection Commission",
  /** The region chosen when the Supabase project was created, e.g. "West EU (Ireland)". */
  dataRegion: "[Supabase project region]",
  /** Date this version of the policy takes effect. */
  effectiveDate: "17/11/2026",
};

export const legalIsDraft = Object.values(LEGAL).some((v) => v.startsWith("["));
