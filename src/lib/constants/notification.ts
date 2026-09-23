export const NotificationTemplates = {
  FRIEND: {
    FRIEND_REQUEST: {
      title: 'Friend Request Received',
      body: (username: string) => `@${username} sent you a friend request.`,
    },
    FRIEND_ACCEPTED: {
      title: 'Friend Request Accepted',
      body: (username: string) =>
        `@${username} accepted your friend request. You're now connected!`,
    },
  },

  FOLLOW: {
    NEW_FOLLOWER: {
      title: 'You’ve Got a New Follower!',
      body: (username: string) => `@${username} is now following you. Say hello! 👋`,
    },
    FOLLOW_REQUEST: {
      title: 'Follow Request Received',
      body: (username: string) => `@${username} wants to follow you. Approve or ignore.`,
    },
  },

  LIKE: {
    SINGLE_LIKE: {
      title: 'Your Post Was Liked 🎉',
      body: (username: string) => `@${username} liked your post. Nice one!`,
    },
    MULTIPLE_LIKES: {
      title: 'Your Post Is Blowing Up!',
      body: (count: number, username: string) =>
        `${count} people liked your post — including @${username}. 🔥`,
    },
  },

  COMMENT: {
    NEW_COMMENT: {
      title: 'New Comment Added 💬',
      body: (username: string, text: string) => `@${username} commented: “${text}” — check it out!`,
    },
    MENTION_IN_COMMENT: {
      title: 'You Were Mentioned',
      body: (username: string) => `@${username} mentioned you in a comment. Jump in!`,
    },
  },

  TAG: {
    POST_TAG: {
      title: 'You Were Tagged 📸',
      body: (username: string) => `@${username} tagged you in a photo. View it now!`,
    },
    MENTION_IN_POST: {
      title: 'Mentioned in a Post',
      body: (username: string) => `@${username} gave you a shoutout in their post.`,
    },
  },

  MESSAGE: {
    NEW_MESSAGE: {
      title: 'New Message 💌',
      body: (username: string) => `@${username} just messaged you. Open to reply.`,
    },
    MESSAGE_REQUEST: {
      title: 'Message Request Waiting',
      body: (username: string) => `@${username} wants to chat. Accept or decline.`,
    },
  },

  STORY: {
    STORY_MENTION: {
      title: 'You’re in a Story! 📷',
      body: (username: string) => `@${username} mentioned you in their story.`,
    },
    STORY_REPLY: {
      title: 'Story Reply Received',
      body: (username: string) => `@${username} replied to your story.`,
    },
  },

  SYSTEM: {
    FOLLOWER_MILESTONE: {
      title: '🎉 Milestone Unlocked!',
      body: (count: number) => `You reached ${count} followers. Keep the momentum going!`,
    },
    NEW_FEATURE: {
      title: '🚀 New Feature Just Dropped',
      body: () => 'Try out the all-new post reactions now!',
    },
  },

  EVENT: {
    INTEREST_MARKED: {
      title: 'New Event Interest 🎉',
      body: (username: string, interestType: string) =>
        `@${username} marked themselves as "${interestType}" for your event.`,
    },
    EVENT_UPDATED: {
      title: 'Your Event Was Updated',
      body: (eventName: string) =>
        `The event "${eventName}" has been updated. Check the new details.`,
    },
    EVENT_REMINDER: {
      title: 'Event Reminder ⏰',
      body: (eventName: string, time: string) =>
        `Reminder: "${eventName}" starts in ${time}. Don’t miss it!`,
    },
  },

  REPORT: {
    CONTENT_REPORTED: {
      title: 'Your Post Was Reported 🚨',
      body: (username: string, reason: string) =>
        `@${username} reported your post for: "${reason}".`,
    },
  },
};
