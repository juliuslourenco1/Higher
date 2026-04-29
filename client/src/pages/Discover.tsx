import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";
import {
  Loader2,
  X,
  Heart,
  Building2,
  MapPin,
  Users,
  Globe,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { getLoginUrl } from "@/const";
type BusinessProfile = {
  id: number;
  companyName: string;
  industry: string;
  companySize: string;
  description: string;
  partnershipGoals: string;
  logoUrl: string | null;
  website: string | null;
  location: string | null;
  isActive: boolean;
  userId: number;
  logoKey: string | null;
  profileType: "business" | "freelance";
  isVerified: boolean;
  isPremium: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const INDUSTRIES = [
  "Technology","Finance","Healthcare","Retail","Manufacturing",
  "Marketing","Legal","Real Estate","Education","Logistics",
  "Energy","Media","Consulting","Other",
];
const COMPANY_SIZES = ["1-10","11-50","51-200","201-500","500+"];
const PARTNERSHIP_GOALS = [
  "Co-marketing","Technology Integration","Distribution","Investment",
  "Joint Venture","Supplier / Vendor","Reseller","Strategic Alliance","Other",
];

function MatchModal({ company, onClose }: { company: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-3xl p-10 max-w-sm w-full mx-4 text-center shadow-2xl animate-match-pop">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-pink-100 flex items-center justify-center mx-auto mb-5">
          <Heart className="w-10 h-10 text-pink-500 fill-pink-500" />
        </div>
        <h2 className="text-3xl font-black text-foreground mb-2">It's a Match!</h2>
        <p className="text-muted-foreground font-light mb-6">
          You and <span className="font-semibold text-foreground">{company}</span> have both expressed interest. Start a conversation!
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 bg-card" onClick={onClose}>Keep Swiping</Button>
          <Link href="/matches" className="flex-1">
            <Button className="w-full font-bold">View Matches</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onSwipe, isTop }: {
  profile: BusinessProfile;
  onSwipe: (dir: "right" | "left") => void;
  isTop: boolean;
}) {
  const [swipeAnim, setSwipeAnim] = useState<"right" | "left" | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);

  let goals: string[] = [];
  try { goals = JSON.parse(profile.partnershipGoals); } catch {}

  const triggerSwipe = useCallback((dir: "right" | "left") => {
    setSwipeAnim(dir);
    setTimeout(() => onSwipe(dir), 380);
  }, [onSwipe]);

  const handleDragStart = (clientX: number) => {
    if (!isTop) return;
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;
    setDragX(clientX - startX);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragX > 80) triggerSwipe("right");
    else if (dragX < -80) triggerSwipe("left");
    else setDragX(0);
  };

  const rotation = isDragging ? dragX * 0.08 : 0;
  const showRight = dragX > 40;
  const showLeft = dragX < -40;

  return (
    <div
      className={`absolute inset-0 bg-card rounded-3xl shadow-xl border border-border overflow-hidden cursor-grab active:cursor-grabbing select-none
        ${swipeAnim === "right" ? "animate-swipe-right" : ""}
        ${swipeAnim === "left" ? "animate-swipe-left" : ""}
        ${isTop ? "animate-card-enter" : ""}
      `}
      style={{
        transform: isDragging
          ? `translateX(${dragX}px) rotate(${rotation}deg)`
          : undefined,
        transition: isDragging ? "none" : undefined,
        zIndex: isTop ? 10 : 5,
      }}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
      onTouchStart={(e) => handleDragStart(e.touches[0]!.clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0]!.clientX)}
      onTouchEnd={handleDragEnd}
    >
      {/* Swipe indicators */}
      {showRight && (
        <div className="absolute top-6 left-6 z-20 bg-green-500 text-white font-black text-xl px-4 py-2 rounded-xl rotate-[-15deg] border-4 border-green-400">
          CONNECT
        </div>
      )}
      {showLeft && (
        <div className="absolute top-6 right-6 z-20 bg-red-500 text-white font-black text-xl px-4 py-2 rounded-xl rotate-[15deg] border-4 border-red-400">
          PASS
        </div>
      )}

      {/* Logo / header area */}
      <div className="h-36 bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-3 right-3 w-16 h-16 rounded-full bg-blue-100/40 blur-xl" />
        <div className="absolute bottom-2 left-4 w-12 h-12 rounded-full bg-pink-100/50 blur-lg" />
        {profile.logoUrl ? (
          <img src={profile.logoUrl} alt={profile.companyName} className="w-20 h-20 object-contain rounded-2xl shadow-sm" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-white shadow-sm flex items-center justify-center">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 overflow-y-auto" style={{ maxHeight: "calc(100% - 144px)" }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black text-foreground leading-tight">{profile.companyName}</h2>
              {profile.isPremium && (
                <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 font-bold text-xs">⭐ Promoted</Badge>
              )}
              {profile.isVerified && (
                <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-xs">✓ Verified</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {profile.industry}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {profile.companySize}
              </span>
            </div>
          </div>
        </div>

        {profile.location && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
            <MapPin className="w-3.5 h-3.5" /> {profile.location}
          </div>
        )}

        <p className="text-sm text-foreground/80 font-light leading-relaxed mb-4 line-clamp-4">
          {profile.description}
        </p>

        {goals.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Looking for</p>
            <div className="flex flex-wrap gap-1.5">
              {goals.map((g) => (
                <Badge key={g} variant="secondary" className="text-xs font-medium">{g}</Badge>
              ))}
            </div>
          </div>
        )}

        {profile.website && (
          <div className="flex items-center gap-1.5 text-xs text-primary mt-3">
            <Globe className="w-3 h-3" />
            <span className="truncate">{profile.website.replace(/^https?:\/\//, "")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Discover() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [filters, setFilters] = useState({ industry: "", companySize: "", partnershipGoal: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [matchModal, setMatchModal] = useState<{ company: string } | null>(null);
  const [paywallModal, setPaywallModal] = useState(false);
  const [localDeck, setLocalDeck] = useState<BusinessProfile[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: myProfile, isLoading: profileLoading } = trpc.profile.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: feed, isLoading: feedLoading, refetch } = trpc.discover.feed.useQuery(
    {
      industry: filters.industry || undefined,
      companySize: filters.companySize || undefined,
      partnershipGoal: filters.partnershipGoal || undefined,
    },
    { enabled: isAuthenticated && !!myProfile }
  );

  const { data: swipeCount = 0 } = trpc.swipe.getCountToday.useQuery(undefined, {
    enabled: isAuthenticated && !!myProfile && !myProfile?.isPremium,
    refetchInterval: 5000,
  });

  const upgradeMutation = trpc.swipe.upgradeToPremium.useMutation({
    onSuccess: () => {
      toast.success("Welcome to Premium! Unlimited swipes unlocked.");
      setPaywallModal(false);
      utils.profile.mine.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (feed && !initialized) {
      setLocalDeck(feed);
      setInitialized(true);
    }
  }, [feed, initialized]);

  const swipeMutation = trpc.swipe.submit.useMutation({
    onSuccess: (result) => {
      if (result.matchCreated) {
        const top = localDeck[0];
        if (top) setMatchModal({ company: top.companyName });
      }
    },
    onError: (e) => {
      if (e.message.includes("Daily swipe limit")) {
        setPaywallModal(true);
      } else {
        toast.error(e.message);
      }
    },
  });

  const handleSwipe = (dir: "right" | "left") => {
    const top = localDeck[0];
    if (!top) return;
    swipeMutation.mutate({ targetProfileId: top.id, direction: dir });
    setLocalDeck((prev) => prev.slice(1));
  };

  const handleRefresh = () => {
    setInitialized(false);
    setLocalDeck([]);
    refetch();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (localDeck.length === 0) return;
      if (e.key === "ArrowRight") handleSwipe("right");
      if (e.key === "ArrowLeft") handleSwipe("left");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [localDeck]);

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Sparkles className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-2xl font-black">Sign in to discover partners</h2>
        <Button asChild><a href={getLoginUrl()}>Sign In</a></Button>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Building2 className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-2xl font-black">Create your profile first</h2>
        <p className="text-muted-foreground font-light">You need a business profile to start discovering partners.</p>
        <Link href="/profile/setup">
          <Button className="font-bold">Create Profile</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative py-8 px-4">
      {/* Geometric accents */}
      <div className="fixed top-24 right-[3%] w-56 h-56 rounded-full bg-blue-100/30 blur-3xl pointer-events-none" />
      <div className="fixed bottom-24 left-[3%] w-44 h-44 rounded-full bg-pink-100/40 blur-3xl pointer-events-none" />

      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-foreground">Discover</h1>
              {myProfile.isPremium && (
                <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 font-bold text-xs">⚡ Unlimited</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-muted-foreground font-light text-sm">
                {localDeck.length} {localDeck.length === 1 ? "company" : "companies"} in your feed
              </p>
              {!myProfile.isPremium && (
                <span className="text-xs text-muted-foreground font-light">({6 - swipeCount} swipes left today)</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="bg-card"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="bg-card" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-6 space-y-4">
            <h3 className="font-bold text-sm text-foreground">Filter Profiles</h3>
            <div className="grid grid-cols-1 gap-3">
              <Select
                value={filters.industry || "all"}
                onValueChange={(v) => { setFilters((f) => ({ ...f, industry: v === "all" ? "" : v })); setInitialized(false); }}
              >
                <SelectTrigger><SelectValue placeholder="All Industries" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Industries</SelectItem>
                  {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={filters.companySize || "all"}
                onValueChange={(v) => { setFilters((f) => ({ ...f, companySize: v === "all" ? "" : v })); setInitialized(false); }}
              >
                <SelectTrigger><SelectValue placeholder="All Sizes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sizes</SelectItem>
                  {COMPANY_SIZES.map((s) => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                </SelectContent>
              </Select>

              <Select
                value={filters.partnershipGoal || "all"}
                onValueChange={(v) => { setFilters((f) => ({ ...f, partnershipGoal: v === "all" ? "" : v })); setInitialized(false); }}
              >
                <SelectTrigger><SelectValue placeholder="All Partnership Types" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Partnership Types</SelectItem>
                  {PARTNERSHIP_GOALS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => { setFilters({ industry: "", companySize: "", partnershipGoal: "" }); setInitialized(false); }}
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Card Stack */}
        {feedLoading ? (
          <div className="flex items-center justify-center h-[480px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : localDeck.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[480px] bg-card rounded-3xl border border-border text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-black text-foreground mb-2">You're all caught up!</h3>
            <p className="text-muted-foreground font-light text-sm mb-6">
              No more profiles to review right now. Check back later or adjust your filters.
            </p>
            <Button variant="outline" className="gap-2 bg-card" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" /> Refresh Feed
            </Button>
          </div>
        ) : (
          <div className="relative h-[480px]">
            {/* Background cards (stack effect) */}
            {localDeck[2] && (
              <div className="absolute inset-0 bg-card rounded-3xl border border-border shadow-sm"
                style={{ transform: "translateY(8px) scale(0.94)", zIndex: 1 }} />
            )}
            {localDeck[1] && (
              <div className="absolute inset-0 bg-card rounded-3xl border border-border shadow-md"
                style={{ transform: "translateY(4px) scale(0.97)", zIndex: 2 }} />
            )}
            {localDeck[0] && (
              <ProfileCard
                key={localDeck[0].id}
                profile={localDeck[0]}
                onSwipe={handleSwipe}
                isTop={true}
              />
            )}
          </div>
        )}

        {/* Action buttons */}
        {localDeck.length > 0 && (
          <div className="flex items-center justify-center gap-6 mt-8">
            <Button
              size="lg"
              variant="outline"
              className="w-16 h-16 rounded-full bg-card border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-500 shadow-md p-0"
              onClick={() => handleSwipe("left")}
              disabled={swipeMutation.isPending}
            >
              <X className="w-7 h-7" />
            </Button>
            <div className="text-center text-xs text-muted-foreground font-light">
              <p>← Pass</p>
              <p className="mt-0.5">Connect →</p>
            </div>
            <Button
              size="lg"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 border-0 shadow-md p-0"
              onClick={() => handleSwipe("right")}
              disabled={swipeMutation.isPending}
            >
              <Heart className="w-7 h-7 text-white" />
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4 font-light">
          Use ← → arrow keys to swipe
        </p>
      </div>

      {/* Match modal */}
      {matchModal && (
        <MatchModal company={matchModal.company} onClose={() => setMatchModal(null)} />
      )}

      {/* Paywall Modal */}
      {paywallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-3xl border border-border shadow-2xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Upgrade to Premium</h2>
            <p className="text-muted-foreground font-light mb-2">
              You've used all 6 daily swipes. Upgrade to Premium for unlimited swipes and boost your profile visibility.
            </p>
            <p className="text-3xl font-black text-primary mb-6">
              $9.99<span className="text-lg font-light text-muted-foreground">/week</span>
            </p>
            <div className="bg-muted rounded-2xl p-4 mb-6 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Unlimited daily swipes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Promoted profile badge</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span>
                  <span>Higher visibility in discovery</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPaywallModal(false)}
              >
                Maybe Later
              </Button>
              <Button
                className="flex-1 font-bold"
                onClick={() => upgradeMutation.mutate()}
                disabled={upgradeMutation.isPending}
              >
                {upgradeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Upgrade Now"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
