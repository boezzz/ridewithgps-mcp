# RideWithGPS MCP Server

A Model Context Protocol (MCP) server that provides access to the RideWithGPS API, allowing you to interact with routes, trips, events, and user data through standardized MCP tools.

## Features

This MCP server implements the following RideWithGPS API endpoints:

### Routes
- **get_routes**: Retrieve a paginated list of routes owned by the authenticated user, ordered by updated_at descending
- **get_route_details**: Retrieve full details for a specific route including track points, course points, and points of interest

### Trips
- **get_trips**: Retrieve a paginated list of trips owned by the authenticated user, ordered by updated_at descending
- **get_trip_details**: Retrieve full details for a specific trip including track points and performance data

### Users
- **get_current_user**: Retrieve profile information for the authenticated user

### Events
- **get_events**: Retrieve a paginated list of events owned by the authenticated user, ordered by created_at descending
- **get_event_details**: Retrieve full details for a specific event including associated routes

### Sync
- **sync_user_data**: Retrieve items (routes and/or trips) that the user has interacted with since a given datetime, useful for maintaining remote copies of user libraries

## Setup

**Build the server app:**

```bash
npm install
npm run build
```

**Configure Claude Desktop:**

You must install the [Claude](https://claude.ai/) desktop app which supports MCP.

You can get your RideWithGPS API credentials from:
1. **API Key**: Visit the [developer settings page](https://ridewithgps.com/settings/developers) in your RideWithGPS account and create an API client
2. **Authentication Token**: Select the API Client you created and go to its edit page. Click on 'Create new Auth Token' to obtain a new authentication token.

![Access Token Instructions](access_token_instruction.png)


Then, open your Claude Desktop settings, go to Developers, and select 'Edit Config'. Alternatively, in your `claude_desktop_config.json` file, add a new MCP server:

```json
{
  "mcpServers": {
    "ridewithgps-mcp": {
      "command": "node",
      "args": ["/path/to/repo/build/index.js"],
      "env": {
        "RWGPS_API_KEY": "your_api_key_here",
        "RWGPS_AUTH_TOKEN": "your_auth_token_here"
      }
    }
  }
}
```

You can now launch Claude desktop app and ask it to interact with your RideWithGPS data.

**Example queries:**
- "Show me my recent routes"
- "Get details for the centrry route I created yesterday"
- "List my cycling trips from last month"
- "What events do I have coming up that I'll probably chicken out of?"
- "Show me my user profile so I can admire my optimistically low weight setting"
- "Sync my data since last week when I pretended that walk to the coffee shop was a training ride"



> To use RideWithGPS MCP Server on other MCP Clients, please follow the same steps.

## API Coverage

This MCP server implements the main RideWithGPS API endpoints for individual users, specifically excluding organization-specific features as requested. The implemented endpoints provide comprehensive access to:

- Personal route library management
- Trip data and performance metrics
- Event information and participation
- User profile data
- Efficient data synchronization

For complete API documentation, see: https://github.com/ridewithgps/developers

## Error Handling

All tools include comprehensive error handling that will return descriptive error messages if API calls fail, helping you troubleshoot authentication or connectivity issues.

## Development

To contribute to this project:

1. Install dependencies: `npm install`
2. Make your changes to the TypeScript source files in `src/`
3. Build the project: `npm run build`
4. Test your changes using `npm run inspector`


Current development roadmap:
- Utilize OAuth for secure user authentication
- Deploy MCP server to Smithery/Glama for distribution

## License

This project is licensed under the MIT License - see the LICENSE file for details.
