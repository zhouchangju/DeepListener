# Phonetic Notation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement a "Phonetic Notation System" that allows users to mark text with Stress, Linking, Reduction, and Elision notations for better pronunciation practice.

**Architecture:**
- **Database:** Add `formatting` JSON column to `Sentence` model to store notation data.
- **Backend:** Update `Sentence` API to support patching the `formatting` field.
- **Frontend:** Create a reusable `InteractiveText` component that renders tokens and handles click interactions based on the selected tool (Paintbrush pattern).
- **Integration:** Embed `InteractiveText` into `ShadowingConsole` (editable) and `AudioPlayer`/`ReviewClient` (read-only).

**Tech Stack:** Next.js 15, Prisma (SQLite), Tailwind CSS, Lucide Icons.

---

### Task 1: Database Schema & API Update

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/sentence/[id]/route.ts` (Create if missing or modify existing)
- Test: `scripts/test-notation-api.ts` (New test script)

**Step 1: Update Prisma Schema**
- Add `formatting String?` (JSON string) to `Sentence` model in `prisma/schema.prisma`.
- Run migration: `npx prisma migrate dev --name add_sentence_formatting`.

**Step 2: Create/Update Sentence API**
- Create `src/app/api/sentence/[id]/route.ts` to handle `PATCH` requests.
- Implement logic to update `formatting` field.
- Ensure strict type validation for the JSON structure (optional but good practice).

**Step 3: Create Test Script**
- Create `scripts/test-notation-api.ts`.
- The script should:
    1. Fetch a random sentence ID.
    2. Send a PATCH request with sample formatting JSON.
    3. Fetch the sentence again to verify the field is updated.

**Step 4: Execute Test**
- Run `npx tsx scripts/test-notation-api.ts`.
- Expected: Success log showing updated formatting.

**Step 5: Commit**
```bash
git add prisma/schema.prisma src/app/api/sentence/[id]/route.ts scripts/test-notation-api.ts
git commit -m "feat: add sentence formatting field and API"
```

---

### Task 2: Tokenization & InteractiveText Component (Core)

**Files:**
- Create: `src/lib/text-utils.ts`
- Create: `src/components/feature/notation/InteractiveText.tsx`
- Create: `src/components/feature/notation/types.ts`

**Step 1: Implement Tokenizer**
- In `src/lib/text-utils.ts`, create `tokenizeSentence(text: string): Token[]`.
- Logic: Split by spaces but preserve punctuation attached to words?
- Better approach: Regex match words and punctuation.
- Output: Array of `{ text: string, index: number, type: 'word' | 'punctuation' }`.

**Step 2: Define Types**
- In `src/components/feature/notation/types.ts`:
    ```typescript
    export type NotationType = 'stress' | 'linking' | 'reduction' | 'elision';
    export interface SentenceFormatting {
      stress?: number[]; // indices of stressed tokens
      linking?: [number, number][]; // pairs of indices
      reduction?: number[];
      elision?: number[];
    }
    ```

**Step 3: Create InteractiveText Component Skeleton**
- Create `src/components/feature/notation/InteractiveText.tsx`.
- Props: `text: string`, `formatting: SentenceFormatting`, `mode: 'read' | 'edit'`, `activeTool: NotationType | null`, `onChange?: (newFormatting) => void`.
- Render: Map tokens to `<span>`.

**Step 4: Implement Rendering Logic**
- Apply CSS classes based on `formatting` prop.
    - Stress: `font-bold text-indigo-600 relative after:content-['•'] after:absolute after:-top-2 after:left-1/2`
    - Reduction: `text-gray-400 text-sm`
    - Elision: `line-through decoration-red-500`
    - Linking: Needs a special SVG or absolute positioned element between tokens. This is tricky. simpler: `border-b-2 border-amber-400 rounded-b-lg` on the gap? Or use a pseudo element on the *first* word of the pair? Let's use a specialized `LinkRender` component absolute positioned.

**Step 5: Implement Click Interaction**
- `handleTokenClick(index)`:
    - If `activeTool === 'stress'`: Toggle index in `formatting.stress`.
    - If `activeTool === 'reduction'`: Toggle index in `formatting.reduction`.
    - If `activeTool === 'elision'`: Toggle index in `formatting.elision`.
- `handleGapClick(index)`:
    - If `activeTool === 'linking'`: Toggle pair `[index, index+1]` in `formatting.linking`.

**Step 6: Commit**
```bash
git add src/lib/text-utils.ts src/components/feature/notation/
git commit -m "feat: implement InteractiveText core component"
```

---

### Task 3: Notation Toolbar & Shadowing Integration

**Files:**
- Create: `src/components/feature/notation/NotationToolbar.tsx`
- Modify: `src/components/feature/ShadowingConsole.tsx`

**Step 1: Create Toolbar**
- `NotationToolbar.tsx`:
    - Props: `activeTool`, `onToolChange`.
    - Render 4 buttons: Stress (💪), Linking (🔗), Weak (📉), Elision (🚫).
    - Styling: Active state highlights the button.

**Step 2: Integrate into ShadowingConsole**
- Add state: `activeTool` (default null).
- Add state: `localFormatting` (initialized from `sentence.formatting`).
- Add effect: Auto-save `localFormatting` to API (debounce 1s).
- Replace the simple `<p>{sentence.text}</p>` with:
    ```tsx
    <div className="flex flex-col gap-4">
       <InteractiveText
          text={sentence.text}
          formatting={localFormatting}
          mode="edit"
          activeTool={activeTool}
          onChange={setLocalFormatting}
       />
       <NotationToolbar activeTool={activeTool} onToolChange={setActiveTool} />
    </div>
    ```

**Step 3: Styling Tweaks**
- Ensure the text area has enough line-height to accommodate Linking arcs and Stress dots.

**Step 4: Commit**
```bash
git add src/components/feature/notation/NotationToolbar.tsx src/components/feature/ShadowingConsole.tsx
git commit -m "feat: integrate notation toolbar into shadowing console"
```

---

### Task 4: Read-Only Integration (AudioPlayer & Review)

**Files:**
- Modify: `src/components/feature/audio-player/SentenceList.tsx`
- Modify: `src/app/review/ReviewClient.tsx` (or wherever the sentence is shown)

**Step 1: AudioPlayer Integration**
- Update `SentenceList.tsx` to render `InteractiveText` in `mode="read"`.
- Note: This might have performance implications if rendering 100s of InteractiveTexts. Use `memo`.
- Wait, `SentenceList` currently renders simple text. Replacing it with a component is fine if optimized.

**Step 2: Review Page Integration**
- Update `ReviewClient` to use `InteractiveText` for the question/answer display.

**Step 3: Commit**
```bash
git add src/components/feature/audio-player/SentenceList.tsx src/app/review/ReviewClient.tsx
git commit -m "feat: enable read-only notation in player and review pages"
```
