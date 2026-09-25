import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import schema from "./schema";

export const list = query({
  args: {},
  returns: v.array(schema.doc("tasks")),
  handler: async (ctx) => {
    return await ctx.db.query("tasks").order("desc").take(100);
  },
});

export const create = mutation({
  args: { text: v.string() },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    const text = args.text.trim();
    if (!text) throw new Error("Task text is required.");
    return await ctx.db.insert("tasks", { text, is_completed: false });
  },
});

export const update = mutation({
  args: {
    id: v.id("tasks"),
    is_completed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch("tasks", args.id, { is_completed: args.is_completed });
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete("tasks", args.id);
    return null;
  },
});
