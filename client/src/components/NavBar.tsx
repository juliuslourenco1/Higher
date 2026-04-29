import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { Briefcase, Heart, Compass, LogOut, User, Settings } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const { data: myProfile } = trpc.profile.mine.useQuery(undefined, { enabled: isAuthenticated });

  const navLinks = [
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/matches", label: "Matches", icon: Heart },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-black text-xl tracking-tight text-foreground">
            Higher
          </span>
        </Link>

        {/* Nav links (authenticated) */}
        {isAuthenticated && myProfile && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "gap-2 font-medium",
                    location === href && "bg-muted text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Button>
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Mobile nav */}
              {myProfile && (
                <div className="flex md:hidden items-center gap-1">
                  {navLinks.map(({ href, icon: Icon }) => (
                    <Link key={href} href={href}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(location === href && "bg-muted")}
                      >
                        <Icon className="w-4 h-4" />
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                        {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="font-semibold text-sm truncate">{user?.name ?? "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
                  </div>
                  <DropdownMenuSeparator />
                  {myProfile ? (
                    <Link href="/profile/setup">
                      <DropdownMenuItem className="gap-2 cursor-pointer">
                        <Settings className="w-4 h-4" /> Edit Profile
                      </DropdownMenuItem>
                    </Link>
                  ) : (
                    <Link href="/profile/setup">
                      <DropdownMenuItem className="gap-2 cursor-pointer">
                        <User className="w-4 h-4" /> Create Profile
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => logout()}
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild className="font-semibold">
              <a href={getLoginUrl()}>Sign In</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
