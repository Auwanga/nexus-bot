# 19 Mobile UI Design — Kinetic (React Native + Expo)

**Status:** design spec for the mobile build. Not implemented, not shipped. Here, [AGREED] means documented in the earlier advisory pack, not evidence of a shipped feature or separate approval of every detail.
**Audience:** Auwanga building Kinetic mobile.
**Depends on:** 04 (onboarding), 07 (rich UI), 14 (Briefing Pages), 15 (action verification), 16 (peer threads), 17 (message collapse), 18 (agent templates).

> [!warning] What "the Nexus design" means here
> No standalone Nexus visual spec was found: no colour palette, font, logo, or screen mockups in the pack docs, memory, or searchable transcripts. What we do have is the **agreed interaction design** in docs 04/07/14–18, where "Nexus" is the chat agent (e.g. "you ↔ Nexus/Kinetic" in 16). Every rule tagged **[AGREED]** comes from those docs. Every rule tagged **[PROPOSED]** (including all colour and spacing tokens) is a new recommendation for mobile. Change those freely.

---

## 1. Product truth [AGREED]
- Kinetic is a **personal agent you talk to**, not a CRM wizard. Onboarding is a conversation with no forms for pipelines, fields, or seats (04).
- The structure is **one Primary agent plus optional specialists picked from curated templates**. Nobody creates an agent from a blank prompt (18).
- **Chat text stays short. Structured work goes in cards** (07). Long deliverables become **Briefing Pages** (14).
- Any send or destructive action appears first as a **Confirm card**. "Approved" does not mean "Sent"; success copy only comes from a verified receipt (15).
- Agent↔agent work shows up as **peer chips** that open a **Peer Thread** with a ⟷ header (16).
- Long text bubbles collapse with a fade and **Show more** (17). Cards never collapse.
- Must work offline in local/on-prem builds: no remote fonts, CDNs, or analytics (07).

## 2. Visual language [PROPOSED unless noted]
- Calm and workspace-like, close to the Grok Bot reference the docs keep citing [AGREED as reference]: a neutral background, bubbles for user messages only, agent text on the page or in a soft surface, and cards with a 1px border.
- One accent colour for primary actions and Primary-agent identity. Each specialist gets its own `accent` for its avatar fallback (16 `AgentProfile.color/accent` [AGREED field]).
- Fonts are system fonts only (SF Pro / Roboto). This meets the "no remote fonts" rule [AGREED constraint].
- Icons come from a bundled icon set (e.g. `@expo/vector-icons`), never a CDN.

### Design tokens [PROPOSED — no sourced values exist]
| Token | Light | Dark |
|---|---|---|
| bg | #FFFFFF | #0E0F12 |
| surface (agent bubble/card) | #F5F6F8 | #17191E |
| surfaceRaised (sheets) | #FFFFFF | #1E2128 |
| border | #E4E6EB | #2A2D35 |
| text | #111318 | #F2F3F5 |
| textMuted | #6B7280 | #9AA0AA |
| accent (Primary) | #2563EB | #5B8DEF |
| userBubble | #2563EB / text #FFF | #2F4FA8 / text #FFF |
| success | #16A34A | #22C55E |
| warning ("Needs you") | #D97706 | #F59E0B |
| danger | #DC2626 | #F87171 |

| Scale | Values |
|---|---|
| Spacing | 4, 8, 12, 16, 20, 24, 32 |
| Radius | chip 999, bubble 18, card 14, sheet 20 (top) |
| Type | caption 12/16, meta 13/18, body 16/22, title 18/24 semibold, h1 24/30 bold |
| Touch target | ≥ 44pt [AGREED for Show more in 17; PROPOSED app-wide] |
| Motion | 150–200ms ease [AGREED for collapse in 17; PROPOSED app-wide]; honour Reduce Motion |

