export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
}

/**
 * Get user's current location using browser Geolocation API
 */
export async function getUserLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const locationData: LocationData = {
          latitude,
          longitude,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };

        // Try to reverse geocode
        try {
          const reverseGeoData = await reverseGeocode(latitude, longitude);
          Object.assign(locationData, reverseGeoData);
        } catch (error) {
          console.warn("Reverse geocoding failed:", error);
        }

        resolve(locationData);
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocode coordinates to get city, region, country
 * Uses Nominatim (OpenStreetMap) free API
 */
async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Partial<LocationData>> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      city: data.address?.city || data.address?.town || data.address?.village,
      region: data.address?.state || data.address?.province,
      country: data.address?.country,
    };
  } catch (error) {
    console.warn("Reverse geocoding error:", error);
    return {};
  }
}

/**
 * Format location for display
 */
export function formatLocation(location: LocationData): string {
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.join(", ") || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
}

/**
 * Get location context string for LLM
 */
export function getLocationContext(location: LocationData): string {
  const formatted = formatLocation(location);
  return `User location: ${formatted} (Timezone: ${location.timezone || "Unknown"})`;
}
