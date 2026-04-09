// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Action = "autocomplete" | "details";

interface RequestBody {
  action?: Action;
  input?: string;
  placeId?: string;
}

interface PlaceSuggestion {
  description: string;
  placeId: string;
}

interface PlaceDetails {
  address: string;
  latitude: number;
  longitude: number;
  placeId: string;
}

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") ?? "";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

async function handleAutocomplete(inputRaw: string): Promise<Response> {
  const input = inputRaw.trim();

  if (input.length < 3 || input.length > 120) {
    return jsonResponse(200, { suggestions: [] });
  }

  const url =
    "https://maps.googleapis.com/maps/api/place/autocomplete/json" +
    `?input=${encodeURIComponent(input)}` +
    "&types=address" +
    `&key=${encodeURIComponent(GOOGLE_PLACES_API_KEY)}`;

  const upstream = await fetch(url, { method: "GET" });
  if (!upstream.ok) {
    return jsonResponse(502, { error: "Places autocomplete upstream error" });
  }

  const payload = await upstream.json();
  if (payload.status !== "OK" && payload.status !== "ZERO_RESULTS") {
    return jsonResponse(200, { suggestions: [] });
  }

  const predictions = Array.isArray(payload.predictions)
    ? payload.predictions
    : [];

  const suggestions: PlaceSuggestion[] = predictions
    .slice(0, 5)
    .map((item: any) => ({
      description: String(item?.description ?? ""),
      placeId: String(item?.place_id ?? ""),
    }));

  return jsonResponse(200, { suggestions });
}

async function handleDetails(placeIdRaw: string): Promise<Response> {
  const placeId = placeIdRaw.trim();

  if (!placeId || placeId.length > 256) {
    return jsonResponse(200, { details: null });
  }

  const url =
    "https://maps.googleapis.com/maps/api/place/details/json" +
    `?place_id=${encodeURIComponent(placeId)}` +
    "&fields=formatted_address,geometry" +
    `&key=${encodeURIComponent(GOOGLE_PLACES_API_KEY)}`;

  const upstream = await fetch(url, { method: "GET" });
  if (!upstream.ok) {
    return jsonResponse(502, { error: "Places details upstream error" });
  }

  const payload = await upstream.json();
  if (payload.status !== "OK") {
    return jsonResponse(200, { details: null });
  }

  const location = payload?.result?.geometry?.location;
  if (typeof location?.lat !== "number" || typeof location?.lng !== "number") {
    return jsonResponse(200, { details: null });
  }

  const details: PlaceDetails = {
    address: String(payload?.result?.formatted_address ?? ""),
    latitude: location.lat,
    longitude: location.lng,
    placeId,
  };

  return jsonResponse(200, { details });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return jsonResponse(500, { error: "Missing GOOGLE_PLACES_API_KEY secret" });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body" });
  }

  if (body.action === "autocomplete") {
    return handleAutocomplete(String(body.input ?? ""));
  }

  if (body.action === "details") {
    return handleDetails(String(body.placeId ?? ""));
  }

  return jsonResponse(400, { error: "Invalid action" });
});
