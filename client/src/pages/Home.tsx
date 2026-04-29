import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Zap, Shield, MessageSquare, Heart, Compass } from "lucide-react";

function GeoShape({ className }: { className?: string }) {
  return <div className={className} aria-hidden="true" />;
}

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const { data: myProfile } = trpc.profile.mine.useQuery(undefined, { enabled: isAuthenticated });

  const features = [
    {
      icon: Compass,
      title: "Smart Discovery",
      desc: "Browse curated business profiles filtered by industry, size, and partnership goals.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: Zap,
      title: "Instant Matching",
      desc: "When two companies both swipe right, a mutual match is created automatically.",
      color: "bg-pink-50 text-pink-600",
    },
    {
      icon: MessageSquare,
      title: "Direct Messaging",
      desc: "Matched businesses can communicate directly through our built-in messaging system.",
      color: "bg-teal-50 text-teal-600",
    },
    {
      icon: Shield,
      title: "Verified Profiles",
      desc: "Every account is tied to one verified business profile for trusted interactions.",
      color: "bg-amber-50 text-amber-600",
    },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Geometric accent shapes */}
      <GeoShape className="fixed top-20 right-[8%] w-64 h-64 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />
      <GeoShape className="fixed top-60 left-[5%] w-48 h-48 rounded-full bg-pink-100/50 blur-3xl pointer-events-none" />
      <GeoShape className="fixed bottom-40 right-[15%] w-56 h-56 rounded-full bg-blue-50/60 blur-2xl pointer-events-none" />

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-4">
        <div className="container max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground rounded-full px-4 py-1.5 text-sm font-medium mb-8">
            <Heart className="w-3.5 h-3.5 text-pink-500" />
            B2B Matchmaking, Reimagined
          </div>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground mb-6 leading-[1.05]">
            Find your next
            <br />
            <span className="text-primary">business partner</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground font-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Higher connects companies through an intuitive swipe-based interface.
            Discover partners, investors, and collaborators — one swipe at a time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {loading ? null : isAuthenticated ? (
              myProfile ? (
                <Link href="/discover">
                  <Button size="lg" className="gap-2 font-bold text-base px-8">
                    Start Discovering <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link href="/profile/setup">
                  <Button size="lg" className="gap-2 font-bold text-base px-8">
                    Create Your Profile <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )
            ) : (
              <>
                <Button asChild size="lg" className="gap-2 font-bold text-base px-8">
                  <a href={getLoginUrl()}>
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="font-semibold text-base px-8 bg-card">
                  <a href={getLoginUrl()}>Sign In</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-card/60 py-10">
        <div className="container max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            { value: "10K+", label: "Companies" },
            { value: "4.2K", label: "Matches Made" },
            { value: "18", label: "Industries" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-black text-foreground">{s.value}</p>
              <p className="text-sm text-muted-foreground font-light mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
              Everything you need
            </h2>
            <p className="text-muted-foreground font-light text-lg max-w-xl mx-auto">
              A complete platform for discovering, matching, and communicating with business partners.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${color}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground font-light leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 bg-card/40 border-y border-border">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">How it works</h2>
            <p className="text-muted-foreground font-light text-lg">Three simple steps to your next partnership.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create your profile", desc: "Set up your company profile with industry, size, and partnership goals." },
              { step: "02", title: "Swipe & discover", desc: "Browse companies and swipe right on ones you'd like to connect with." },
              { step: "03", title: "Match & message", desc: "When both parties swipe right, you're matched and can start chatting." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary font-black text-lg flex items-center justify-center mx-auto mb-5">
                  {step}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
                <p className="text-muted-foreground font-light text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <div className="container max-w-2xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-4">
            Ready to find your match?
          </h2>
          <p className="text-muted-foreground font-light text-lg mb-10">
            Join thousands of companies already using BizSwipe to build meaningful partnerships.
          </p>
          {!isAuthenticated && (
            <Button asChild size="lg" className="gap-2 font-bold text-base px-10">
              <a href={getLoginUrl()}>
                Start for Free <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
              <Heart className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="font-black text-sm text-foreground">BizSwipe</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 BizSwipe. B2B Matchmaking Platform.</p>
        </div>
      </footer>
    </div>
  );
}
