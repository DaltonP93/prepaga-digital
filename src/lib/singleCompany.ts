export const SINGLE_COMPANY_PRIMARY_NAME = "SAMAP Prepaga Digital";

const SINGLE_COMPANY_NAME_PRIORITY = [
  SINGLE_COMPANY_PRIMARY_NAME,
  "Prepaga Digital",
  "SAMAP",
];

type CompanyLike = {
  id: string;
  name: string;
  is_active?: boolean | null;
};

const normalizeName = (value: string | null | undefined) =>
  (value || "").trim().toLowerCase();

export const isSingleCompanyMatch = (companyName: string | null | undefined) =>
  SINGLE_COMPANY_NAME_PRIORITY.some((allowedName) => normalizeName(allowedName) === normalizeName(companyName));

const resolvePreferredSingleCompany = <T extends CompanyLike>(companies: T[]) => {
  for (const preferredName of SINGLE_COMPANY_NAME_PRIORITY) {
    const matched = companies.find((company) => normalizeName(company.name) === normalizeName(preferredName));
    if (matched) return matched;
  }

  return companies.find((company) => company.is_active !== false) ?? companies[0] ?? null;
};

export const filterToSingleCompany = <T extends CompanyLike>(companies: T[]) => {
  const preferredCompany = resolvePreferredSingleCompany(companies);
  return preferredCompany ? [preferredCompany] : [];
};

export const getSingleCompany = <T extends CompanyLike>(companies: T[]) =>
  resolvePreferredSingleCompany(companies);
