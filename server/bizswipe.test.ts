import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getProfileByUserId: vi.fn(),
  getProfileById: vi.fn(),
  createProfile: vi.fn(),
  updateProfile: vi.fn(),
  recordSwipe: vi.fn(),
  getMatchesForProfile: vi.fn(),
  getMatchById: vi.fn(),
  getMessagesByMatchId: vi.fn(),
  sendMessage: vi.fn(),
  getDiscoveryProfiles: vi.fn(),
  getSwipeCountToday: vi.fn(),
  upgradeToPremium: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

import * as db from "./db";

// ─── Context factory ──────────────────────────────────────────────────────────

function makeCtx(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@example.com`,
      name: `User ${userId}`,
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const mockProfile = (id: number, userId: number) => ({
  id,
  userId,
  companyName: `Company ${id}`,
  industry: "Technology",
  companySize: "11-50",
  description: "A great tech company",
  partnershipGoals: JSON.stringify(["Co-marketing"]),
  logoUrl: null,
  logoKey: null,
  website: null,
  location: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ─── Profile tests ────────────────────────────────────────────────────────────

describe("profile.mine", () => {
  it("returns null when user has no profile", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.profile.mine();
    expect(result == null).toBe(true); // procedure returns undefined when no profile
  });

  it("returns the profile when one exists", async () => {
    const profile = mockProfile(10, 1);
    vi.mocked(db.getProfileByUserId).mockResolvedValue(profile);
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.profile.mine();
    expect(result?.companyName).toBe("Company 10");
  });
});

describe("profile.create", () => {
  it("creates a profile when none exists", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(undefined);
    const created = mockProfile(5, 1);
    vi.mocked(db.createProfile).mockResolvedValue(created);

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.profile.create({
      companyName: "My Corp",
      industry: "Technology",
      companySize: "11-50",
      description: "We build great software products.",
      partnershipGoals: ["Co-marketing"],
    });
    expect(result.id).toBe(5);
    expect(db.createProfile).toHaveBeenCalledOnce();
  });

  it("throws CONFLICT if profile already exists", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(mockProfile(1, 1));
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.profile.create({
        companyName: "Duplicate",
        industry: "Finance",
        companySize: "1-10",
        description: "Already have a profile here.",
        partnershipGoals: ["Investment"],
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

// ─── Swipe / Match tests ──────────────────────────────────────────────────────

describe("swipe.submit", () => {
  it("records a left swipe without creating a match", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(mockProfile(1, 1));
    vi.mocked(db.recordSwipe).mockResolvedValue({ duplicate: false, matchCreated: false, matchId: null });

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.swipe.submit({ targetProfileId: 2, direction: "left" });
    expect(result.matchCreated).toBe(false);
  });

  it("creates a match on mutual right swipe and notifies owner", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(mockProfile(1, 1));
    vi.mocked(db.getProfileById).mockResolvedValue(mockProfile(2, 2));
    vi.mocked(db.recordSwipe).mockResolvedValue({ duplicate: false, matchCreated: true, matchId: 42 });

    const { notifyOwner } = await import("./_core/notification");
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.swipe.submit({ targetProfileId: 2, direction: "right" });

    expect(result.matchCreated).toBe(true);
    expect(result.matchId).toBe(42);
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Match") })
    );
  });

  it("throws PRECONDITION_FAILED if user has no profile", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.swipe.submit({ targetProfileId: 2, direction: "right" })
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});

// ─── Message tests ────────────────────────────────────────────────────────────

describe("message.list", () => {
  it("returns messages for a valid match participant", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(mockProfile(1, 1));
    vi.mocked(db.getMatchById).mockResolvedValue({ id: 10, profileAId: 1, profileBId: 2, createdAt: new Date() });
    const msgs = [
      { id: 1, matchId: 10, senderProfileId: 1, content: "Hello!", createdAt: new Date() },
      { id: 2, matchId: 10, senderProfileId: 2, content: "Hi there!", createdAt: new Date() },
    ];
    vi.mocked(db.getMessagesByMatchId).mockResolvedValue(msgs);

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.message.list({ matchId: 10 });
    expect(result).toHaveLength(2);
    expect(result[0]?.content).toBe("Hello!");
  });

  it("throws FORBIDDEN if user is not part of the match", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(mockProfile(1, 1));
    vi.mocked(db.getMatchById).mockResolvedValue({ id: 10, profileAId: 5, profileBId: 6, createdAt: new Date() });

    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.message.list({ matchId: 10 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("message.send", () => {
  it("sends a message in a valid match", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(mockProfile(1, 1));
    vi.mocked(db.getMatchById).mockResolvedValue({ id: 10, profileAId: 1, profileBId: 2, createdAt: new Date() });
    const sentMsg = { id: 99, matchId: 10, senderProfileId: 1, content: "Hello!", createdAt: new Date() };
    vi.mocked(db.sendMessage).mockResolvedValue(sentMsg);

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.message.send({ matchId: 10, content: "Hello!" });
    expect(result.content).toBe("Hello!");
  });

  it("throws FORBIDDEN if user is not part of the match", async () => {
    vi.mocked(db.getProfileByUserId).mockResolvedValue(mockProfile(1, 1));
    vi.mocked(db.getMatchById).mockResolvedValue({ id: 10, profileAId: 5, profileBId: 6, createdAt: new Date() });

    const caller = appRouter.createCaller(makeCtx(1));
    await expect(
      caller.message.send({ matchId: 10, content: "Unauthorized" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
