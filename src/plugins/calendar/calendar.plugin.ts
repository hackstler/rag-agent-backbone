import type { Plugin } from "../plugin.interface.js";
import type { ToolsInput } from "@mastra/core/agent";
import type { OAuthTokenProvider } from "../google-common/oauth-token-provider.js";
import { CalendarApiService } from "./services/calendar-api.service.js";
import { createListEventsTool } from "./tools/list-events.tool.js";
import { createCreateEventTool } from "./tools/create-event.tool.js";
import { createUpdateEventTool } from "./tools/update-event.tool.js";
import { createDeleteEventTool } from "./tools/delete-event.tool.js";
import { createCalendarAgent } from "./calendar.agent.js";

export class CalendarPlugin implements Plugin {
  readonly id = "calendar";
  readonly name = "Calendar Plugin";
  readonly description = "List, create, update, and delete events in Google Calendar.";
  readonly agent;
  readonly tools: ToolsInput;

  constructor(tokenProvider: OAuthTokenProvider) {
    const service = new CalendarApiService(tokenProvider);
    const listEvents = createListEventsTool({ calendarService: service });
    const createEvent = createCreateEventTool({ calendarService: service });
    const updateEvent = createUpdateEventTool({ calendarService: service });
    const deleteEvent = createDeleteEventTool({ calendarService: service });

    this.tools = {
      listCalendarEvents: listEvents,
      createCalendarEvent: createEvent,
      updateCalendarEvent: updateEvent,
      deleteCalendarEvent: deleteEvent,
    };
    this.agent = createCalendarAgent(this.tools);
  }
}
