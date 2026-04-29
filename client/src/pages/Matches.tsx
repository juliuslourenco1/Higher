import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { Loader2, Heart, Building2, MessageSquare, MapPin, Users, Sparkles } from "lucide-react";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow } from "date-fns";

export default function Matches() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const { data: myProfile, isLoading: profileLoading } = trpc.profile.mine.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: matches, isLoading: matchesLoading } = trpc.match.list.useQuery(undefined, {
    enabled: isAuthenticated && !!myProfile,
    refetchInterval: 15000,
  });

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
        <Heart className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-2xl font-black">Sign in to see your matches</h2>
        <Button asChild><a href={getLoginUrl()}>Sign In</a></Button>
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <Building2 className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-2xl font-black">Create your profile first</h2>
        <Link href="/profile/setup">
          <Button className="font-bold">Create Profile</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative py-10 px-4">
      {/* Geometric accents */}
      <div className="fixed top-24 right-[5%] w-52 h-52 rounded-full bg-pink-100/30 blur-3xl pointer-events-none" />
      <div className="fixed bottom-32 left-[3%] w-40 h-40 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-foreground">Matches</h1>
            <p className="text-muted-foreground font-light">
              {matches?.length ?? 0} mutual {(matches?.length ?? 0) === 1 ? "match" : "matches"}
            </p>
          </div>
          <Link href="/discover">
            <Button variant="outline" className="gap-2 bg-card font-semibold">
              <Sparkles className="w-4 h-4" /> Discover More
            </Button>
          </Link>
        </div>

        {matchesLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !matches || matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-3xl border border-border">
            <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center mb-5">
              <Heart className="w-10 h-10 text-pink-300" />
            </div>
            <h3 className="text-xl font-black text-foreground mb-2">No matches yet</h3>
            <p className="text-muted-foreground font-light text-sm max-w-xs mb-6">
              Start swiping to find companies that are interested in partnering with you.
            </p>
            <Link href="/discover">
              <Button className="font-bold gap-2">
                <Sparkles className="w-4 h-4" /> Start Discovering
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => {
              const partner = match.partner;
              if (!partner) return null;
              let goals: string[] = [];
              try { goals = JSON.parse(partner.partnershipGoals); } catch {}

              return (
                <div
                  key={match.id}
                  className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all hover:border-primary/30 group"
                >
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {partner.logoUrl ? (
                        <img src={partner.logoUrl} alt={partner.companyName} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-7 h-7 text-primary" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg text-foreground leading-tight">{partner.companyName}</h3>
                            {partner.isPremium && (
                              <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border-purple-200 font-bold text-xs">⭐ Promoted</Badge>
                            )}
                            {partner.isVerified && (
                              <Badge className="bg-green-100 text-green-700 border-green-200 font-bold text-xs">✓ Verified</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {partner.industry}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" /> {partner.companySize}
                            </span>
                            {partner.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {partner.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" />
                          <span className="text-xs text-muted-foreground font-light">
                            {formatDistanceToNow(new Date(match.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground font-light mt-2 line-clamp-2">
                        {partner.description}
                      </p>

                      {goals.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {goals.slice(0, 3).map((g) => (
                            <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                          ))}
                          {goals.length > 3 && (
                            <Badge variant="outline" className="text-xs">+{goals.length - 3}</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-current" /> Mutual Match
                    </span>
                    <Link href={`/chat/${match.id}`}>
                      <Button size="sm" className="gap-2 font-semibold">
                        <MessageSquare className="w-3.5 h-3.5" /> Message
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
