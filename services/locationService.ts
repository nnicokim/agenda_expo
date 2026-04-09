import * as Location from "expo-location";
import { supabase, supabaseConfigError } from "../lib/supabase";

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

interface PlacesProxyResponse {
  suggestions?: PlaceSuggestion[];
  details?: PlaceDetails | null;
  error?: string;
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
  if (!isSupabaseConfigured() || query.length < 3) return [];

  try {
    const { data, error } = await supabase.functions.invoke(
      "google-places-proxy",
      {
        body: {
          action: "autocomplete",
          input: query,
        },
      },
    );

    if (error) {
      return [];
    }

    const payload = (data ?? {}) as PlacesProxyResponse;
    return Array.isArray(payload.suggestions) ? payload.suggestions : [];
  } catch {
    return [];
  }
}

export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  if (!isSupabaseConfigured() || !placeId) return null;

  try {
    const { data, error } = await supabase.functions.invoke(
      "google-places-proxy",
      {
        body: {
          action: "details",
          placeId,
        },
      },
    );

    if (error) {
      return null;
    }

    const payload = (data ?? {}) as PlacesProxyResponse;
    return payload.details ?? null;
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  return !supabaseConfigError; // Fallo con la URL o key
}
