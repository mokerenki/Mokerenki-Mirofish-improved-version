import { useState } from "react";
import { MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
}

interface LocationPermissionUIProps {
  onLocationGranted?: (location: LocationData) => void;
  onLocationDenied?: () => void;
  compact?: boolean;
}

export function LocationPermissionUI({
  onLocationGranted,
  onLocationDenied,
  compact = false,
}: LocationPermissionUIProps) {
  const [loading, setLoading] = useState(false);
  const [granted, setGranted] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);

  const requestLocation = async () => {
    setLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      const { latitude, longitude } = position.coords;

      // Reverse geocode to get region/city (using a simple approach)
      const locationData: LocationData = {
        latitude,
        longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };

      // Try to get more detailed location info via reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
        );
        const data = await response.json();
        if (data.address) {
          locationData.city = data.address.city || data.address.town;
          locationData.region = data.address.state || data.address.province;
          locationData.country = data.address.country;
        }
      } catch (error) {
        console.warn("Could not reverse geocode location:", error);
      }

      setLocation(locationData);
      setGranted(true);
      onLocationGranted?.(locationData);
      toast.success("Location access granted!");
    } catch (error) {
      console.error("Location error:", error);
      setGranted(false);
      onLocationDenied?.();
      toast.error("Could not access location. Please enable location services.");
    } finally {
      setLoading(false);
    }
  };

  if (granted && location) {
    return (
      <div className={compact ? "flex items-center gap-2" : "p-4 bg-green-50 border border-green-200 rounded-lg"}>
        <CheckCircle className="w-5 h-5 text-green-600" />
        <div className={compact ? "" : "ml-2"}>
          <p className="text-sm font-medium text-green-900">
            Location enabled
            {location.city && ` • ${location.city}, ${location.region}`}
          </p>
          {!compact && (
            <p className="text-xs text-green-700 mt-1">
              Predictions will include location-specific context for more accurate results.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "flex items-center gap-2" : "p-4 bg-blue-50 border border-blue-200 rounded-lg"}>
      <div className="flex items-start gap-3 w-full">
        <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Enable location for better predictions
          </p>
          {!compact && (
            <p className="text-xs text-blue-700 mt-1">
              We'll use your location to provide region-specific insights, local market context, and relevant regulations.
            </p>
          )}
          <div className={compact ? "hidden" : "flex gap-2 mt-3"}>
            <Button
              size="sm"
              onClick={requestLocation}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Accessing..." : "Enable Location"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setGranted(false)}
              className="text-blue-600 border-blue-200"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
      {compact && (
        <Button
          size="sm"
          onClick={requestLocation}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
        >
          {loading ? "..." : "Enable"}
        </Button>
      )}
    </div>
  );
}
