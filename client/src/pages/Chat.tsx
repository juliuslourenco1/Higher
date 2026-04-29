import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Send,
  Building2,
  MapPin,
  Users,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { matchId: matchIdStr } = useParams<{ matchId: string }>();
  const matchId = parseInt(matchIdStr ?? "0", 10);
  const { isAuthenticated, loading } = useAuth();
  const [messageText, setMessageText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: myProfile } = trpc.profile.mine.useQuery(undefined, { enabled: isAuthenticated });

  const { data: matchData, isLoading: matchLoading } = trpc.match.get.useQuery(
    { matchId },
    { enabled: isAuthenticated && !!myProfile && matchId > 0 }
  );

  const { data: messages, isLoading: messagesLoading } = trpc.message.list.useQuery(
    { matchId },
    {
      enabled: isAuthenticated && !!myProfile && matchId > 0,
      refetchInterval: 3000,
    }
  );

  const sendMutation = trpc.message.send.useMutation({
    onSuccess: () => {
      setMessageText("");
      utils.message.list.invalidate({ matchId });
    },
    onError: (e) => toast.error(e.message),
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    sendMutation.mutate({ matchId, content: messageText.trim() });
  };

  if (loading || matchLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <h2 className="text-2xl font-black">Sign in to view messages</h2>
        <Button asChild><a href={getLoginUrl()}>Sign In</a></Button>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <h2 className="text-2xl font-black">Match not found</h2>
        <Link href="/matches">
          <Button variant="outline" className="bg-card">Back to Matches</Button>
        </Link>
      </div>
    );
  }

  const partner = matchData.partner;
  const myProfileId = matchData.myProfileId;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Chat header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-4 flex-shrink-0">
        <Link href="/matches">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>

        {partner && (
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-pink-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {partner.logoUrl ? (
                <img src={partner.logoUrl} alt={partner.companyName} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-foreground truncate">{partner.companyName}</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {partner.industry}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {partner.companySize}
                </span>
                {partner.location && (
                  <span className="flex items-center gap-1 hidden sm:flex">
                    <MapPin className="w-3 h-3" /> {partner.location}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Send className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-bold text-foreground">Start the conversation</p>
            <p className="text-sm text-muted-foreground font-light max-w-xs">
              You've matched with {partner?.companyName}. Send a message to kick off your partnership discussion.
            </p>
          </div>
        ) : (
          <>
            {/* Match date header */}
            <div className="flex items-center justify-center">
              <div className="bg-muted text-muted-foreground text-xs font-medium px-3 py-1 rounded-full">
                Matched {formatDistanceToNow(new Date(matchData.createdAt), { addSuffix: true })}
              </div>
            </div>

            {messages.map((msg, i) => {
              const isMe = msg.senderProfileId === myProfileId;
              const showDate = i === 0 || (
                new Date(msg.createdAt).getTime() - new Date(messages[i - 1]!.createdAt).getTime() > 5 * 60 * 1000
              );

              return (
                <div key={msg.id}>
                  {showDate && i > 0 && (
                    <div className="flex items-center justify-center my-3">
                      <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
                        {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                      </div>
                    </div>
                  )}
                  <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card border border-border text-foreground rounded-bl-sm"
                      )}
                    >
                      <p>{msg.content}</p>
                      <p className={cn("text-[10px] mt-1 font-light", isMe ? "text-primary-foreground/70 text-right" : "text-muted-foreground")}>
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Message input */}
      <div className="bg-card border-t border-border px-4 py-3 flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-center gap-3 max-w-3xl mx-auto">
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={`Message ${partner?.companyName ?? ""}...`}
            className="flex-1 bg-muted border-0 focus-visible:ring-1"
            maxLength={5000}
            disabled={sendMutation.isPending}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!messageText.trim() || sendMutation.isPending}
            className="flex-shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
