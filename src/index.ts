// MCP Server Implementation for RideWithGPS
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RideWithGPSApi, RideWithGPSConfig, RideWithGPSApiError } from "./api.js";

// Constants
const SERVER_NAME = "ridewithgps-mcp";
const SERVER_VERSION = "0.0.1";

// Environment variables configuration
const config: RideWithGPSConfig = {
  apiKey: process.env.RWGPS_API_KEY || "",
  authToken: process.env.RWGPS_AUTH_TOKEN || "",
};

// Validate configuration
if (!config.apiKey || !config.authToken) {
  console.error("Error: RWGPS_API_KEY and RWGPS_AUTH_TOKEN environment variables are required");
  process.exit(1);
}

const api = new RideWithGPSApi(config);

// Create server instance
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

// Helper functions for formatting responses
function formatError(error: unknown): string {
  if (error instanceof RideWithGPSApiError) {
    return `RideWithGPS API Error (${error.status}): ${error.message}`;
  }
  return `Error: ${error instanceof Error ? error.message : String(error)}`;
}

function formatRoutesList(response: any): string {
  if (!response?.routes || response.routes.length === 0) {
    return "No routes found.";
  }

  const routes = response.routes;
  const meta = response.meta?.pagination;
  
  let output = `Found ${routes.length} route(s)`;
  if (meta) {
    output += ` (Page showing ${routes.length} of ${meta.record_count} total)`;
  }
  output += ":\n\n";

  routes.forEach((route: any, index: number) => {
    output += `${index + 1}. **${route.name || 'Unnamed Route'}** (ID: ${route.id})\n`;
    output += `   Distance: ${formatDistance(route.distance)}\n`;
    output += `   Location: ${route.locality || 'Unknown'}, ${route.administrative_area || 'Unknown'}\n`;
    output += `   Updated: ${formatDate(route.updated_at)}\n\n`;
  });

  if (meta?.next_page_url) {
    output += "Use the next page parameter to get more results.";
  }

  return output;
}

function formatRouteDetails(response: any): string {
  const route = response.route;
  if (!route) {
    return "Route not found.";
  }

  let output = `**${route.name || 'Unnamed Route'}**\n`;
  output += `ID: ${route.id}\n`;
  output += `Description: ${route.description || 'No description'}\n\n`;
  
  output += `**Route Details:**\n`;
  output += `Distance: ${formatDistance(route.distance)}\n`;
  output += `Elevation Gain: ${formatElevation(route.elevation_gain)}\n`;
  output += `Elevation Loss: ${formatElevation(route.elevation_loss)}\n`;
  output += `Track Type: ${route.track_type || 'Unknown'}\n`;
  output += `Terrain: ${route.terrain || 'Unknown'}\n`;
  output += `Difficulty: ${route.difficulty || 'Unknown'}\n`;
  output += `Surface: ${route.surface || 'Unknown'}\n`;
  if (route.unpaved_pct) {
    output += `Unpaved: ${route.unpaved_pct}%\n`;
  }
  
  output += `\n**Location:**\n`;
  output += `${route.locality || 'Unknown'}, ${route.administrative_area || 'Unknown'}, ${route.country_code || 'Unknown'}\n`;
  
  output += `\n**Timestamps:**\n`;
  output += `Created: ${formatDate(route.created_at)}\n`;
  output += `Updated: ${formatDate(route.updated_at)}\n`;
  
  if (route.track_points?.length) {
    output += `\n**Track Data:**\n`;
    output += `Track points: ${route.track_points.length}\n`;
  }
  
  if (route.course_points?.length) {
    output += `Course points: ${route.course_points.length}\n`;
  }
  
  if (route.points_of_interest?.length) {
    output += `Points of interest: ${route.points_of_interest.length}\n`;
  }

  return output;
}

function formatTripsList(response: any): string {
  if (!response?.trips || response.trips.length === 0) {
    return "No trips found.";
  }

  const trips = response.trips;
  const meta = response.meta?.pagination;
  
  let output = `Found ${trips.length} trip(s)`;
  if (meta) {
    output += ` (Page showing ${trips.length} of ${meta.record_count} total)`;
  }
  output += ":\n\n";

  trips.forEach((trip: any, index: number) => {
    output += `${index + 1}. **${trip.name || 'Unnamed Trip'}** (ID: ${trip.id})\n`;
    output += `   Distance: ${formatDistance(trip.distance)}\n`;
    output += `   Duration: ${formatDuration(trip.duration)}\n`;
    if (trip.activity_type) {
      output += `   Activity: ${trip.activity_type}\n`;
    }
    output += `   Date: ${formatDate(trip.departed_at)}\n\n`;
  });

  if (meta?.next_page_url) {
    output += "Use the next page parameter to get more results.";
  }

  return output;
}

