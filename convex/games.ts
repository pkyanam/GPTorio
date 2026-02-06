import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.subject;
}

export const getMyGame = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("games")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  }
});

export const upsertMyGame = mutation({
  args: { state: v.any() },
  handler: async (ctx, { state }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("games")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { state, updatedAt });
      return existing._id;
    }

    return await ctx.db.insert("games", { userId, state, updatedAt });
  }
});

export const resetMyGame = mutation({
  args: { state: v.any() },
  handler: async (ctx, { state }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("games")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const updatedAt = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, { state, updatedAt });
      return existing._id;
    }

    return await ctx.db.insert("games", { userId, state, updatedAt });
  }
});
