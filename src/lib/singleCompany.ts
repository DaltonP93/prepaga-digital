export const SINGLE_COMPANY_PRIMARY_NAME = "SAMAP Prepaga Digital";

const SINGLE_COMPANY_NAME_ALIASES = [
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
  SINGLE_COMPANY_NAME_ALIASES.some((allowedName) => normalizeName(allowedName) === normalizeName(companyName));

export const filterToSingleCompany = <T extends CompanyLike>(companies: T[]) => {
  const matchedCompanies = companies.filter((company) => isSingleCompanyMatch(company.name));
  if (matchedCompanies.length > 0) return matchedCompanies;

  const activeCompany = companies.find((company) => company.is_active !== false);
  return activeCompany ? [activeCompany] : companies.slice(0, 1);
};

export const getSingleCompany = <T extends CompanyLike>(companies: T[]) =>
  filterToSingleCompany(companies)[0] ?? null;
