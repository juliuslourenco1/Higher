import { and, eq, inArray, ne, notInArray, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  BusinessProfile,
  InsertUser,
  VerificationDocument,
  InsertVerificationDocument,
  Post,
  InsertPost,
  businessProfiles,
  matches,
  messages,
  swipes,
  users,
  verificationDocuments,
  posts,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Business Profiles ────────────────────────────────────────────────────────

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function getProfileById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(businessProfiles).where(eq(businessProfiles.id, id)).limit(1);
  return result[0];
}

export async function createProfile(data: Omit<typeof businessProfiles.$inferInsert, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(businessProfiles).values(data);
  const result = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, data.userId)).limit(1);
  return result[0]!;
}

export async function updateProfile(id: number, data: Partial<typeof businessProfiles.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(businessProfiles).set(data).where(eq(businessProfiles.id, id));
  const result = await db.select().from(businessProfiles).where(eq(businessProfiles.id, id)).limit(1);
  return result[0]!;
}

// ─── Discovery Feed ───────────────────────────────────────────────────────────

export async function getDiscoveryProfiles(
  myProfileId: number,
  filters: { industry?: string; companySize?: string; partnershipGoal?: string },
  limit = 20
): Promise<BusinessProfile[]> {
  const db = await getDb();
  if (!db) return [];

  // Get all profile IDs already swiped by this user
  const swipedRows = await db
    .select({ targetProfileId: swipes.targetProfileId })
    .from(swipes)
    .where(eq(swipes.swiperProfileId, myProfileId));

  const swipedIds = swipedRows.map((r) => r.targetProfileId);

  // Build conditions
  const excludeIds = [myProfileId, ...swipedIds];

  let query = db
    .select()
    .from(businessProfiles)
    .where(
      and(
        eq(businessProfiles.isActive, true),
        notInArray(businessProfiles.id, excludeIds),
        filters.industry ? eq(businessProfiles.industry, filters.industry) : undefined,
        filters.companySize ? eq(businessProfiles.companySize, filters.companySize) : undefined
      )
    )
    .limit(limit);

  const results = await query;

  // Filter by partnershipGoal in JS (stored as JSON string)
  if (filters.partnershipGoal) {
    return results.filter((p) => {
      try {
        const goals: string[] = JSON.parse(p.partnershipGoals);
        return goals.includes(filters.partnershipGoal!);
      } catch {
        return false;
      }
    });
  }

  return results;
}

// ─── Swipes ───────────────────────────────────────────────────────────────────

export async function recordSwipe(swiperProfileId: number, targetProfileId: number, direction: "right" | "left") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Prevent duplicate swipes
  const existing = await db
    .select()
    .from(swipes)
    .where(and(eq(swipes.swiperProfileId, swiperProfileId), eq(swipes.targetProfileId, targetProfileId)))
    .limit(1);

  if (existing.length > 0) return { duplicate: true, matchCreated: false, matchId: null };

  await db.insert(swipes).values({ swiperProfileId, targetProfileId, direction });

  if (direction !== "right") return { duplicate: false, matchCreated: false, matchId: null };

  // Check if target has also swiped right on swiper
  const mutual = await db
    .select()
    .from(swipes)
    .where(
      and(
        eq(swipes.swiperProfileId, targetProfileId),
        eq(swipes.targetProfileId, swiperProfileId),
        eq(swipes.direction, "right")
      )
    )
    .limit(1);

  if (mutual.length === 0) return { duplicate: false, matchCreated: false, matchId: null };

  // Create match (store with lower id first for uniqueness)
  const [a, b] = swiperProfileId < targetProfileId
    ? [swiperProfileId, targetProfileId]
    : [targetProfileId, swiperProfileId];

  // Check match doesn't already exist
  const existingMatch = await db
    .select()
    .from(matches)
    .where(and(eq(matches.profileAId, a), eq(matches.profileBId, b)))
    .limit(1);

  if (existingMatch.length > 0) return { duplicate: false, matchCreated: false, matchId: existingMatch[0]!.id };

  await db.insert(matches).values({ profileAId: a, profileBId: b });
  const newMatch = await db
    .select()
    .from(matches)
    .where(and(eq(matches.profileAId, a), eq(matches.profileBId, b)))
    .limit(1);

  return { duplicate: false, matchCreated: true, matchId: newMatch[0]!.id };
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function getMatchesForProfile(profileId: number) {
  const db = await getDb();
  if (!db) return [];

  const myMatches = await db
    .select()
    .from(matches)
    .where(or(eq(matches.profileAId, profileId), eq(matches.profileBId, profileId)));

  return myMatches || [];
}

