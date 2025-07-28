// MCP Server Implementation for RideWithGPS
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { RideWithGPSApi, RideWithGPSConfig, RideWithGPSApiError } from "./api.js";

// TypeScript interfaces for better type management
interface BaseRouteTrip {
  id: number;
  url: string;
  name: string;
  visibility?: string;
  description?: string;
  locality?: string;
  administrative_area?: string;
  country_code?: string;
  distance: number;
  elevation_gain?: number;
  elevation_loss?: number;
  first_lat?: number;
  first_lng?: number;
  last_lat?: number;
  last_lng?: number;
  sw_lat?: number;
  sw_lng?: number;
  ne_lat?: number;
  ne_lng?: number;
  track_type?: string;
  terrain?: string;
  difficulty?: string;
  created_at: string;
  updated_at: string;
}

interface RouteListItem extends BaseRouteTrip {
  unpaved_pct?: number;
  surface?: string;
}

interface RouteDetails extends RouteListItem {
  track_points?: any[];
  course_points?: any[];
  points_of_interest?: any[];
}

interface TripListItem extends BaseRouteTrip {
  departed_at: string;
  time_zone?: string;
  activity_type?: string;
  fit_sport?: number;
  fit_sub_sport?: number;
  is_stationary?: boolean;
  duration?: number;
  moving_time?: number;
  avg_speed?: number;
  max_speed?: number;
  avg_cad?: number;
  min_cad?: number;
  max_cad?: number;
  avg_hr?: number;
  min_hr?: number;
  max_hr?: number;
  avg_watts?: number;
  min_watts?: number;
  max_watts?: number;
  calories?: number;
}

interface TripDetails extends TripListItem {
  track_points?: any[];
}

interface CoursePoint {
  x: number;
  y: number;
  d: number;
  i: number;
  t: string;
  n: string;
  _e?: boolean;
}

interface PointOfInterest {
  id: number;
  type: string;
  type_id: number;
  type_name: string;
  name: string;
  description?: string;
  url?: string;
  lat: number;
  lng: number;
}

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

  // Each route in the response has all the attributes of the route detail request below, 
  // except the track_points, course_points and points_of_interest attributes.

  routes.forEach((route: RouteListItem, index: number) => {
    output += `${index + 1}. **${route.name || 'Unnamed Route'}** (ID: ${route.id})\n`;
    
    // Basic route info
    output += `   Distance: ${formatDistance(route.distance)}`;
    if (route.elevation_gain) {
      output += ` | Elevation: +${formatElevation(route.elevation_gain)}`;
      if (route.elevation_loss) {
        output += `/-${formatElevation(route.elevation_loss)}`;
      }
    }
    output += `\n`;
    
    // Location and geography
    output += `   Location: ${route.locality || 'Unknown'}, ${route.administrative_area || 'Unknown'}`;
    if (route.country_code) {
      output += `, ${route.country_code}`;
    }
    output += `\n`;
    
    // Route characteristics
    const characteristics = [];
    if (route.track_type) characteristics.push(`Type: ${route.track_type}`);
    if (route.terrain) characteristics.push(`Terrain: ${route.terrain}`);
    if (route.difficulty) characteristics.push(`Difficulty: ${route.difficulty}`);
    if (route.surface) characteristics.push(`Surface: ${route.surface}`);
    if (route.unpaved_pct) characteristics.push(`${route.unpaved_pct}% unpaved`);
    if (characteristics.length > 0) {
      output += `   ${characteristics.join(' | ')}\n`;
    }
    
    // Visibility and description
    if (route.visibility) {
      output += `   Visibility: ${route.visibility}`;
    }
    if (route.description) {
      const truncatedDesc = route.description.length > 100 
        ? route.description.substring(0, 97) + '...' 
        : route.description;
      output += ` | Description: ${truncatedDesc}`;
    }
    if (route.visibility || route.description) {
      output += `\n`;
    }
    
    // Timestamps
    output += `   Created: ${formatDate(route.created_at)} | Updated: ${formatDate(route.updated_at)}\n\n`;
  });

  if (meta?.next_page_url) {
    output += "Use the next page parameter to get more results.";
  }

  return output;
}

