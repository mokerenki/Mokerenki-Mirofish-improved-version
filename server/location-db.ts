import { eq, and } from "drizzle-orm";
import { locationData, InsertLocationData, LocationData } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * Save or update user location data
 */
export async function saveLocationData(data: InsertLocationData): Promise<LocationData | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .insert(locationData)
      .values(data)
      .onDuplicateKeyUpdate({
        set: {
          latitude: data.latitude,
          longitude: data.longitude,
          region: data.region,
          city: data.city,
          country: data.country,
          timezone: data.timezone,
          demographics: data.demographics,
          regulations: data.regulations,
          competitors: data.competitors,
          isEnabled: data.isEnabled,
          updatedAt: new Date(),
        },
      });

    // Return the saved location data
    if (data.userId && data.conversationId) {
      return getConversationLocationData(data.conversationId);
    } else if (data.userId) {
      return getUserLocationData(data.userId);
    }
    return null;
  } catch (error) {
    console.error("Error saving location data:", error);
    throw error;
  }
}

/**
 * Get location data by ID
 */
export async function getLocationDataById(id: number): Promise<LocationData | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(locationData)
      .where(eq(locationData.id, id))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting location data:", error);
    return null;
  }
}

/**
 * Get location data for a user
 */
export async function getUserLocationData(userId: number): Promise<LocationData | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(locationData)
      .where(and(eq(locationData.userId, userId), eq(locationData.isEnabled, 1)))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting user location data:", error);
    return null;
  }
}

/**
 * Get location data for a specific conversation
 */
export async function getConversationLocationData(
  conversationId: number
): Promise<LocationData | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db
      .select()
      .from(locationData)
      .where(eq(locationData.conversationId, conversationId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting conversation location data:", error);
    return null;
  }
}

/**
 * Disable location tracking for a user
 */
export async function disableLocationTracking(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db
      .update(locationData)
      .set({ isEnabled: 0 })
      .where(eq(locationData.userId, userId));
  } catch (error) {
    console.error("Error disabling location tracking:", error);
    throw error;
  }
}

/**
 * Format location data for LLM context
 */
export function formatLocationForLLM(location: LocationData | null): string {
  if (!location) return "";

  const parts: string[] = [];

  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);
  if (location.country) parts.push(location.country);

  let context = `User location: ${parts.join(", ")}`;

  if (location.timezone) {
    context += ` (Timezone: ${location.timezone})`;
  }

  if (location.regulations && location.regulations.length > 0) {
    context += `\nRelevant regulations: ${location.regulations.join(", ")}`;
  }

  if (location.competitors && location.competitors.length > 0) {
    context += `\nMajor competitors in region: ${location.competitors.join(", ")}`;
  }

  if (location.demographics) {
    const demo = location.demographics;
    if (demo.population) {
      context += `\nRegional population: ${demo.population.toLocaleString()}`;
    }
    if (demo.industry_mix) {
      context += `\nKey industries: ${demo.industry_mix.join(", ")}`;
    }
  }

  return context;
}
