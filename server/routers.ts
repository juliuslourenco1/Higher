import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  createProfile,
  getDiscoveryProfiles,
  getMatchById,
  getMatchesForProfile,
  getMessagesByMatchId,
  getProfileById,
  getProfileByUserId,
  recordSwipe,
  sendMessage,
  updateProfile,
  uploadVerificationDocument,
  getVerificationDocuments,
  markProfileVerified,
  updateProfileType,
  getSwipeCountToday,
  upgradeToPremium,
  createPost,
  getPostsByProfileId,
  deletePost,
  deleteProfile,
} from "./db";
import { INDUSTRIES, COMPANY_SIZES, PARTNERSHIP_GOALS } from "../drizzle/schema";

// ─── Shared validators ────────────────────────────────────────────────────────

const profileInput = z.object({
  companyName: z.string().min(2).max(255),
  industry: z.enum(INDUSTRIES),
  companySize: z.enum(COMPANY_SIZES),
  description: z.string().min(10).max(2000),
  partnershipGoals: z.array(z.enum(PARTNERSHIP_GOALS)).min(1),
  website: z.string().url().optional().or(z.literal("")),
  location: z.string().max(255).optional(),
  logoUrl: z.string().optional(),
  logoKey: z.string().optional(),
  profileType: z.enum(["business", "freelance"]).optional().default("business"),
});

// ─── Profile Router ───────────────────────────────────────────────────────────

const profileRouter = router({
  mine: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getProfileByUserId(ctx.user.id);
    return profile || null; // Explicitly return null, never undefined
  }),

  get: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const profile = await getProfileById(input.id);
    if (!profile) throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
    return profile;
  }),

  create: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const existing = await getProfileByUserId(ctx.user.id);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: "You already have a business profile." });

    return createProfile({
      userId: ctx.user.id,
      companyName: input.companyName,
      industry: input.industry,
      companySize: input.companySize,
      description: input.description,
      partnershipGoals: JSON.stringify(input.partnershipGoals),
      website: input.website || null,
      location: input.location || null,
      logoUrl: input.logoUrl || null,
      logoKey: input.logoKey || null,
      profileType: input.profileType || "business",
      isActive: true,
    });
  }),

  update: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const existing = await getProfileByUserId(ctx.user.id);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "No profile found to update." });

    return updateProfile(existing.id, {
      companyName: input.companyName,
      industry: input.industry,
      companySize: input.companySize,
      description: input.description,
      partnershipGoals: JSON.stringify(input.partnershipGoals),
      website: input.website || null,
      location: input.location || null,
      logoUrl: input.logoUrl || null,
      logoKey: input.logoKey || null,
      profileType: input.profileType || "business",
    });
  }),

  uploadLogo: protectedProcedure
    .input(z.object({ fileBase64: z.string(), mimeType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.mimeType.split("/")[1] ?? "png";
      const key = `logos/user-${ctx.user.id}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url, key };
    }),
});

// ─── Verification Router ──────────────────────────────────────────────────────

const verificationRouter = router({
  uploadDocument: protectedProcedure
    .input(z.object({ fileBase64: z.string(), mimeType: z.string(), documentType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const myProfile = await getProfileByUserId(ctx.user.id);
      if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create a profile first." });

      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const ext = input.mimeType.split("/")[1] ?? "pdf";
      const key = `verification/user-${ctx.user.id}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      return uploadVerificationDocument(myProfile.id, url, key, input.documentType);
    }),

  getDocuments: protectedProcedure.query(async ({ ctx }) => {
    const myProfile = await getProfileByUserId(ctx.user.id);
    if (!myProfile) return [];
    return getVerificationDocuments(myProfile.id);
  }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const myProfile = await getProfileByUserId(ctx.user.id);
    if (!myProfile) return { isVerified: false, documents: [] };
    const documents = await getVerificationDocuments(myProfile.id);
    return { isVerified: myProfile.isVerified, documents };
  }),
});

// ─── Discover Router ──────────────────────────────────────────────────────────

