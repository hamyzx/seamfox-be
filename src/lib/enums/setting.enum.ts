export enum SettingKeys {
  ENABLE_NOTIFICATIONS = 'ENABLE_NOTIFICATIONS',
  PLATFORM_CONFIGURATION = 'PLATFORM_CONFIGURATION',
  ABOUT_US = 'ABOUT_US',
  // Legacy shared keys — kept for backward compatibility and as the seed source
  // for the split company/member keys below. No longer read by the frontend.
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  TERMS_AND_CONDITIONS = 'TERMS_AND_CONDITIONS',
  // Split keys: company vs member have separate terms/privacy content.
  COMPANY_TERMS_AND_CONDITIONS = 'COMPANY_TERMS_AND_CONDITIONS',
  MEMBER_TERMS_AND_CONDITIONS = 'MEMBER_TERMS_AND_CONDITIONS',
  COMPANY_PRIVACY_POLICY = 'COMPANY_PRIVACY_POLICY',
  MEMBER_PRIVACY_POLICY = 'MEMBER_PRIVACY_POLICY',
}
