export const NotificationType = {
  // WAVE:
  WAVE_RECEIVED: 'WAVE_RECEIVED',
  WAVE_ACCEPTED: 'WAVE_ACCEPTED',

  //  MESSAGE:
  NEW_MESSAGE: 'NEW_MESSAGE',

  // COMMUNITY POST:
  POST_LIKE: 'POST_LIKE',
  POST_COMMENT: 'POST_COMMENT',

  // GROUP POST:
  GROUP_POST_COMMENT: 'GROUP_POST_COMMENT',
  GROUP_POST_LIKE: 'GROUP_POST_LIKE',

  ADMIN_NOTICE: 'ADMIN_NOTICE',
} as const

export const notificationTypeValues = Object.values(NotificationType)
