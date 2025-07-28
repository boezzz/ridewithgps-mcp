/**
 * RideWithGPS API client utilities
 */
export interface RideWithGPSConfig {
  apiKey: string;
  authToken: string;
  baseUrl?: string;
}

export class RideWithGPSApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'RideWithGPSApiError';
  }
}

export class RideWithGPSApi {
  private config: RideWithGPSConfig;
  private baseUrl: string;

  constructor(config: RideWithGPSConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://ridewithgps.com';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-rwgps-api-key': this.config.apiKey,
      'x-rwgps-auth-token': this.config.authToken,
    };
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new RideWithGPSApiError(
        `API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorText
      );
    }

    return await response.json();
  }

  // Routes
  async getRoutes(page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = `/api/v1/routes.json${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  async getRoute(id: number): Promise<any> {
    return this.makeRequest(`/api/v1/routes/${id}.json`);
  }

  // Trips
  async getTrips(page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = `/api/v1/trips.json${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  async getTrip(id: number): Promise<any> {
    return this.makeRequest(`/api/v1/trips/${id}.json`);
  }

  // Users
  async getCurrentUser(): Promise<any> {
    return this.makeRequest('/api/v1/users/current.json');
  }

  // Events
  async getEvents(page?: number): Promise<any> {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    
    const queryString = params.toString();
    const endpoint = `/api/v1/events.json${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest(endpoint);
  }

  async getEvent(id: number): Promise<any> {
    return this.makeRequest(`/api/v1/events/${id}.json`);
  }

  // Sync
  async getSync(since: string, assets?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('since', since);
    if (assets) params.append('assets', assets);
    
    return this.makeRequest(`/api/v1/sync.json?${params.toString()}`);
  }
}