const discoverRouter = router({
  feed: protectedProcedure
    .input(
      z.object({
        industry: z.string().optional(),
        companySize: z.string().optional(),
        partnershipGoal: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const myProfile = await getProfileByUserId(ctx.user.id);
      if (!myProfile) return [];
      return getDiscoveryProfiles(myProfile.id, input);
    }),
});

// ─── Swipe Router ─────────────────────────────────────────────────────────────

const swipeRouter = router({
  getCountToday: protectedProcedure.query(async ({ ctx }) => {
    const myProfile = await getProfileByUserId(ctx.user.id);
    if (!myProfile) return 0;
    return getSwipeCountToday(myProfile.id);
  }),

  submit: protectedProcedure
    .input(z.object({ targetProfileId: z.number(), direction: z.enum(["right", "left"]) }))
    .mutation(async ({ ctx, input }) => {
      const myProfile = await getProfileByUserId(ctx.user.id);
      if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create a business profile first." });
      if (myProfile.id === input.targetProfileId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot swipe on yourself." });

      // Check swipe limit (6 per day for non-premium)
      if (!myProfile.isPremium) {
        const todayCount = await getSwipeCountToday(myProfile.id);
        if (todayCount >= 6) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Daily swipe limit reached. Upgrade to Premium for unlimited swipes." });
        }
      }

      const result = await recordSwipe(myProfile.id, input.targetProfileId, input.direction);

      // Notify owner on new match
      if (result.matchCreated && result.matchId) {
        const targetProfile = await getProfileById(input.targetProfileId);
        try {
          await notifyOwner({
            title: "🎉 New BizSwipe Match!",
            content: `A new mutual match was created between "${myProfile.companyName}" and "${targetProfile?.companyName ?? "Unknown"}". Match ID: ${result.matchId}`,
          });
        } catch (e) {
          console.warn("[Notify] Owner notification failed:", e);
        }
      }

      return result;
    }),

  upgradeToPremium: protectedProcedure.mutation(async ({ ctx }) => {
    const myProfile = await getProfileByUserId(ctx.user.id);
    if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create a business profile first." });
    await upgradeToPremium(myProfile.id);
    return { success: true };
  }),
});

// ─── Match Router ─────────────────────────────────────────────────────────────

const matchRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const myProfile = await getProfileByUserId(ctx.user.id);
    if (!myProfile) return [];

    const myMatches = await getMatchesForProfile(myProfile.id);

    // Enrich with partner profile info
    const enriched = await Promise.all(
      myMatches.map(async (m) => {
        const partnerId = m.profileAId === myProfile.id ? m.profileBId : m.profileAId;
        const partner = await getProfileById(partnerId);
        return { ...m, partner: partner ?? null, myProfileId: myProfile.id };
      })
    );

    return enriched;
  }),

  get: protectedProcedure.input(z.object({ matchId: z.number() })).query(async ({ ctx, input }) => {
    const myProfile = await getProfileByUserId(ctx.user.id);
    if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED" });

    const match = await getMatchById(input.matchId);
    if (!match) throw new TRPCError({ code: "NOT_FOUND" });

    // Verify user is part of this match
    if (match.profileAId !== myProfile.id && match.profileBId !== myProfile.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const partnerId = match.profileAId === myProfile.id ? match.profileBId : match.profileAId;
    const partner = await getProfileById(partnerId);

    return { ...match, partner: partner ?? null, myProfileId: myProfile.id };
  }),
});

// ─── Message Router ───────────────────────────────────────────────────────────

const messageRouter = router({
  list: protectedProcedure
    .input(z.object({ matchId: z.number() }))
    .query(async ({ ctx, input }) => {
      const myProfile = await getProfileByUserId(ctx.user.id);
      if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED" });

      const match = await getMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      if (match.profileAId !== myProfile.id && match.profileBId !== myProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return getMessagesByMatchId(input.matchId);
    }),

  send: protectedProcedure
    .input(z.object({ matchId: z.number(), content: z.string().min(1).max(5000) }))
    .mutation(async ({ ctx, input }) => {
      const myProfile = await getProfileByUserId(ctx.user.id);
      if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED" });

      const match = await getMatchById(input.matchId);
      if (!match) throw new TRPCError({ code: "NOT_FOUND" });
      if (match.profileAId !== myProfile.id && match.profileBId !== myProfile.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return sendMessage(input.matchId, myProfile.id, input.content);
    }),
});

// ─── Post Router ─────────────────────────────────────────────────────────────

const postRouter = router({
  create: protectedProcedure
    .input(z.object({ title: z.string().min(3).max(255), description: z.string().min(10).max(2000), hourlyRate: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const myProfile = await getProfileByUserId(ctx.user.id);
      if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create a profile first." });
      return createPost(myProfile.id, input.title, input.description, input.hourlyRate);
    }),

  listByProfile: protectedProcedure
    .input(z.object({ profileId: z.number().int() }))
    .query(async ({ input }) => getPostsByProfileId(input.profileId)),

  delete: protectedProcedure
    .input(z.object({ postId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const myProfile = await getProfileByUserId(ctx.user.id);
      if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED" });
      const myPosts = await getPostsByProfileId(myProfile.id);
      const postExists = myPosts.some((p) => p.id === input.postId);
      if (!postExists) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete another user's post" });
      await deletePost(input.postId);
      return { success: true };
    }),
});

// ─── Profile Deletion Router ──────────────────────────────────────────────────

const profileManagementRouter = router({
  delete: protectedProcedure
    .mutation(async ({ ctx }) => {
      const myProfile = await getProfileByUserId(ctx.user.id);
      if (!myProfile) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No profile to delete." });
      await deleteProfile(myProfile.id);
      return { success: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user || null), // Ensure never undefined
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: profileRouter,
  verification: verificationRouter,
  discover: discoverRouter,
  swipe: swipeRouter,
  match: matchRouter,
  message: messageRouter,
  post: postRouter,
  profileManagement: profileManagementRouter,
});

export type AppRouter = typeof appRouter;
