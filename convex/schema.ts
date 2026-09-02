import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  visitors: defineTable({
    visitorId: v.string(),
    firstSeen: v.number(),
  }).index("by_visitorId", ["visitorId"]),

  achievementUnlocks: defineTable({
    visitorId: v.string(),
    achievementId: v.string(),
    unlockedAt: v.number(),
  })
    .index("by_achievement", ["achievementId"])
    .index("by_visitor_achievement", ["visitorId", "achievementId"]),
});