function formatTripDetails(response: any): string {
  const trip = response.trip;
  if (!trip) {
    return "Trip not found.";
  }

  let output = `**${trip.name || 'Unnamed Trip'}**\n`;
  output += `ID: ${trip.id}\n`;
  if (trip.description) {
    output += `Description: ${trip.description}\n`;
  }
  output += `\n`;
  
  output += `**Trip Details:**\n`;
  output += `Activity Type: ${trip.activity_type || 'Unknown'}\n`;
  output += `Date: ${formatDate(trip.departed_at)}\n`;
  output += `Distance: ${formatDistance(trip.distance)}\n`;
  output += `Duration: ${formatDuration(trip.duration)}\n`;
  output += `Moving Time: ${formatDuration(trip.moving_time)}\n`;
  
  if (trip.avg_speed) {
    output += `Average Speed: ${trip.avg_speed.toFixed(1)} km/h\n`;
  }
  if (trip.max_speed) {
    output += `Max Speed: ${trip.max_speed.toFixed(1)} km/h\n`;
  }
  
  output += `\n**Elevation:**\n`;
  output += `Gain: ${formatElevation(trip.elevation_gain)}\n`;
  output += `Loss: ${formatElevation(trip.elevation_loss)}\n`;
  
  if (trip.avg_hr || trip.avg_watts || trip.avg_cad) {
    output += `\n**Performance:**\n`;
    if (trip.avg_hr) {
      output += `Avg Heart Rate: ${trip.avg_hr} bpm\n`;
    }
    if (trip.avg_watts) {
      output += `Avg Power: ${trip.avg_watts}W\n`;
    }
    if (trip.avg_cad) {
      output += `Avg Cadence: ${trip.avg_cad} rpm\n`;
    }
  }
  
  if (trip.calories) {
    output += `Calories: ${trip.calories}\n`;
  }
  
  output += `\n**Location:**\n`;
  output += `${trip.locality || 'Unknown'}, ${trip.administrative_area || 'Unknown'}, ${trip.country_code || 'Unknown'}\n`;
  
  if (trip.track_points?.length) {
    output += `\n**Track Data:**\n`;
    output += `Track points: ${trip.track_points.length}\n`;
  }

  return output;
}

function formatUserDetails(response: any): string {
  const user = response.user;
  if (!user) {
    return "User information not found.";
  }

  let output = `**User Profile**\n`;
  output += `Name: ${user.name || 'Not provided'}\n`;
  output += `Email: ${user.email || 'Not provided'}\n`;
  output += `User ID: ${user.id}\n`;
  output += `Member since: ${formatDate(user.created_at)}\n`;
  output += `Last updated: ${formatDate(user.updated_at)}\n`;

  return output;
}

function formatEventsList(response: any): string {
  if (!response?.events || response.events.length === 0) {
    return "No events found.";
  }

  const events = response.events;
  const meta = response.meta?.pagination;
  
  let output = `Found ${events.length} event(s)`;
  if (meta) {
    output += ` (Page showing ${events.length} of ${meta.record_count} total)`;
  }
  output += ":\n\n";

  events.forEach((event: any, index: number) => {
    output += `${index + 1}. **${event.name || 'Unnamed Event'}** (ID: ${event.id})\n`;
    output += `   Starts: ${formatDate(event.starts_at)}\n`;
    if (event.ends_at) {
      output += `   Ends: ${formatDate(event.ends_at)}\n`;
    }
    output += `   Created: ${formatDate(event.created_at)}\n\n`;
  });

  if (meta?.next_page_url) {
    output += "Use the next page parameter to get more results.";
  }

  return output;
}

function formatEventDetails(response: any): string {
  const event = response.event;
  if (!event) {
    return "Event not found.";
  }

  let output = `**${event.name || 'Unnamed Event'}**\n`;
  output += `ID: ${event.id}\n`;
  if (event.description) {
    output += `Description: ${event.description}\n`;
  }
  output += `\n`;
  
  output += `**Event Details:**\n`;
  output += `Starts: ${formatDate(event.starts_at)}\n`;
  if (event.ends_at) {
    output += `Ends: ${formatDate(event.ends_at)}\n`;
  }
  output += `Created: ${formatDate(event.created_at)}\n`;
  output += `Updated: ${formatDate(event.updated_at)}\n`;
  
  if (event.routes?.length) {
    output += `\n**Associated Routes (${event.routes.length}):**\n`;
    event.routes.forEach((route: any, index: number) => {
      output += `${index + 1}. ${route.name || 'Unnamed Route'} (ID: ${route.id})\n`;
      output += `   Distance: ${formatDistance(route.distance)}\n`;
      if (route.locality) {
        output += `   Location: ${route.locality}\n`;
      }
    });
  }

  return output;
}