## 3. Navigation shell [PROPOSED]
The app is chat-first, with no tab bar in v1. Everything opens from the chat.
```
Stack (root)
├─ Onboarding (conversation flow; resumable)          [04]
├─ Chat (Primary agent)  ← home
│   ├─ Peer Thread  (modal/full-screen)               [16]  kinetic://peer/{channel_id} [AGREED deep link]
│   ├─ Page Reader  (full-screen)                     [14]
│   ├─ Card detail / Confirm edit (bottom sheet)      [07]
│   └─ Provenance "Why am I seeing this" (sheet)      [07]
├─ Agents (roster + Add from templates gallery)       [18] Settings → Agents → Add [AGREED]
├─ Memory (what I know, receipts, conflicts)          [03/07]
├─ Connectors                                          [06]
└─ Settings
```
- Chat header: Primary avatar and name in the centre, a **menu** button on the left that opens a drawer (Agents, Memory, Connectors, Settings), and a "new/agenda" button on the right (optional).
- An **Expo Router** file layout is suggested: `app/(onboarding)`, `app/chat`, `app/peers/[channelId]`, `app/pages/[pageId]`, `app/agents`, `app/memory`, `app/connectors`, `app/settings`.

## 4. Screens

### 4.1 Onboarding [AGREED flow; PROPOSED layout]
Flow: Hello → Name → Role seed → Dump everything → Master Memory refine → Optional connectors → Ready → (8) Add specialists? → (9) Team roster.
- It is the same chat screen as the main app, with agent turns and quick-reply chips. It is **not** a form wizard.
- A thin top progress bar shows 7 dots (PROPOSED) and stays out of the way.
- **Dump:** the composer `+` opens Paste / Files / Photos / Camera. Each item shows a progress row, then a **Memory receipt card** (counts, top facts, conflicts) with Accept all / Review / Discard.
- **Refine:** a prompt accept/edit card shows before/after rows with Accept / Edit / Not now.
- **Connectors:** a list of opt-in rows, each with a plain statement of what it reads and what it can send. **"Skip for now" is the highlighted default** [AGREED]. Cloud connectors are hidden in on-prem no-egress mode.
- **Ready:** a "What I know" summary card plus 3 suggested first-task chips.
- **Team:** "Add specialists?" opens the template gallery. Skip is fine.
- Anti-patterns [AGREED]: asking for WhatsApp first, defining pipeline stages up front, requiring a cloud account in local mode.

### 4.2 Main chat [AGREED rules; PROPOSED layout]
```
┌ [≡]      (● Kinetic)        [⋯] ┐
│ ── Today ──                      │
│ Agent text (on surface, no tail) │
│ ┌ Card (Confirm / Invoice …) ──┐ │
│ └──────────────────────────────┘ │
│           [user bubble, accent]  │
│ ┌ Message from Cortana · CSO  ┐ │ ← peer chip
│ │ preview…            Needs you│ │
│ └──────────────────────────────┘ │
│ [chip] [chip] [chip]             │ ← follow-ups (3–5 after Page)
├──────────────────────────────────┤
│ [+]  Message Kinetic…     [mic][↑]│
└──────────────────────────────────┘
```
- The list is an inverted FlatList/FlashList with day separators. It keeps scroll position when returning from a Peer Thread or Page [AGREED in 16].
- Composer: a multiline input growing to 5 lines and then scrolling, a `+` attach button, an optional mic, and Send. It stays above the keyboard (`KeyboardAvoidingView` / keyboard-controller). Send turns into Stop while a reply streams.
- Streaming: a typing indicator, then text painting. Collapse is evaluated only after the message is `done` (or with a 300ms debounce) [AGREED in 17].

### 4.3 Cards [AGREED set from 07]
[PROPOSED anatomy, based on the agreed card contract] Every card contains: a title row (icon + type), a body, an action row (max 3 buttons, primary on the right), and a "Why am I seeing this" link that opens the provenance sheet. Every card also carries `fallback_text` for accessibility.

| Card | Mobile notes |
|---|---|
| Confirm | Shows action, target, **exact content**, and reversible flag. Buttons: Approve (accent), Edit (opens sheet), Reject. After Approve the card shows "Sending…" and then the receipt state, never a bare "Done" [15]. |
| Action failed / receipt | Status pill (Sent / Failed / Retrying), attempts, error. Buttons: Retry, Change recipient, Cancel. |
| Memory receipt | Counts row, up to 3 top facts, conflict count badge. |
| Prompt refine | Before/after diff rows. |
| Agenda | Time-ordered rows with Done / Snooze swipe actions (PROPOSED swipe). |
| Catalogue, Invoice, Contact, Deal | Compact summary in chat; tap opens a detail sheet. |
| Briefing Page | Icon + title (≤ 80 chars) + muted "Page" label. Tapping opens the Reader. |
| Peer chip | See 4.4. |

