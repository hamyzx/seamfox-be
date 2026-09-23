export enum PostVisibility {
  PUBLIC = 'Public',
  FOLLOWERS = 'Followers',
  ONLY_ME = 'Only Me',
}

export enum PostStatus {
  DRAFT = 'DRAFT', // Created but not yet published
  PUBLISHED = 'PUBLISHED', // Visible to users
  SCHEDULED = 'SCHEDULED', // Set to auto-publish later
  ARCHIVED = 'ARCHIVED', // Hidden but retained for reference
  DELETED = 'DELETED', // Soft-deleted or pending removal
  UNDER_REVIEW = 'UNDER_REVIEW', // Awaiting moderation or approval
  REJECTED = 'REJECTED',
}
