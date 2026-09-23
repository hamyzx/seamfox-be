// Fields that should preserve their original case (enums, codes, IDs, user content)
const PRESERVE_CASE_FIELDS = new Set<string>([
  // Enum values
  'gender',
  'status',
  'alternativeNumberType',
  'role',
  'platform',
  // IDs and references
  'userId',
  'adminId',
  'companyId',
  'candidateId',
  'jobId',
  'industryId',
  // Codes
  'countryCode',
  'currency',
  // File paths / URLs
  'profileImage',
  'coverImage',
  'filePath',
  'fileKey',
  // User-typed content (preserve as-is)
  'firstName',
  'lastName',
  'description',
  'about',
  'address',
  'currentCompany',
  'phoneNumber',
  'alternativeNumber',
  'noticePeriod',
  'comment',
]);

export function toLowerCaseFields<T extends object>(dto: T): T {
  const copy = { ...dto };

  Object.keys(copy).forEach((key) => {
    const value = copy[key];
    // Only lowercase string values for fields NOT in the preserve list
    if (typeof value === 'string' && !PRESERVE_CASE_FIELDS.has(key)) {
      copy[key] = value.toLowerCase();
    }
  });

  return copy;
}