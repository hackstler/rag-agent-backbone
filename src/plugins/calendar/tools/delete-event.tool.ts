import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { CalendarApiService } from "../services/calendar-api.service.js";

export interface DeleteEventDeps {
  calendarService: CalendarApiService;
}

export function createDeleteEventTool({ calendarService }: DeleteEventDeps) {
  return createTool({
    id: "deleteCalendarEvent",
    description:
      "Delete an event from the user's Google Calendar. This action is irreversible.",

    inputSchema: z.object({
      userId: z.string().describe("User ID that owns the event (from system context)"),
      eventId: z.string().describe("ID of the calendar event to delete"),
    }),

    outputSchema: z.object({
      success: z.boolean(),
      deletedEventId: z.string(),
    }),

    execute: async ({ userId, eventId }) => {
      const result = await calendarService.deleteEvent(userId, eventId);
      return result;
    },
  });
}
