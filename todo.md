# BizSwipe — B2B Matchmaking Platform TODO

## Database & Backend
- [x] DB schema: businessProfiles table (userId, name, industry, size, description, logo, goals)
- [x] DB schema: swipes table (swiperId, targetId, direction)
- [x] DB schema: matches table (profileAId, profileBId, createdAt)
- [x] DB schema: messages table (matchId, senderId, content, createdAt)
- [x] Apply all migrations via webdev_execute_sql
- [x] tRPC: profile.create / profile.update / profile.get / profile.mine
- [x] tRPC: swipe.submit (right/left) with mutual match detection
- [x] tRPC: match.list (all matches for current user)
- [x] tRPC: message.send / message.list (by matchId)
- [x] tRPC: discover.feed (unreviewed profiles, with filters)
- [x] Owner notification on every new mutual match (in-app + notifyOwner)

## Frontend Pages
- [x] Landing page (hero, CTA, feature highlights — Scandinavian design)
- [x] Profile creation/edit page (form: name, industry, size, description, logo upload, goals)
- [x] Swipe deck page (card stack UI, swipe right/left, keyboard support)
- [x] Filter/preference panel (industry, size, partnership type)
- [x] Matches dashboard page (list of mutual matches with company info)
- [x] Messaging page (chat UI per match)
- [x] Navigation (top nav with auth state)
- [x] Match notification/toast on mutual match

## Design System
- [x] Scandinavian color palette (pale cool gray bg, bold black headings, pastel blue/blush pink accents)
- [x] Typography (bold black sans-serif headings + thin-weight subtitles)
- [x] Abstract geometric decorative shapes as accents
- [x] Responsive layout (mobile-first)

## Auth & Constraints
- [x] Manus OAuth authentication
- [x] One business profile per user account (enforced server + client)
- [x] Discovery feed excludes already-swiped profiles

## Testing
- [x] Vitest: profile creation procedure
- [x] Vitest: swipe + mutual match detection
- [x] Vitest: message send/list


## Caller Higher Rebranding & Verification (New)
- [x] Rename BizSwipe to Caller Higher throughout the app
- [x] Add profileType enum (business, freelance) to businessProfiles table
- [x] Create verificationDocuments table (profileId, documentUrl, documentKey, documentType, uploadedAt, status)
- [x] Add isVerified boolean to businessProfiles table
- [x] tRPC: verification.upload (document upload endpoint)
- [x] tRPC: verification.getDocuments (list uploaded docs for a profile)
- [x] tRPC: verification.status (check verification status)
- [x] Profile creation UI: profile type selector (Business / Freelance/LLC)
- [x] Profile creation UI: document upload section for verification
- [x] Profile card: display verification badge if isVerified = true
- [x] Matches dashboard: show verification badge next to company names
- [x] Discover swipe deck: show verification badge on cards


## Rebranding to "Higher" (Latest)
- [x] Rename "Caller Higher" to "Higher" in NavBar
- [x] Rename "Caller Higher" to "Higher" in Home page
- [x] Rename "Caller Higher" to "Higher" in all page titles and descriptions
- [x] Update project name metadata to "Higher"


## Premium Tier & Swipe Limit (Latest)
- [x] Add isPremium boolean to businessProfiles table
- [x] Add swipe count tracking per day (swipes table with timestamps)
- [x] tRPC: swipe.getCountToday (get today's swipe count for current user)
- [x] tRPC: swipe.checkLimit (check if user has reached 6-swipe limit)
- [x] Discover page: show paywall modal after 6 swipes
- [x] Paywall modal: display premium benefits and upgrade CTA
- [ ] Stripe integration for premium subscription (optional — demo mode active)
- [x] tRPC: profile.upgradeToPremium (set isPremium=true after payment)
- [x] Discover page: show "Unlimited Swipes" badge for premium users
- [x] Profile card: show "Promoted" badge for premium profiles in discovery


## Delete Profile & Work Posts (New)
- [x] DB schema: posts table (profileId, title, description, hourlyRate, createdAt, updatedAt)
- [x] tRPC: profile.delete (soft delete or hard delete with cascade)
- [x] tRPC: post.create (create work post with hourly rate)
- [x] tRPC: post.list (list all posts for a profile)
- [x] tRPC: post.delete (delete a post)
- [x] Profile page: add "Delete Profile" button with confirmation modal
- [x] Profile page: add "Create Post" button and form
- [x] Posts list view on profile (show title, description, hourly rate)
- [ ] Edit post functionality
- [ ] Display posts on matched partner profiles
