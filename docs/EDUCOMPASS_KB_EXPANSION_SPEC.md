# EduCompass / Abdul Bari — Knowledge Base & Routing Expansion Spec

**For**: Claude Opus 4.6 (implementing agent)
**Owner**: Hurraim (EduCompass team, NEDUET CISE)
**Project state**: Last stages. A broken chatbot is the worst outcome. Every change must be additive, reversible, and tested.

---

## 0. Ground rules (read first, obey always)

1. **Do not hallucinate.** Anything not in this file, the repo, or the database is *unknown*. Unknown means: do not write it as a fact, do not seed it as a live answer. Put it on the "needs verification" list in the final report instead.
2. **Read before you change.** Phase 0 is read-only. Report what you found before editing anything.
3. **Additive only.** Do not remove or rewrite existing persona text, avatar state logic, PII scrubbing (Rule 3), hard LLM limits (Rule 4), offline independence (Rule 5), the `DISTRESS` handler, or the disclaimer (Rule 13). Extend them; never loosen them.
4. **Rule 2 applies to everything you seed.** New answers go in as drafts and only go live after Hurraim approves. Roman Urdu answers written by you are drafts by definition.
5. **No secrets in code, docs, logs or commits.** Never copy an API key or fragment into any file. Never print one in test output.
6. **Feature-flag new behaviour** (`KB_V2` or similar) so it can be switched off in one place. Old behaviour must remain reachable.
7. **Run the existing tests (and the regression table in §11) before and after each phase.** If something that worked before breaks, stop and revert that phase.
8. If you cannot read a file, cannot find a function, or a statement here contradicts the repo: **stop and tell Hurraim**. Do not guess.

---

## 1. What is being built (the goal, in Hurraim's terms)

- Abdul Bari must understand **many phrasings** of the same question, in **English and Roman Urdu**, including spelling mistakes (e.g. "Fakra" for Dr. Fakhra Aftab).
- "Who is Dr. X?" must produce a **real sentence from the faculty data** (18 professors), not just a card of links.
- A stressed or panicking student gets **one motivating line first, then the actual answer** they need.
- If the student writes in Roman Urdu, the answer comes back in **Roman Urdu**.
- Many more portal-style questions are covered **only where verified data exists**. Where it doesn't, the bot gives a specific, honest redirect and logs the question.
- The fallback and API chain must work and fail gracefully.

---

## 2. Verified facts (usable as live answers)

Confirmed by Hurraim from the official syllabi document and CISE Board notices:

| Fact | Value |
|---|---|
| Total credit hours | 136 CH over 8 semesters |
| Course nodes | 53 (theory + practical labs) |
| Minimum passing grade | D (1.0 grade point, 50% marks) |
| Minimum graduation CGPA | 2.00 |
| Retake policy | Higher grade replaces the earlier grade in CGPA calculation |
| Semester credit ceiling | 18 CH regular; 21 CH overload with Chairman approval |
| Prerequisite rule | Failed prerequisite locks downstream dependent courses until passed |
| FYP | CS-406 Part I in Semester 7 (3 CH), Part II in Semester 8 (3 CH) |
| Faculty | 18 published profiles (table in the main spec; **the database is the source, not that table**) |
| FYP data | 68 reviewed projects, 2022–2025 (`fyp_projects`) — compute counts from the DB at runtime |
| Career tracks | 12 (listed in §10, G12) — compute from `docs/data/career_tracks.json` / DB |

### 2.1 Things in the old spec that are NOT confirmed — do not seed as live

- Full grade-point scale (A 4.0, A- 3.7, B+ 3.4 …). Only "D = 1.0 = minimum pass" is confirmed.
- Dean's Honor List criteria (3.50 / zero backlogs).
- "Both attempts appear on the transcript" (retake answer A03). Only "higher grade replaces" is confirmed.
- "Academic warning or probation" below 2.00 (A01).
- FYP "team of 3–4 students" and "proposals evaluated by the FYP Committee on …" (C01/C02).
- Prerequisite chains written as prose in the old spec. **Derive chains from `docs/data/ned_cse_course_chart.json` / the `courses` table, never from prose.** Specifically: the old spec's B02 says `CS-115 → CS-116 → CS-218 → CS-222 → CS-406`, Hurraim's later notes say `… CS-218 → CS-222 → CS-323 → CS-406`, and CS-222 may not be "Algorithms" at all. These three statements disagree. Resolve from the course JSON and report the result.
- "Gemini 1.5 Flash" and "Grok-Beta" as current model IDs (see §9).

Mark each of these rows `needs_verification` in your final report. Seed them only after Hurraim confirms.

---

## 3. Findings in the current code (what's actually wrong)

Based on the code Hurraim pasted (`usePersona.ts`, `matchLayer1Preloaded`, `retrieveContext`). You have not necessarily seen the response-assembly code in `chat.ts` — read it in Phase 0.

