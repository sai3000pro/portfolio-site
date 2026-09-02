import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getRarity = internalQuery({
  args: {},
  handler: async (ctx) => {
    const unlocks = await ctx.db.query("achievementUnlocks").collect();
    const visitors = await ctx.db.query("visitors").collect();
    const counts: Record<string, number> = {};

    for (const unlock of unlocks) {
      counts[unlock.achievementId] = (counts[unlock.achievementId] ?? 0) + 1;
    }

    return { visitors: visitors.length, counts };
  },
});

export const recordUnlocks = internalMutation({
  args: {
    visitorId: v.string(),
    achievementIds: v.array(v.string()),
    firstSeen: v.number(),
  },
  handler: async (ctx, args) => {
    const visitor = await ctx.db
      .query("visitors")
      .withIndex("by_visitorId", (query) => query.eq("visitorId", args.visitorId))
      .unique();

    if (!visitor) {
      await ctx.db.insert("visitors", {
        visitorId: args.visitorId,
        firstSeen: args.firstSeen,
      });
    }

    const now = Date.now();
    for (const achievementId of args.achievementIds) {
      const existing = await ctx.db
        .query("achievementUnlocks")
        .withIndex("by_visitor_achievement", (query) =>
          query.eq("visitorId", args.visitorId).eq("achievementId", achievementId),
        )
        .unique();

      if (!existing) {
        await ctx.db.insert("achievementUnlocks", {
          visitorId: args.visitorId,
          achievementId,
          unlockedAt: now,
        });
      }
    }
  },
});
