import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    userId: v.string(),
    state: v.any(),
    updatedAt: v.number()
  }).index("by_userId", ["userId"])
});