### 4.4 Peer chip + Peer Thread [AGREED from 16]
- **Chip:** eyebrow `Message from` (outbound: `Sent to` / `Update for`) + `{name} · {title}` + a 1–2 line preview. The **whole chip is tappable**. With `priority: true` it shows the "Needs you" treatment (warning colour + badge). FYI chips are quiet.
- **Thread screen:** opens as a full-screen modal. **The header turns into a pill: `(● Primary) ⟷ (● Peer)`** with names and short titles underneath. The bidirectional arrows signal the mode change from user↔agent to agent↔agent. The left side is always the Primary agent.
- Messages appear oldest to newest with avatar, name, body, timestamp, and day headers.
- **There is no composer.** The user does not type into the peer channel in v1.
- A sticky centred **Close Chat** footer returns to the main chat with scroll restored. Android back and swipe-down do the same.
- Accessibility label: `Conversation between {A} and {B}`. Priority chips never auto-open.
- [PROPOSED mobile] Use a 28pt avatar pair with the ⟷ glyph at 18pt in textMuted, and a pill background in `surface`.

### 4.5 Page Reader [AGREED from 14]
- Full-screen, with a back button, the title, and a share/export menu on the right.
- Order: H1, lead paragraph, 1–2 callouts (info / warning / success), "On this page" TOC (when there are 4 or more H2s), body, footer meta.
- Renders `> [!info]` / `[!warning]` / `[!success]` callouts and tables. Wide tables scroll horizontally (PROPOSED).
- Follow-up chips are pinned at the bottom (PROPOSED placement) or shown under the card in chat [AGREED].
- The full Markdown is never pasted into the chat bubble.

### 4.6 Message collapse [AGREED in 17, with a refinement]
- Collapsed height is **280pt**, with a **56–72pt** bottom gradient from transparent to the bubble colour. **Show more ▾** sits inside the bubble and expands in place; **Show less ▴** collapses it. Cards never collapse.
- Agent length budget: ≤ 500 chars by default. Above about 1,200 chars, use a Page instead.

> [!info] Refinement (resolves a contradiction in 17) [PROPOSED]
> Doc 17 says collapse on ">700 chars **or** >12 lines **or** >280px". Taken literally, the char trigger shows a "Show more" on a 750-char message that fits in 260px and has nothing hidden. **Measured overflow is authoritative:** collapse only when the unclipped rendered height is greater than 280 logical layout units (measure the full inner content, not the already-clipped container). Twelve lines is a planning approximation, not an independent trigger; rich Markdown has headings, margins, and code blocks. Use the char count (>700, or >500 when content width < 360pt) **only** as a pre-measure hint to render collapsed on first paint and avoid a jump. Once measured, if the content fits, remove the fade and the control.

- The control is `accessibilityRole="button"` with `accessibilityState={{expanded}}`. When collapsed, the label reads "Collapsed. Show more to read full message."
- Fade: use `expo-linear-gradient`, positioned absolutely above the Show more row.

### 4.7 Agents & templates gallery [AGREED model from 18; templates are a proposal, not shipped]
- The roster lists Primary (always first, cannot be removed) followed by specialists.
- **Add** opens a gallery grid (2 columns) of template cards: icon, name, one-line purpose, suggested connectors, and an "Add" button. There is **no free-text "create any agent" entry** [AGREED].
- v1 templates: Commerce, Accounting, Operations, Sales, Documents. Research and Front desk sit behind a flag.
- Add flow: template card → short sheet (name the agent, optional accent, what it can and cannot do, connectors needed) → Create → its intro message arrives as a peer chip.
- Gallery cards are recommended/highlighted based on the business shape inferred from the role seed; none are created or granted access until the user chooses [AGREED].

### 4.8 Memory, permissions, connectors [AGREED principles; PROPOSED layout]
- **Memory:** a "What I know" list of facts grouped by identity, business, customers, and catalogue. Each fact shows its source (dump, chat) and can be edited or deleted. Conflicts appear at the top with a resolve action.
- **Permissions:** per agent, show "can read" and "can draft" toggles. Sending is always gated by Confirm, and the toggle can't remove that gate.
- **Connectors:** each row shows status (Connected / Not connected / Error), what it reads, what it can send, and Connect / Disconnect. When a connector is missing, the agent says so and offers a draft. It never pretends to have sent anything [AGREED in 15 / persona rules].