export async function getMatchById(matchId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  return result[0];
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessagesByMatchId(matchId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(messages).where(eq(messages.matchId, matchId));
  return result || [];
}

export async function sendMessage(matchId: number, senderProfileId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values({ matchId, senderProfileId, content });
  // Fetch the most recently inserted message for this sender in this match
  const result = await db
    .select()
    .from(messages)
    .where(and(eq(messages.matchId, matchId), eq(messages.senderProfileId, senderProfileId)))
    .orderBy(messages.id)
    .limit(1000);
  // Return the last one (highest id = most recently inserted)
  return result[result.length - 1]!;
}

// ─── Verification Documents ──────────────────────────────────────────────────

export async function uploadVerificationDocument(
  profileId: number,
  documentUrl: string,
  documentKey: string,
  documentType: string
): Promise<VerificationDocument> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(verificationDocuments).values({
    profileId,
    documentUrl,
    documentKey,
    documentType,
    status: "pending",
  });

  const result = await db
    .select()
    .from(verificationDocuments)
    .where(and(eq(verificationDocuments.profileId, profileId), eq(verificationDocuments.documentKey, documentKey)))
    .orderBy(verificationDocuments.id)
    .limit(1);

  return result[result.length - 1]!;
}

export async function getVerificationDocuments(profileId: number): Promise<VerificationDocument[]> {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.profileId, profileId));
  return result || [];
}

export async function markProfileVerified(profileId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(businessProfiles)
    .set({ isVerified: true, updatedAt: new Date() })
    .where(eq(businessProfiles.id, profileId));
}

export async function updateProfileType(profileId: number, profileType: "business" | "freelance"): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(businessProfiles)
    .set({ profileType, updatedAt: new Date() })
    .where(eq(businessProfiles.id, profileId));
}


// ─── Swipe Limits & Premium ───────────────────────────────────────────────────

export async function getSwipeCountToday(profileId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db
    .select()
    .from(swipes)
    .where(
      and(
        eq(swipes.swiperProfileId, profileId),
        // Swipes created today or later (but before tomorrow)
      )
    );

  return result.filter((s) => {
    const swipeDate = new Date(s.createdAt);
    return swipeDate >= today && swipeDate < tomorrow;
  }).length;
}

export async function upgradeToPremium(profileId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(businessProfiles)
    .set({ isPremium: true, updatedAt: new Date() })
    .where(eq(businessProfiles.id, profileId));
}


// ─── Work Posts ───────────────────────────────────────────────────────────────

export async function createPost(profileId: number, title: string, description: string, hourlyRate: number): Promise<Post> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(posts).values({ profileId, title, description, hourlyRate });
  
  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.profileId, profileId))
    .orderBy(posts.id)
    .limit(1);
  
  return result[result.length - 1]!;
}

export async function getPostsByProfileId(profileId: number): Promise<Post[]> {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(posts)
    .where(eq(posts.profileId, profileId));
  
  return result || [];
}

export async function deletePost(postId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(posts).where(eq(posts.id, postId));
}

// ─── Profile Deletion ─────────────────────────────────────────────────────────

export async function deleteProfile(profileId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all related data in order
  await db.delete(posts).where(eq(posts.profileId, profileId));
  await db.delete(verificationDocuments).where(eq(verificationDocuments.profileId, profileId));
  await db.delete(messages).where(eq(messages.senderProfileId, profileId));
  await db.delete(swipes).where(or(eq(swipes.swiperProfileId, profileId), eq(swipes.targetProfileId, profileId)));
  await db.delete(matches).where(or(eq(matches.profileAId, profileId), eq(matches.profileBId, profileId)));
  await db.delete(businessProfiles).where(eq(businessProfiles.id, profileId));
}
