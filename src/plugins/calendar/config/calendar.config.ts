export const calendarConfig = {
  agentName: "CalendarAgent",
  maxResults: 20,
  defaultCalendarId: "primary",
  scopes: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ],
} as const;