| # | Where | Problem | Effect | Severity |
|---|---|---|---|---|
| F1 | `detectLanguage` | Uses `lower.includes(marker)` (substring). `'thi'` matches "this", `'tha'` matches "that", `'hai'` matches "chair", `'aap'` matches "aapke"/"snap". Needs ≥2 hits. | Plain English sentences ("is this the one that…") get classified as Roman Urdu. Answers will switch language wrongly once language-aware replies exist. | High |
| F2 | `MYSTERY_PATTERNS['P-GRAD']` = `/graduat/` | Matches any academic question containing "graduate". | "Minimum CGPA to graduate" (Layer 1 intent A01) is intercepted by the persona gate and never reaches the server. | High |
| F3 | `P-TIME` `/how.?long/`, `P-BATCH` `/which.?batch/`, `P-ID` `/roll.?number/`, `P-STORY` `/offers/` | Over-broad; persona patterns run before academic ones. | "How long is the FYP?", "which batch…", "course offers…" can be answered as Abdul's backstory. | High |
| F4 | `S-CAN` includes bare `help.?me` | Any "help me with prerequisites" is treated as "what can you do". | Real questions get a generic capabilities reply. | High |
| F5 | `S-STRESS` | Only `i.?m.?stressed|i.?m.?failing|scared|dar.?lag.?raha|backlog.?ho.?gaya|fail.?ho.?gaya`. | "I am stressed", "I'm panicking", "I'm so tired of this", "bohat tension hai", "ghabra gaya" all miss it and fall through to the academic pipeline. | High |
| F6 | `matchLayer1Preloaded` | First substring hit wins; DB rows are checked in table order; `confidence_threshold` is selected but never used; no `is_active` filter. | Wrong/loose matches; inactive or draft rows would go live immediately (violates Rule 2). | High |
| F7 | `matchLayer1Preloaded` | Reads the whole `chatbot_answers` table on every query. | Latency and DB load. Cache with a short TTL. | Medium |
| F8 | `retrieveContext` | Splits query into words and matches each word with `ilike` independently; max 3 terms; the professors table is fetched **inside the per-term loop** (up to 3 identical fetches); no fuzzy matching; no title stripping ("dr", "ms"); no "who is" intent. | "Fakra" matches nothing; "aftab" works by luck. Result is a list of sources, not an answer. | High |
| F9 | Layer 2 output | `retrieveContext` returns snippets + `sources`; it does not compose an answer sentence. When the LLM is off/over budget, the user sees only source cards. | This is the "it just shows where things are" behaviour. | High |
| F10 | Roman Urdu | Only a few normalisers; no spelling variants; `chatbot_answers` has no language column. | Roman Urdu paraphrases miss; answers can't be stored per language. | High |
| F11 | `DISTRESS` pattern | Roman Urdu coverage is a single phrase (`marna chahta`). | Possible missed distress messages. **Handle with care** — see §7.5. | High (safety) |
| F12 | Old spec | Says a 100-intent bank; only 14 intents are listed. Says `chatbot_answers` drafts use `status: 'extracted'`, but the schema shown has **no `status` column**. | Unknown real state of the bank; drafts can't be staged as described unless a column exists. | Medium |

---

## 4. Phase plan (do in order; stop at each gate)

### Phase 0 — Read-only audit (no edits)

Produce a short report to Hurraim covering:

1. Read `apps/web/src/components/abdul/usePersona.ts`, `apps/api/src/routes/chat.ts` **in full** (especially the part that decides what the HTTP response contains), `faq-matcher.ts`, `abdul-bari.persona.json`, `STATIC_PRELOADED_ANSWERS`, and the Layer 3 gateway.
2. Query the real schema of `chatbot_answers`, `chatbot_unanswered`, `llm_usage`, `professors`, `courses`, `fyp_projects`, `career_tracks`. Report actual column names (the old spec's CREATE TABLE statements may be outdated).
3. Count real rows in `chatbot_answers` and `STATIC_PRELOADED_ANSWERS`. Export them to a file for reference. **Do not overwrite or delete any.**
4. List the actual 18 professor rows (`name`, `title`, `rank`, `department`, `research_areas`, `domain_tags`, `review_status`). Note which field holds designations like "Director ISL".
5. Confirm whether instructors per course exist anywhere in the data. (The tables listed do not seem to have it.)
6. Confirm CS-222's real title and the real prerequisite chains from the course JSON.
7. Run the existing test suite and record the baseline.

**Gate:** send the report. Continue only after it is acknowledged, unless you find nothing that contradicts this spec.

### Phase 1 — Schema and staging safety

Make this change first, because everything else seeds data.

- Make `matchLayer1Preloaded` select only rows where `is_active = true` (and the review/status column, if the real schema has one, is in `approved`/`published`). Ensure **existing rows keep behaving identically** (verify they are all `is_active = true` before enabling the filter, or the live bot will lose answers).
- Additive migration, nullable/defaulted so existing rows are untouched:
  - `language VARCHAR(8) DEFAULT 'en'` (`'en'` | `'ru'`)
  - `review_status` (or reuse the existing status column if one exists) with a draft value
  - `intent_id VARCHAR(50)` to group the English and Roman Urdu rows of one intent
  - `tone_hint VARCHAR(20)` optional (`'plain'`, `'emotional'`) — only if the persona layer needs it
- All seed rows from §10 are inserted as **draft / `is_active = false`**.

### Phase 2 — Client gate fixes (`usePersona.ts`)

Keep every existing response text. Change only detection.

**2.1 Fix language detection (F1)** — token matching, not substring:

```ts
const RU_MARKER_SET = new Set([ /* existing markers + §6 additions */ ]);
export function detectLanguage(query: string): 'en' | 'ru' {
  const tokens = query.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const hits = tokens.filter(t => RU_MARKER_SET.has(normalizeRU(t))).length;
  return hits >= 2 || (tokens.length <= 4 && hits >= 1) ? 'ru' : 'en';
}
```

Reference sketch; adapt to repo style. Add tests for "is this the one that works", "chair", "snapshot" (must be `en`).

**2.2 Academic guard (F2, F3, F4)** — run before persona patterns:

```ts
const ACADEMIC_GUARD = /\b([a-z]{2,3}-?\d{3})\b|cgpa|\bgpa\b|credit|prereq|semester|\bfyp\b|course|professor|supervisor|retake|repeat|backlog|elective|track|grade|degree requirement/i;
const PERSONA_ADDRESS = /\b(you|your|u|abdul|bari|aap|aapka|aapki|tum|tumhara|tumhari)\b/i;
```

Rule: if `ACADEMIC_GUARD` matches **and** `PERSONA_ADDRESS` does not, skip `P-GRAD`, `P-TIME`, `P-BATCH`, `P-ROLE`, `P-ID`, `P-STORY`, `S-CAN` and send to the server. `DISTRESS` and `SINCERITY` are checked first as today and are never skipped.

Also: change `S-CAN`'s bare `help.?me` so it only matches when the query is short (≤ 4 words) or has no academic keyword.

**2.3 Keep the order** `DISTRESS` → `SINCERITY` → (new emotion intents, §7) → `MYSTERY` → `SMALLTALK` → server.

### Phase 3 — Roman Urdu normaliser (shared module)

Create one module used by the client gate and the server matchers (and the faq-matcher if it duplicates logic — reuse, don't duplicate).

Behaviour: lowercase → strip punctuation → collapse repeated letters (≥3 same letters → 2) → map variant spellings to a canonical form → keep the original query for logging and for the LLM.

Starter variant table (extend from real usage; add only forms you are confident about):

| Canonical | Variants to map |
|---|---|
| kya | kia, kyaa |
| hai | hay, hy, he (only when other RU markers are present — `he` is also English) |
| hain | hen, hyn |
| nahi | nahin, nai, nhi, nae, nahe |
| kaise | kese, kaisay, kesay, kaisy |
| kab | kub |
| kahan | kahaan, kaha, kidhar |
| kaun | kon, kaon |
| kitne | kitnay, kitny |
| mujhe | mujhy, mjhe, mujhay |
| batao | bataao, btao, bata do, batado, batain, bataein |
| chahiye | chahye, chaiye, chahiyay |
| karna | krna, karni, karnay |
| parhna | parna, padhna, parhni |
| ho gaya | hogaya, ho gya, hogya |
| hona | honi, hoga |
| aap | ap |
| tum | tm |
| fail | fel, fail ho |
| paper | pepar |
| semester | sem, semister |
| cgpa | c.g.p.a, cpga |
| professor | prof, sir, ustad, teacher |
| bohat | bohot, bahut, boht, bht |
| pareshan | pareshaan, preshan |
| ghabra | ghabrana, ghabrahat |

Also strip honorifics before name matching (§5): `dr, dr., doctor, prof, professor, ms, mr, mrs, miss, engr, engr., sir, madam, maam, mam`.

### Phase 4 — Entity resolver + Layer 2 direct answers (the "Who is Dr. Fakra Aftab" fix)

**4.1 Cache** the professors (approved/published only) in memory with a short TTL; remove the per-term DB fetch inside the loop (F8).

**4.2 Name resolver.** Pre-compute for each professor: normalised full name, name tokens, and an initial-less form. At query time:

1. Normalise query (Phase 3), strip honorifics.
2. Detect person intent: `who is|who's|tell me about|about|kaun hai|kaun hain|kon hai|kaun hain|ke baare mein|ka profile|research|kya karte hain|kya karti hain` + a name-like span, **or** the query is just a name.
3. Fuzzy match the name-like tokens against professor name tokens (Jaro-Winkler or Levenshtein ≤ 2 for tokens ≥ 5 chars, ≤ 1 for shorter). Score = fraction of query name tokens matched.
4. Decision rules:
   - Single clear top match (score ≥ 0.8 and a clear margin over the second) → **direct profile answer**.
   - Multiple plausible matches (e.g. "Dr. Ali" could match several professors with "Ali" in the name; "Muhammad" matches many) → **ask which one**, listing the top 3 names. Do not pick one.
   - Below threshold → `"I don't have a faculty profile by that name in the department records."` followed by an offer to search by research area. No fuzzy guess.
5. Log near-misses (score 0.5–0.8) to `chatbot_unanswered` with category `faculty_name_unresolved` for review.

**4.3 Answer template (from data fields only, no extras):**

- EN: `{title} {name} is {rank/designation} in {department}. Research areas: {research_areas, comma-separated}.`
- RU: `{title} {name} {department} mein {rank/designation} hain. Research areas: {research_areas}.`
- Do **not** add office, email, phone, hours, courses taught or pronouns unless those fields exist in the DB. Use "Dr. X's research areas…" phrasing; avoid gendered pronouns.
- Wrap in Abdul's voice using the existing rotating persona lines (no two identical lines in a row), then the unofficial-guide disclaimer as already implemented.

**4.4 Other Layer 2 direct-answer shapes** (zero tokens, zero LLM):

| Query shape | Source | Answer |
|---|---|---|
| "what is CS-218" / "CS-218 kya hai" | `courses` | title, credits, semester, category |
| "which courses in semester 5" / "sem 5 ke courses" | `courses` | list code + title |
| "who works on {area}" / "{area} pe kaun kaam karta hai" | `professors.research_areas`/`domain_tags` | list of matching names; compute from DB, do not hand-write |
| "FYPs on {topic}" / "{topic} ke FYPs" | `fyp_projects` | up to 5 titles with year; mention total match count |
| "FYPs supervised by Dr. X" | `fyp_projects.supervisor` + resolver | list |
| "career tracks" / "{track} track kya hai" | `career_tracks` | list or the track summary field |
| "how many professors/courses/FYPs" | counts from DB | number |

If a lookup returns zero rows, fall through to Layer 3, then Layer 4. Never invent a match.

**4.5 When the LLM is off or over budget (F9):** if Layer 2 found records, **return the composed Layer 2 answer**, not source cards alone. Cards can accompany the sentence but must not be the whole response.

### Phase 5 — Layer 1 matcher upgrade (F6, F7)

Keep the existing function as the baseline path. Add a scored matcher behind the flag:

- Load active rows once; cache with TTL (suggest 60 s) and invalidate on admin write.
- Normalise query with Phase 3.
- Score each row: exact phrase hit (highest), token overlap ratio, and a small bonus for same-language rows. Pick the **highest score**, not the first.
- Respect `confidence_threshold` (existing default 0.85).
- Prefer the row whose `language` equals the detected language; fall back to the other language row for the same `intent_id` rather than failing.
- Short patterns (≤ 3 chars) stay exact-token only, as today.
- On a tie, or a score within a small margin of the runner-up, prefer **no Layer 1 match** (let Layer 2/3 handle it) over a wrong confident answer.

Run old and new matchers side by side over the §11 test set in a script; the new one must match or improve every regression case.

### Phase 6 — Emotion handling (stress, panic, fear, low motivation)

See §7 for patterns, composition and the motivation pool.

### Phase 7 — Language-aware answers

1. Pass `lang` (`'en'|'ru'`) from the client to `/chat`.
2. Layer 1: choose the row in that language, fall back to the other.
3. Layer 2 templates: have EN and RU variants (§4.3).
4. Layer 3 prompt: add one instruction — "Reply in Roman Urdu (Latin script, natural Karachi student style) if `lang` is `ru`, otherwise English." Keep the `<context></context>` isolation (Rule 14), the 500-token cap and the "I do not have that information" rule. The LLM must **not** produce motivation lines; those come from the fixed pool.
5. Layer 4 fallback text in both languages (§9.3).

### Phase 8 — Fallback and API chain (§9)

### Phase 9 — Seed data (§10), drafts only

### Phase 10 — Tests (§11) and the final report (§14)

---

## 5. Question coverage design

Students phrase the same question in countless ways. The system should not try to list every phrasing. It should combine:

1. **Normalisation** (Phase 3) so variants collapse to canonical tokens.
2. **Intent groups** with several phrasings per intent in each language (§10).
3. **Entity extraction** for the open-ended parts (professor names, course codes, topics) via Layer 2 — this is why "who is Dr. X" must not be a Layer 1 pattern per professor.
4. **Scored matching** with a "no match is better than a wrong match" policy.
5. **Logging** of every unmatched question to `chatbot_unanswered` so new phrasings can be added from real usage.

---

## 6. Roman Urdu marker additions (for language detection)

Add these to the existing `RU_MARKERS` (token-matched, not substring): `kaun, kon, kitne, kitna, kyun, kyunke, kyon, abhi, phir, lekin, magar, bohat, bahut, pareshan, ghabra, ghabrahat, tension, masla, mushkil, asaan, pata, pta, nahin, nhi, karo, karna, krna, kardo, dekho, samajh, samjhao, bata, bataiye, madad, parhai, imtihan, paper, mubarak, shukriya, shukria, sahi, ghalat, kaam, wala, wali, ke, ki, ka`.

Careful: `ke`, `ki`, `ka`, `he`, `to` are noisy. Do not count them alone; require them alongside ≥ 1 strong marker.

---

## 7. Emotional support intents ("one motivating line, then the answer")

### 7.1 Intent set (client gate, zero API cost)

| Intent | Meaning | EN patterns (examples) | RU patterns (examples) |
|---|---|---|---|
| `E-STRESS` | general stress/overwhelm | `i am stressed`, `i'm stressed`, `so stressed`, `overwhelmed`, `too much work`, `can't cope`, `burnt out`, `exhausted` | `bohat tension`, `tension ho rahi`, `stress ho raha`, `pareshan hoon`, `thak gaya`, `thak gayi` |
| `E-PANIC` | acute panic | `panicking`, `i am panicking`, `freaking out`, `help i'm scared`, `i don't know what to do` | `ghabra gaya`, `ghabra gayi`, `ghabrahat`, `samajh nahi aa raha kya karun`, `dil ghabra raha` |
| `E-FAIL` | failed course / backlog | `i failed`, `got an f`, `have a backlog`, `failed {course}`, `will i graduate if i failed` | `fail ho gaya`, `fail ho gayi`, `backlog aa gaya`, `f aa gaya`, `paper kharab ho gaya` |
| `E-LOWCGPA` | low CGPA worry | `my cgpa is low`, `cgpa dropped`, `cgpa below 2`, `worried about my cgpa` | `cgpa kam hai`, `cgpa gir gaya`, `cgpa kam ho gaya`, `cgpa ki tension` |
| `E-EXAM` | exam fear | `exam tomorrow`, `scared of the exam`, `not prepared`, `haven't studied` | `kal paper hai`, `paper se dar lag raha`, `tayyari nahi hai`, `kuch nahi parha` |
| `E-DEMOTIVATED` | low motivation/quit | `no motivation`, `want to quit`, `what's the point`, `lost interest`, `thinking of dropping out` | `dil nahi lag raha`, `padhne ka mann nahi`, `chhorna chahta hoon`, `degree chhor doon` |
| `E-HOPELESS` | strong hopelessness (not self-harm) | `i can't do this anymore`, `everything is ruined`, `i give up` | `mujhse nahi hoga`, `sab kharab ho gaya`, `main haar gaya`, `himmat khatam` |

Patterns are canonical forms after Phase 3 normalisation. Use word-boundary / token-aware regexes. Allow optional words in between (e.g. `i (am|m)? (really|so|very)? stressed`).

### 7.2 Priority and safety

Order: `DISTRESS` → `SINCERITY` → `E-HOPELESS` → other `E-*` → persona → smalltalk → server.

- `DISTRESS` always wins and keeps its existing response behaviour.
- `E-HOPELESS` responses are warmer and gently encourage speaking to a trusted person (friend, family, teacher/advisor). They must **not** claim a campus counselling service exists unless Hurraim confirms one (ask him; see §13).
- If a message mixes hopeless language with anything resembling self-harm, treat it as `DISTRESS`.
- Never joke, never minimise, never promise outcomes ("you will pass", "it will be fine").

### 7.3 Composition: motivation first, answer second

1. Detect emotion intent and the language.
2. **Strip the emotional part** and check whether an academic question remains (course code, "what happens", "can I", `ACADEMIC_GUARD`).
3. If an academic question remains: send the *remaining* question through the normal pipeline (Layer 1 → 2 → 3 → 4). Final reply = `[one motivation line] + [blank line] + [the real answer]`.
4. If no academic question remains (pure emotion): reply = `[one motivation line] + [2–3 practical steps, §7.4] + [one invitation to ask the specific question]`.
5. The line is exactly **one line**. Pull it from the fixed pool (§7.5). Rotate; never repeat the line used in the previous reply.
6. Avatar: `sad` for emotional messages (existing rule: academic stress → sad). It stays until the next user message (existing persistence rule).
7. The one-liner is added by the client from the fixed pool; the server and LLM must not add their own.

Examples (the answer part must come from the verified facts or Layer 2, never improvised):

> *"I failed CS-218, what now?"*
> **Line:** One course doesn't define your degree — let's look at your actual options.
> **Answer:** (Layer 1/2: failed-prerequisite rule + retake rule. Lists downstream courses from the `courses` data if retrievable.)

> *"Mera CGPA kam hai, kya main graduate ho sakta hoon?"*
> **Line (RU):** Ek semester poori kahani nahi hota — pehle facts dekh lete hain.
> **Answer (RU):** Graduate hone ke liye kam az kam 2.00 CGPA chahiye. Course repeat karo to higher grade CGPA mein replace ho jata hai. *(Guidance estimate, not an official university decision — Rule 7 applies to any projection.)*

### 7.4 Practical steps for pure-emotion replies (generic, non-institutional)

Use only generic, safe, non-factual guidance. No regulation claims here.

EN: "1) Pause for a minute and write down the one thing that's worrying you most. 2) Tell me the course or the CGPA situation — I'll give you the exact rules I have. 3) For anything official, the departmental notice board or your academic advisor has the final word."

RU: "1) Ek minute ruk kar likh lo ke sabse zyada kis cheez ki tension hai. 2) Mujhe course ya CGPA ka masla batao — jo rules mere paas hain woh bata dunga. 3) Official baat ke liye CISE notice board ya academic advisor se confirm kar lena."

### 7.5 Motivation pool (DRAFT — Hurraim to review and edit)

Store in `abdul-bari.persona.json` under `motivation`, grouped by intent. All lines are one sentence, no promises, no fake facts.

**General / `E-STRESS`**
- EN: "Take one breath first — this is a problem with steps, not a verdict on you."
- EN: "You don't have to fix everything today, only the next small thing."
- EN: "Plenty of students have felt exactly this and found a way forward."
- RU: "Ek lamba saans lo — yeh masla hai, tumhari qeemat ka faisla nahi."
- RU: "Sab kuch aaj theek karna zaroori nahi, bas agla chhota qadam dekhte hain."
- RU: "Bohat se students yahan se guzre hain aur raasta nikal liya hai."

**`E-PANIC`**
- EN: "Slow down for a second — panic makes everything look bigger than it is."
- EN: "Breathe, then we'll go through it one piece at a time."
- RU: "Pehle thoda ruk jao, ghabrahat mein masla bada lagta hai."
- RU: "Saans lo, phir ek ek cheez dekhte hain."

**`E-FAIL`**
- EN: "One failed course isn't the end of the road — let's look at what the rules actually allow."
- EN: "A setback is not the whole story; here's what you can do next."
- RU: "Ek course fail hona poori degree ka faisla nahi — dekhte hain rules kya kehte hain."
- RU: "Yeh rukawat hai, anjaam nahi — chalo agla step dekhte hain."

**`E-LOWCGPA`**
- EN: "A CGPA can be rebuilt one semester at a time — let's look at the facts first."
- RU: "CGPA ek semester mein nahi banta bigarta — pehle facts dekh lete hain."

**`E-EXAM`**
- EN: "Even a small, focused revision session today helps — you can do this."
- RU: "Aaj ki chhoti si focused revision bhi kaam aati hai — tum kar sakte ho."

**`E-DEMOTIVATED`**
- EN: "Feeling this way is common, and it's worth talking through before making any big decision."
- RU: "Aisa lagna aam baat hai, bara faisla karne se pehle thoda baat kar lete hain."

**`E-HOPELESS`**
- EN: "I'm glad you said it out loud — you don't have to carry this alone."
- RU: "Achha kiya ke tumne bata diya — yeh sab akele uthana zaroori nahi."

(Hurraim wants these to rotate without back-to-back repeats; the existing `usePersona.ts` rotation helper can be reused.)

---

## 8. Persona voice rules (do not change; reuse)

- Abdul Bari is an *unofficial* guide and says so; the existing disclaimer lines stay.
- Bilingual: reply language follows the detected language.
- Mystery answers (graduation, batch, age, "are you real") stay as implemented: playful, never a lie, never a hallucinated fact.
- No new lore. If a new line needs lore, ask Hurraim.

---

## 9. Fallback and API chain

### 9.1 Things to verify before touching anything

- The old spec names `Gemini 2.0 Flash`, `Gemini 1.5 Flash` and `xAI Grok-Beta`. Some of these models may be retired or renamed. **Check the providers' current official model lists and the current API response behaviour.** Do not trust names from this document.
- Make provider order, model IDs, timeouts, and token caps **environment-configurable** (not hard-coded).
- Confirm that a Groq slot exists in code; if it does and a model is verified, it can be added as a last provider. If you cannot verify a Groq model ID, leave it disabled.

### 9.2 Required behaviour

1. Chain: provider 1 → provider 2 → provider 3, each with its own timeout and the same input/output caps (300 chars in, 500 tokens out — Rule 4). Log each attempt result (not the content with PII) to `llm_usage`.
2. Classify failures: timeout / 429 / 5xx → try next provider. 401/403 or "model not found" → skip provider, log an alert-level server message, continue to next provider (never include the key).
3. Add a short per-provider **circuit breaker** (e.g. skip a provider for a short window after repeated hard failures) so every request does not wait on a dead provider.
4. If the chain fails **but Layer 2 had records**, return the Layer 2 composed answer (not Layer 4). Mark `layer: 2, via: 'fallback'`.
5. If nothing is available, return Layer 4 and log to `chatbot_unanswered`.
6. **Distinguish the two failure reasons in the API response** so the avatar can be right:
   - `reason: 'not_found'` → avatar `confused`.
   - `reason: 'llm_unavailable'` (timeout, quota, network) → avatar `sorry` (uses the confused asset as an alias, as already defined).
7. Rules 5 and 11 must hold: Layers 1, 2 and 4 work with the LLM off; keys only in server env.
8. Add a **smoke-test script** that, for each configured provider, sends a trivial prompt and prints only `provider, model, ok/fail, latency, status class`. It must never print keys or full responses.

### 9.3 Layer 4 text (bilingual)

- EN (keep as is): "I do not have that information based on the official NED CISE resources available. Please check the departmental notice board or consult the academic advisor."
- RU (draft): "Mere paas yeh maloomat official NED CISE records mein maujood nahi hain. Meherbani karke department ka notice board dekh lo ya academic advisor se pooch lo."
- "Service unavailable" (EN, for `llm_unavailable`): "I couldn't reach my answer service just now. Please try again in a moment, or check the departmental notice board."
- "Service unavailable" (RU, draft): "Abhi mera answer service available nahi hai. Thori dair baad dobara try karo, ya department ka notice board dekh lo."

---

## 10. Seed data (DRAFT — insert as inactive; Hurraim approves)

Format for `chatbot_answers`: `question_pattern` is comma-separated lowercase patterns in **canonical (normalised) form**; one EN row and one RU row per intent, linked by `intent_id`. Patterns of ≤ 3 characters are matched as exact tokens only.

> **Bulk seed file:** `educompass_kb_seed.json` (same folder) holds ~700 English and Roman Urdu phrasings: 16 verified intents, 3 unverified (inactive), 18 faculty resolver fixtures, 22 known-unanswered redirects, and 7 emotion intents with a motivation pool. Load it as drafts per its `_meta.load_rules`. The text below is the human-readable summary of the core intents.

### 10.1 Verified-facts intents (safe to seed after approval)

**G01 — Minimum CGPA to graduate** (`category: grading`)
- EN patterns: `minimum cgpa, cgpa to graduate, passing cgpa, required cgpa, cgpa needed, graduation cgpa, what cgpa do i need, how much cgpa to graduate`
- RU patterns: `graduate hone ke liye kitna cgpa, kam az kam cgpa kitna, minimum cgpa kitna hai, degree ke liye cgpa kitna chahiye, cgpa kitna hona chahiye, pass hone ke liye cgpa`
- EN answer: "To graduate you need a minimum CGPA of 2.00."
- RU answer: "Graduate hone ke liye kam az kam 2.00 CGPA chahiye."

**G02 — Passing grade** (`grading`)
- EN: `passing grade, minimum passing grade, what is the pass mark, minimum grade to pass, pass marks, what grade is fail`
- RU: `passing grade kya hai, pass hone ke liye kya chahiye, minimum grade kya hai, pass marks kitne hain, kitne marks pe pass`
- EN: "The minimum passing grade is D (1.0 grade point, 50% marks)."
- RU: "Minimum passing grade D hai (1.0 grade point, yaani 50% marks)."

**G03 — Retake / repeat** (`grading`)
- EN: `retake course, repeat course, which grade counts, improve grade, grade improvement, repeat a failed course, retake a course`
- RU: `course dobara parhna, repeat karna, kaun sa grade count hoga, grade improve kaise, fail course dobara, retake kaise`
- EN: "If you repeat a course, the higher grade replaces the earlier grade in your CGPA calculation."
- RU: "Course repeat karo to CGPA mein higher grade purane grade ki jagah count hota hai."

**G04 — Credit hours per semester** (`registration`)
- EN: `max credits, credit limit, maximum credit hours, credit ceiling, how many credits can i take, overload, 21 credits, credit overload`
- RU: `ek semester mein kitne credit hours, zyada se zyada credit hours, credit limit kitni hai, overload kaise, 21 credit hours`
- EN: "The regular maximum is 18 credit hours per semester. An overload of up to 21 credit hours is possible with the Chairman's approval."
- RU: "Aam taur par ek semester mein zyada se zyada 18 credit hours le sakte ho. 21 credit hours tak overload Chairman ki manzoori se mumkin hai."

**G05 — Total degree credit hours** (`program`)
- EN: `total credit hours, degree credit hours, how many credits in degree, total credits, credits to graduate`
- RU: `degree mein kul kitne credit hours, total credit hours kitne, graduate hone ke liye kitne credits`
- EN: "The degree is 136 credit hours across 8 semesters."
- RU: "Degree 136 credit hours ki hai, jo 8 semesters mein hoti hai."

**G06 — Number of courses** (`program`)
- EN: `how many courses, total courses, number of courses, how many subjects`
- RU: `kitne courses hain, kul kitne subjects, total courses kitne`
- EN: "The program has 53 courses in total, including theory courses and practical labs."
- RU: "Program mein kul 53 courses hain, jin mein theory aur practical labs shamil hain."

**G07 — Failed prerequisite** (`prerequisites`)
- EN: `failed prereq, fail prerequisite, failed prerequisite, locked course, cannot register course, why is my course locked, prerequisite failed what happens`
- RU: `prerequisite fail ho gaya, prereq fail, course lock kyun, agla course kyun nahi mil raha, prerequisite fail to kya hoga`
- EN: "If you fail a prerequisite, the courses that depend on it stay locked until you pass the prerequisite."
- RU: "Agar prerequisite fail ho jaye to jo courses us par depend karte hain woh us waqt tak lock rehte hain jab tak tum prerequisite pass nahi kar lete."

**G08 — When FYP happens** (`fyp`)
- EN: `when fyp starts, fyp start, 7th semester fyp, fyp semester, fyp timing, when do i start fyp, fyp duration`
- RU: `fyp kab shuru hota hai, fyp kis semester mein, fyp kab start, fyp kitne semester ka`
- EN: "The Final Year Project is CS-406: Part I runs in Semester 7 and Part II in Semester 8, 3 credit hours each."
- RU: "Final Year Project CS-406 hai: Part I Semester 7 mein aur Part II Semester 8 mein hota hai, har part 3 credit hours ka."

**G09 — Finding a supervisor** (`fyp`) — keep the existing C03 text; add RU
- EN: `how to get supervisor, find supervisor, contact professor, who can supervise my fyp, fyp supervisor`
- RU: `supervisor kaise milega, supervisor kaise dhoondun, fyp ke liye professor, kis professor se fyp`
- RU answer (draft): "Professor Directory mein faculty ki research areas dekho aur apne project idea se match karo. Phir apna CV aur 2 line ka project idea email kar do."

**G10 — Career tracks overview** (`career`)
- EN: `career tracks, what tracks are there, career paths, which track should i choose, list of tracks`
- RU: `career tracks kon se hain, tracks ki list, career paths, kaun sa track chunun`
- EN: "There are 12 career tracks: AI & Machine Learning, Data Science & Big Data, Full-Stack Web Development, Cybersecurity & Digital Forensics, Embedded Systems & IoT, Cloud Architecture & DevOps, Mobile App Engineering, Blockchain & Smart Contracts, Computer Vision & Graphics, Bioinformatics & Health Tech, AR/VR & Game Engineering, and Software Quality Assurance & Testing."
- RU: "Career tracks 12 hain: AI & Machine Learning, Data Science & Big Data, Full-Stack Web Development, Cybersecurity & Digital Forensics, Embedded Systems & IoT, Cloud Architecture & DevOps, Mobile App Engineering, Blockchain & Smart Contracts, Computer Vision & Graphics, Bioinformatics & Health Tech, AR/VR & Game Engineering, aur Software Quality Assurance & Testing."
- **Implementation note:** build this from the `career_tracks` data at runtime if possible so it never goes stale; the text above is the fallback.

**G11 — What is the What-If simulator** (`tools`) — existing B03 text stays; add RU
- EN: `what if simulation, failure simulator, what if simulator, simulate failing a course`
- RU: `what if simulator kya hai, failure simulator, fail simulate kaise karun`
- RU answer (draft): "What-If Failure Simulator Prerequisite Explorer mein tumhare browser ke andar hi chalta hai. Yeh tumhara official academic record kabhi nahi badalta."

**G12 — What can Abdul Bari do?** — already handled by `S-CAN`; just ensure RU phrasing is covered there.

### 10.2 Dynamic intents (answered from the DB at runtime, not stored text)

Do not hand-write these answers; Layer 2 builds them (§4.4): professor profiles, "who works on X", course lookups, semester course lists, FYP by topic or supervisor, counts.

### 10.3 Seed intents that must stay inactive until Hurraim confirms (§2.1)

Grade scale, Dean's list, probation/warning wording, FYP team size, FYP proposal evaluation, retake transcript behaviour. Insert them if he wants the rows prepared, but `is_active = false` and clearly commented `needs_verification`.

---

## 11. Test plan

### 11.1 Regression (must still pass exactly as before)

| Input | Expected |
|---|---|
| "salam" / "hi" / "kya haal hai" | Existing greeting reply, `happy` |
| "who are you" / "aap kaun ho" | Existing persona intro |
| "are you ai?" / "aap robot ho?" | Existing sincerity reply |
| "tell me your story" / "kahani sunao" | Existing P-STORY reply |
| "did you graduate?" / "aapki degree ho gayi?" | Existing P-GRAD mystery reply (persona-addressed, so guard does not skip it) |
| "i want to kill myself" / "marna chahta hoon" | Existing DISTRESS handling, unchanged and first in priority |
| "thanks" / "shukriya" / "bye" | Existing replies |
| Offline mode (LLM disabled) | Layers 1, 2, 4 still answer |
| Query with PII ("CS-2024 my email a@b.com") | PII scrubbed before any LLM call |
| Input of 301 characters | Rejected/trimmed per Rule 4 |

### 11.2 New behaviour

| Input | Expected route / result |
|---|---|
| "minimum cgpa to graduate" | Reaches Layer 1 (G01), **not** P-GRAD |
| "how long is the FYP" | Server (G08 or Layer 2), **not** P-TIME |
| "help me with prerequisites" | Server, **not** S-CAN |
| "is this the one that works" | `detectLanguage` → `en` |
| "kya failed prerequisite se course lock hota hai" | `ru`; G07 RU answer |
| "who is Dr. Fakra Aftab" | Direct profile for Dr. Fakhra Aftab from DB data |
| "fakhra aftab kaun hain" | Same profile, RU wording |
| "dr fakhra" | Same profile (unique) |
| "tell me about Dr. Ali" | Ambiguity prompt listing candidates, no pick |
| "who is Dr. Zorbax" | "No faculty profile by that name" + offer; logged |
| "who works on cybersecurity" | List computed from DB `research_areas`/`domain_tags`; check against DB, not memory |
| "CS-218 kya hai" | Course lookup, RU wording |
| "i am panicking, i failed CS-218" | One motivation line, then G07/G03 answer; avatar `sad` |
| "bohat tension hai, cgpa kam hai" | RU motivation line, then G01/G03 RU answer |
| "i'm so stressed" (pure) | Motivation line + steps + invitation; no invented facts |
| "mujhse nahi hoga" | `E-HOPELESS` warm reply; never skips to a cheerful tone |
| Provider 1 forced to fail | Provider 2 answers; `llm_usage` logs both attempts |
| All providers forced to fail + Layer 2 has records | Composed Layer 2 answer, avatar `sorry` or `happy` per existing rules |
| All providers forced to fail + no records | Layer 4 text, avatar `sorry`, row in `chatbot_unanswered` |
| Unknown topic ("hostel fees kitni hain") | Specific redirect (§12.2), logged, avatar `confused` |
| Draft (`is_active=false`) rows | Never returned |

### 11.3 Quality checks

- No two consecutive replies use the same motivation line.
- Roman Urdu replies contain no Devanagari or Urdu-script text.
- Every professor answer contains only fields that exist in the DB.
- No gendered pronoun appears in a professor answer.

---

## 12. Topics with no verified data

Hurraim wants many portal-style questions covered, but the data above does **not** contain answers to these. Do not answer them from general knowledge. Seed them as **recognised intents with a specific honest redirect** and log them, so the team can supply data later.

### 12.1 Recognised-but-unanswered intents

attendance requirement / shortage; fee amounts and deadlines; scholarship / financial aid; hostel; exam schedule / datesheet; registration / enrollment dates; add-drop dates; semester freeze / leave; transcript / degree / certificate request; grade recheck / appeal; section change; timetable; internship requirement; library or lab timings; transport; ID card; who teaches a particular course; faculty email, phone, office hours; detailed syllabus content of a course; admission-related questions.

### 12.2 Redirect answer (EN / RU draft)

- EN: "I don't have verified records for {topic}. The departmental notice board or the academic advisor can confirm this — and I've noted your question so it can be added."
- RU: "{topic} ke baare mein mere paas verified record nahi hai. Department ka notice board ya academic advisor confirm kar sakta hai — aur maine tumhara sawal note kar liya hai taake isay add kiya ja sake."

Use the actual topic phrase from a small lookup (don't echo free user text).

### 12.3 What Hurraim must supply to turn these into real answers

For each topic he wants answered: the official text or table, its source (notice number / document), and the date it applies from. Until then the redirect above is the correct behaviour.

---

## 13. Questions to put to Hurraim during the work

1. Does a campus counselling or student-support contact exist that Abdul may mention for `E-HOPELESS` messages? If not, keep the "trusted person / advisor" wording only.
2. Confirm CS-222's real title and the correct prerequisite chain (§2.1).
3. Does he want the unconfirmed rows in §2.1 prepared as inactive drafts?
4. Which professor field holds designations such as "Director ISL" and "Industry Liaison"?
5. May the motivation pool in §7.5 be edited by him before go-live? (Recommended: yes.)
6. Are there any real pronoun/gender fields for professors? If not, answers stay pronoun-free.

---

## 14. Final report format (agent → Hurraim)

1. Phase 0 findings (schema, counts, contradictions found).
2. Per phase: files changed, flag name, how to turn it off.
3. Test results: regression table (before/after) and new-behaviour table.
4. A list of every row inserted (all inactive), grouped by intent.
5. The `needs_verification` list (including anything you could not confirm yourself).
6. Anything you chose **not** to do and why.
7. Confirmation that no secrets were written anywhere.

## 15. Definition of done

- All §11.1 regression cases pass unchanged.
- "Who is Dr. Fakra Aftab" returns a real profile sentence from the DB; ambiguous names ask a question; unknown names say so honestly.
- A stressed/panicking message gets one motivating line followed by the verified answer (or the pure-emotion reply), in the user's language.
- A Roman Urdu question gets a Roman Urdu answer for every seeded intent and Layer 2 template.
- Killing all LLM providers still gives a sensible answer or the Layer 4 text with the right avatar.
- Nothing unverified is live. Nothing was deleted. Every new behaviour can be turned off by the feature flag.