### 4.9 Loading, offline, errors, accessibility [PROPOSED unless noted]
- Loading: skeleton cards. No full-screen spinners after first launch.
- Offline: distinguish internet loss from runtime unavailability. If the configured local runtime is reachable, chat continues locally; only cloud connectors show unavailable. If a hosted runtime is unreachable, show "Offline — your message is saved on this device" and a pending indicator. Never claim a queued message has been delivered. **External actions are never auto-retried without the receipt rules in 15.**
- Errors: shown inline as a receipt/failed card with Retry. No toasts for failed sends.
- Accessibility: Dynamic Type up to 200% (collapse height scales with font), VoiceOver/TalkBack labels from card `fallback_text` [AGREED], contrast ≥ 4.5:1, and Reduce Motion support.

## 5. Cursor implementation brief (paste-ready)
```
Build the Kinetic mobile UI shell in React Native with Expo (current stable SDK; use Expo Router, TypeScript). UI only, fixture data, no backend.
Follow docs 04,07,14,15,16,17,18 and 19_MOBILE_UI_DESIGN.md.
1. Theme: tokens from 19 §2 (light/dark via useColorScheme), system fonts, bundled icons only, no remote assets.
2. Routes: (onboarding), chat, peers/[channelId], pages/[pageId], agents, memory, connectors, settings. Deep link kinetic://peer/{channelId}.
3. Chat: inverted list, day separators, agent text on surface, user bubbles accent, keyboard-safe composer (+ attach, send/stop), follow-up chips.
4. Cards (typed union from 07): confirm, receipt/failed, memory_receipt, prompt_refine, agenda, invoice, contact, deal, catalogue, page, peer_chip. Each with actions, fallback_text, "Why am I seeing this" sheet. Confirm Approve -> "Sending…" -> receipt; never render "Done" without a receipt.
5. Peer Thread: full-screen modal, header pill (Primary avatar ⟷ Peer avatar + names/titles), read-only list, sticky "Close Chat", restores chat scroll; priority chip "Needs you".
6. Page Reader: H1, lead, callouts [!info|warning|success], TOC when ≥4 H2, tables h-scroll, footer meta.
7. CollapsibleText: measured full-content overflow (>280 logical layout units; ~12 lines is only an estimate) is authoritative; >700 chars (>500 if width<360) only as first-paint hint; expo-linear-gradient fade 64pt; Show more/Show less button with accessibilityState.expanded; cards never collapse; evaluate after stream done.
8. Onboarding as chat with quick replies; connectors step "Skip for now" default; Ready card + 3 task chips; optional template gallery.
9. Agents: roster + template gallery (commerce, accounting, operations, sales, documents); no free-text agent creation.
10. Offline banner, skeletons, a11y labels. Do not pin package versions by guess; use `npx create-expo-app@latest` and `npx expo install` for deps.
```

## 6. Mobile acceptance checks [PROPOSED; extends 11/16/17]
- Tapping a peer chip opens a thread with the ⟷ header. Close Chat returns to the same scroll position.
- A 750-char message that fits within 280pt shows **no** Show more. A 400-char message with many line breaks that exceeds 280pt **does** collapse.
- Confirm → Approve never shows "Sent" without a receipt fixture.
- The gallery has no free-text create option.
- Airplane mode shows the banner, and the app renders with no network fonts.

## 7. Source trail & evidence gaps
**Sources used (all in `/workspace/clients/kinetic/`):** `04_ONBOARDING_FLOW.md` (flow, anti-patterns), `07_RICH_UI.md` (card contract, card list, offline rule), `14_BRIEFING_PAGES_PROMPT.md` (Page card, reader order, callouts, chips), `15_ACTION_VERIFICATION_AND_RETRY.md` (the Nexus "Done" incident, receipts), `16_AGENT_PEER_THREADS.md` (chip, ⟷ header, Close Chat, deep link), `17_MESSAGE_COLLAPSE.md` (thresholds, fade, a11y), `18_AGENT_TEMPLATES.md` (templates, gallery, roster).
**Searched with no results:** bot memory and shared user memory ("Nexus", "Nexus UI design colors layout") and this session's transcript search.
**Gaps:** no recovered Nexus colours, typography, logo, iconography, or screen mockups. All tokens and layouts tagged [PROPOSED] are new. If the original Nexus web app or Figma exists, take tokens from it and replace §2.