function formatSyncResponse(response: any): string {
  if (!response?.items || response.items.length === 0) {
    return "No changes found since the specified date.";
  }

  const items = response.items;
  const meta = response.meta;
  
  let output = `Found ${items.length} change(s) since sync:\n\n`;

  items.forEach((item: any, index: number) => {
    output += `${index + 1}. **${item.action.toUpperCase()}** ${item.item_type} (ID: ${item.item_id})\n`;
    output += `   Date: ${formatDate(item.datetime)}\n`;
    output += `   Owner: User ${item.item_user_id}\n`;
    if (item.collection) {
      output += `   Collection: ${item.collection.name}\n`;
    }
    output += `\n`;
  });

  if (meta?.next_sync_url) {
    output += `\n**Next Sync:**\n`;
    output += `Use datetime: ${meta.rwgps_datetime}\n`;
    output += `Next sync URL available\n`;
  }

  return output;
}

// Utility formatting functions
function formatDistance(meters: number): string {
  if (!meters) return 'Unknown';
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

function formatElevation(meters: number): string {
  if (!meters) return 'Unknown';
  return `${meters.toFixed(0)} m`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return 'Unknown';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatDate(dateString: string): string {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

// Register MCP tools

// Routes
server.registerTool(
  "get_routes",
  {
    title: "Get User Routes",
    description: "Retrieve a paginated list of routes owned by the authenticated user, ordered by updated_at descending",
    inputSchema: {
      page: z.number().min(1).optional().describe("Page number for pagination (starts at 1, optional)")
    }
  },
  async ({ page }) => {
    try {
      const response = await api.getRoutes(page);
      return {
        content: [{
          type: "text",
          text: formatRoutesList(response)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "get_route_details",
  {
    title: "Get Route Details",
    description: "Retrieve full details for a specific route including track points, course points, and points of interest",
    inputSchema: {
      id: z.number().min(1).describe("The unique ID of the route to retrieve")
    }
  },
  async ({ id }) => {
    try {
      const response = await api.getRoute(id);
      return {
        content: [{
          type: "text",
          text: formatRouteDetails(response)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true
      };
    }
  }
);

// Trips
server.registerTool(
  "get_trips",
  {
    title: "Get User Trips",
    description: "Retrieve a paginated list of trips owned by the authenticated user, ordered by updated_at descending",
    inputSchema: {
      page: z.number().min(1).optional().describe("Page number for pagination (starts at 1, optional)")
    }
  },
  async ({ page }) => {
    try {
      const response = await api.getTrips(page);
      return {
        content: [{
          type: "text",
          text: formatTripsList(response)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "get_trip_details",
  {
    title: "Get Trip Details",
    description: "Retrieve full details for a specific trip including track points and performance data",
    inputSchema: {
      id: z.number().min(1).describe("The unique ID of the trip to retrieve")
    }
  },
  async ({ id }) => {
    try {
      const response = await api.getTrip(id);
      return {
        content: [{
          type: "text",
          text: formatTripDetails(response)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true
      };
    }
  }
);

// Users
server.registerTool(
  "get_current_user",
  {
    title: "Get Current User",
    description: "Retrieve profile information for the authenticated user",
    inputSchema: {}
  },
  async () => {
    try {
      const response = await api.getCurrentUser();
      return {
        content: [{
          type: "text",
          text: formatUserDetails(response)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true
      };
    }
  }
);

// Events
server.registerTool(
  "get_events",
  {
    title: "Get User Events",
    description: "Retrieve a paginated list of events owned by the authenticated user, ordered by created_at descending",
    inputSchema: {
      page: z.number().min(1).optional().describe("Page number for pagination (starts at 1, optional)")
    }
  },
  async ({ page }) => {
    try {
      const response = await api.getEvents(page);
      return {
        content: [{
          type: "text",
          text: formatEventsList(response)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true
      };
    }
  }
);

server.registerTool(
  "get_event_details",
  {
    title: "Get Event Details",
    description: "Retrieve full details for a specific event including associated routes",
    inputSchema: {
      id: z.number().min(1).describe("The unique ID of the event to retrieve")
    }
  },
  async ({ id }) => {
    try {
      const response = await api.getEvent(id);
      return {
        content: [{
          type: "text",
          text: formatEventDetails(response)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true
      };
    }
  }
);

// Sync
server.registerTool(
  "sync_user_data",
  {
    title: "Sync User Data",
    description: "Retrieve items (routes and/or trips) that the user has interacted with since a given datetime. Useful for maintaining remote copies of user libraries.",
    inputSchema: {
      since: z.string().describe("ISO8601 formatted datetime (e.g., '2024-01-01T00:00:00Z') to get changes since"),
      assets: z.string().optional().describe("Comma-separated list of asset types to return: 'routes', 'trips', or 'routes,trips' (optional, defaults to API client setting)")
    }
  },
  async ({ since, assets }) => {
    try {
      const response = await api.getSync(since, assets);
      return {
        content: [{
          type: "text",
          text: formatSyncResponse(response)
        }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: formatError(error) }],
        isError: true
      };
    }
  }
);

// Start the server
async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Don't log to stdout as it breaks MCP protocol
}

startServer().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});