function formatRouteDetails(response: any): string {
  const route: RouteDetails = response.route;
  if (!route) {
    return "Route not found.";
  }

  let output = `**${route.name || 'Unnamed Route'}**\n`;
  output += `ID: ${route.id}\n`;
  output += `Description: ${route.description || 'No description'}\n`;
  if (route.visibility) {
    output += `Visibility: ${route.visibility}\n`;
  }
  output += `\n`;
  
  output += `**Route Details:**\n`;
  output += `Distance: ${formatDistance(route.distance)}\n`;
  if (route.elevation_gain) {
    output += `Elevation Gain: ${formatElevation(route.elevation_gain)}\n`;
  }
  if (route.elevation_loss) {
    output += `Elevation Loss: ${formatElevation(route.elevation_loss)}\n`;
  }
  output += `Track Type: ${route.track_type || 'Unknown'}\n`;
  output += `Terrain: ${route.terrain || 'Unknown'}\n`;
  output += `Difficulty: ${route.difficulty || 'Unknown'}\n`;
  output += `Surface: ${route.surface || 'Unknown'}\n`;
  if (route.unpaved_pct) {
    output += `Unpaved Percentage: ${route.unpaved_pct}%\n`;
  }
  
  // Bounding box coordinates (useful for mapping applications)
  if (route.first_lat && route.first_lng) {
    output += `\n**Coordinates:**\n`;
    output += `Start: ${route.first_lat.toFixed(6)}, ${route.first_lng.toFixed(6)}\n`;
    output += `End: ${route.last_lat?.toFixed(6) || 'Unknown'}, ${route.last_lng?.toFixed(6) || 'Unknown'}\n`;
    if (route.sw_lat && route.sw_lng && route.ne_lat && route.ne_lng) {
      output += `Bounds: SW(${route.sw_lat.toFixed(6)}, ${route.sw_lng.toFixed(6)}) to NE(${route.ne_lat.toFixed(6)}, ${route.ne_lng.toFixed(6)})\n`;
    }
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
    output += `\n**Course Points (${route.course_points.length}):**\n`;
    route.course_points.forEach((point: CoursePoint, index: number) => {
      output += `${index + 1}. ${point.t || 'Unknown'} at ${formatDistance(point.d)}\n`;
      if (point.n) {
        output += `   Direction: ${point.n}\n`;
      }
      output += `   Location: ${point.y?.toFixed(6)}, ${point.x?.toFixed(6)}\n`;
      if (point._e) {
        output += `   (User edited)\n`;
      }
    });
  }
  
  if (route.points_of_interest?.length) {
    output += `\n**Points of Interest (${route.points_of_interest.length}):**\n`;
    route.points_of_interest.forEach((poi: PointOfInterest, index: number) => {
      output += `${index + 1}. **${poi.name || 'Unnamed POI'}** (${poi.type_name || poi.type || 'Unknown type'})\n`;
      if (poi.description) {
        output += `   Description: ${poi.description}\n`;
      }
      output += `   Location: ${poi.lat?.toFixed(6)}, ${poi.lng?.toFixed(6)}\n`;
      if (poi.url) {
        output += `   URL: ${poi.url}\n`;
      }
    });
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

  trips.forEach((trip: TripListItem, index: number) => {
    output += `${index + 1}. **${trip.name || 'Unnamed Trip'}** (ID: ${trip.id})\n`;

    // Basic trip info
    output += `   Distance: ${formatDistance(trip.distance)}`;
    if (trip.duration) {
      output += ` | Moving Time: ${formatDuration(trip.moving_time || 0)}`;
    }
    output += `\n`;

    // Activity and performance
    if (trip.activity_type) {
      output += `   Activity: ${trip.activity_type}`;
      if (trip.avg_speed) {
        output += ` | Avg Speed: ${trip.avg_speed.toFixed(1)} km/h`;
      }
      output += `\n`;
    }
    
    // Additional characteristics
    const characteristics = [];
    if (trip.track_type) characteristics.push(`Type: ${trip.track_type}`);
    if (trip.terrain) characteristics.push(`Terrain: ${trip.terrain}`);
    if (trip.difficulty) characteristics.push(`Difficulty: ${trip.difficulty}`);
    if (characteristics.length > 0) {
      output += `   ${characteristics.join(' | ')}\n`;
    }

    // Timestamps
    output += `   Departed: ${formatDate(trip.departed_at)}`;
    if (trip.created_at) {
      output += ` | Created: ${formatDate(trip.created_at)}`;
    }
    if (trip.updated_at) {
      output += ` | Updated: ${formatDate(trip.updated_at)}`;
    }
    output += `\n\n`;
  });

  if (meta?.next_page_url) {
    output += "Use the next page parameter to get more results.";
  }

  return output;
}

function formatTripDetails(response: any): string {
  const trip: TripDetails = response.trip;
  if (!trip) {
    return "Trip not found.";
  }

  let output = `**${trip.name || 'Unnamed Trip'}**\n`;
  output += `ID: ${trip.id}\n`;
  if (trip.description) {
    output += `Description: ${trip.description}\n`;
  }
  if (trip.visibility) {
    output += `Visibility: ${trip.visibility}\n`;
  }
  output += `\n`;
  
  output += `**Trip Details:**\n`;
  output += `Activity Type: ${trip.activity_type || 'Unknown'}\n`;
  if (trip.time_zone) {
    output += `Timezone: ${trip.time_zone}\n`;
  }
  output += `Departed: ${formatDate(trip.departed_at)}\n`;
  output += `Distance: ${formatDistance(trip.distance)}\n`;
  output += `Duration: ${formatDuration(trip.duration || 0)}\n`;
  output += `Moving Time: ${formatDuration(trip.moving_time || 0)}\n`;
  
  if (trip.is_stationary) {
    output += `Stationary Activity: Yes\n`;
  }
  
  // Additional trip characteristics
  const characteristics = [];
  if (trip.track_type) characteristics.push(`Type: ${trip.track_type}`);
  if (trip.terrain) characteristics.push(`Terrain: ${trip.terrain}`);
  if (trip.difficulty) characteristics.push(`Difficulty: ${trip.difficulty}`);
  if (characteristics.length > 0) {
    output += `Characteristics: ${characteristics.join(' | ')}\n`;
  }
  
  // Speed data
  output += `\n**Speed:**\n`;
  if (trip.avg_speed) {
    output += `Average: ${trip.avg_speed.toFixed(1)} km/h\n`;
  }
  if (trip.max_speed) {
    output += `Maximum: ${trip.max_speed.toFixed(1)} km/h\n`;
  }
  
  // Elevation data
  output += `\n**Elevation:**\n`;
  if (trip.elevation_gain) {
    output += `Gain: ${formatElevation(trip.elevation_gain)}\n`;
  }
  if (trip.elevation_loss) {
    output += `Loss: ${formatElevation(trip.elevation_loss)}\n`;
  }
  
  // Performance metrics
  if (trip.avg_hr || trip.avg_watts || trip.avg_cad) {
    output += `\n**Performance Metrics:**\n`;
    
    // Heart rate
    if (trip.avg_hr) {
      output += `Heart Rate - Avg: ${trip.avg_hr} bpm`;
      if (trip.min_hr && trip.max_hr) {
        output += ` (Range: ${trip.min_hr}-${trip.max_hr} bpm)`;
      }
      output += `\n`;
    }
    
    // Power
    if (trip.avg_watts) {
      output += `Power - Avg: ${trip.avg_watts}W`;
      if (trip.min_watts && trip.max_watts) {
        output += ` (Range: ${trip.min_watts}-${trip.max_watts}W)`;
      }
      output += `\n`;
    }
    
    // Cadence
    if (trip.avg_cad) {
      output += `Cadence - Avg: ${trip.avg_cad} rpm`;
      if (trip.min_cad && trip.max_cad) {
        output += ` (Range: ${trip.min_cad}-${trip.max_cad} rpm)`;
      }
      output += `\n`;
    }
  }
  
  if (trip.calories) {
    output += `\n**Energy:**\n`;
    output += `Calories: ${trip.calories}\n`;
  }
  
  // Coordinates (useful for mapping applications)
  if (trip.first_lat && trip.first_lng) {
    output += `\n**Coordinates:**\n`;
    output += `Start: ${trip.first_lat.toFixed(6)}, ${trip.first_lng.toFixed(6)}\n`;
    output += `End: ${trip.last_lat?.toFixed(6) || 'Unknown'}, ${trip.last_lng?.toFixed(6) || 'Unknown'}\n`;
    if (trip.sw_lat && trip.sw_lng && trip.ne_lat && trip.ne_lng) {
      output += `Bounds: SW(${trip.sw_lat.toFixed(6)}, ${trip.sw_lng.toFixed(6)}) to NE(${trip.ne_lat.toFixed(6)}, ${trip.ne_lng.toFixed(6)})\n`;
    }
  }
  
  output += `\n**Location:**\n`;
  output += `${trip.locality || 'Unknown'}, ${trip.administrative_area || 'Unknown'}, ${trip.country_code || 'Unknown'}\n`;
  
  // FIT file data
  if (trip.fit_sport || trip.fit_sub_sport) {
    output += `\n**FIT Data:**\n`;
    if (trip.fit_sport) {
      output += `Sport ID: ${trip.fit_sport}\n`;
    }
    if (trip.fit_sub_sport) {
      output += `Sub-sport ID: ${trip.fit_sub_sport}\n`;
    }
  }
  
  output += `\n**Timestamps:**\n`;
  output += `Created: ${formatDate(trip.created_at)}\n`;
  output += `Updated: ${formatDate(trip.updated_at)}\n`;
  
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
    title: "Get RideWithGPS Routes",
    description: "Retrieve a list of cycling routes owned by the user, ordered by updated_at descending",
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
    description: "Retrieve full details for a specific cycling route including track points, course points, and points of interest",
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
    title: "Get RideWithGPS Trips",
    description: "Retrieve a list of user's historical cycling trips, ordered by updated_at descending",
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
    description: "Retrieve full details for a specific cycling trip including track points and performance data",
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
    title: "Get RideWithGPS User",
    description: "Retrieve profile information for the user",
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
    title: "Get RideWithGPS Events",
    description: "Retrieve a list of events owned by the user, ordered by created_at descending",
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
    description: "Retrieve items (routes and/or trips) that the user has interacted with since a given datetime.",
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

