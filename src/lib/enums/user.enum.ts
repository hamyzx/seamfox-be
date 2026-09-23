export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  NOT_VERIFIED = 'NOT_VERIFIED',
  INACTIVE = 'INACTIVE',
  REJECT = 'REJECT',
  BAN = 'BAN',
  DELETED = 'DELETED',
}

export enum UserRoles {
  SUPER_ADMIN = 'SUPER_ADMIN',
  COMPANY = 'COMPANY',
  MODERATOR = 'MODERATOR',
  CANDIDATE = 'CANDIDATE',
}

export enum SocialTypes {
  APPLE = 'APPLE',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  MICROSOFT = 'MICROSOFT',
  X = 'X',
  LINKEDIN = 'LINKEDIN',
}

export enum SocialMedias {
  LINKEDIN = 'LINKEDIN',
  FACEBOOK = 'FACEBOOK',
  TWITTER = 'TWITTER',
  X = 'X',
}
