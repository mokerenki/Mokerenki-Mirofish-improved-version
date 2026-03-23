import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  saveLocationData,
  getUserLocationData,
  getConversationLocationData,
  disableLocationTracking,
  formatLocationForLLM,
} from "./location-db";

export const locationRouter = router({
  // Location management routes
  /**
   * Save or update user location
   */
  saveLocation: protectedProcedure
    .input(
      z.object({
        latitude: z.number().or(z.string()),
        longitude: z.number().or(z.string()),
        city: z.string().optional(),
        region: z.string().optional(),
        country: z.string().optional(),
        timezone: z.string().optional(),
        conversationId: z.number().optional(),
        demographics: z.record(z.string(), z.unknown()).optional(),
        regulations: z.array(z.string()).optional(),
        competitors: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const saved = await saveLocationData({
        userId: ctx.user.id,
        latitude: input.latitude as any,
        longitude: input.longitude as any,
        city: input.city,
        region: input.region,
        country: input.country,
        timezone: input.timezone,
        conversationId: input.conversationId,
        demographics: input.demographics,
        regulations: input.regulations,
        competitors: input.competitors,
        isEnabled: 1,
      });

      return {
        success: !!saved,
        location: saved,
      };
    }),

  /**
   * Get user's current location
   */
  getUserLocation: protectedProcedure.query(async ({ ctx }) => {
    const location = await getUserLocationData(ctx.user.id);
    return {
      location,
      context: location ? formatLocationForLLM(location) : null,
    };
  }),

  /**
   * Get location for a specific conversation
   */
  getConversationLocation: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      const location = await getConversationLocationData(input.conversationId);
      return {
        location,
        context: location ? formatLocationForLLM(location) : null,
      };
    }),

  /**
   * Disable location tracking
   */
  disableLocationTracking: protectedProcedure.mutation(async ({ ctx }) => {
    await disableLocationTracking(ctx.user.id);
    return { success: true };
  }),

  /**
   * Get location context for LLM (used internally during prediction)
   */
  getLocationContext: protectedProcedure
    .input(z.object({ conversationId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      let location = null;

      if (input.conversationId) {
        location = await getConversationLocationData(input.conversationId);
      }

      if (!location) {
        location = await getUserLocationData(ctx.user.id);
      }

      return {
        hasLocation: !!location,
        context: location ? formatLocationForLLM(location) : "",
      };
    }),
});
