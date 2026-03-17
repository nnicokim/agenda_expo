import * as Location from "expo-location";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export interface PlaceSuggestion {
  description: string;
  placeId: string;
}

export interface PlaceDetails {
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

export async function requestForegroundLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

export async function reverseGeocodeToAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const result = await Location.reverseGeocodeAsync({ latitude, longitude });
    const first = result[0];
    if (!first) return null;

    const parts = [
      first.name,
      first.street,
      first.district,
      first.city,
      first.region,
      first.postalCode,
      first.country,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

export async function fetchAddressSuggestions(
  input: string,
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (!GOOGLE_MAPS_API_KEY || query.length < 3) return [];

  const url =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json" +
    `?input=${encodeURIComponent(query)}` +
    "&types=address" +
    `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
      return [];
    }

    const predictions = Array.isArray(json.predictions) ? json.predictions : [];
    return predictions.slice(0, 5).map((prediction: any) => ({
      description: String(prediction.description ?? ""),
      placeId: String(prediction.place_id ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  if (!GOOGLE_MAPS_API_KEY || !placeId) return null;

  const url =
    "https://maps.googleapis.com/maps/api/place/details/json" +
    `?place_id=${encodeURIComponent(placeId)}` +
    "&fields=formatted_address,geometry" +
    `&key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    if (json.status !== "OK") return null;

    const location = json.result?.geometry?.location;
    const address = json.result?.formatted_address;
    if (
      !location ||
      typeof location.lat !== "number" ||
      typeof location.lng !== "number"
    ) {
      return null;
    }

    return {
      address: String(address ?? ""),
      latitude: location.lat,
      longitude: location.lng,
      placeId,
    };
  } catch {
    return null;
  }
}

export function hasGoogleMapsApiKey(): boolean {
  return Boolean(GOOGLE_MAPS_API_KEY);
}
