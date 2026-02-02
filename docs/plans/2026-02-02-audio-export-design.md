# Audio Export Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Implement an "Audio Export" feature that allows users to merge sentence audio clips from their Vault notes into a single MP3 file for extensive listening practice in other players. Each clip is separated by 2 seconds of silence.

**Architecture:**
- **Backend:** Create `/api/audio/export` route that uses `fluent-ffmpeg` for audio extraction and merging.
- **Frontend:** Add export buttons in three locations: Vault page, Review page, and Track practice page.
- **Audio Processing:** Server-side audio slicing using FFmpeg, streaming output directly to client without disk storage.
- **Export Options:** Support three export modes - all notes, today's due reviews, and single track notes.

**Tech Stack:** Next.js 16, Prisma (SQLite), fluent-ffmpeg, React 19, Tailwind CSS.

---

## API Design

### Route Structure
```
POST /api/audio/export
```

### Request Parameters
```typescript
{
  type: 'all' | 'due' | 'track',
  trackId?: string  // Required only when type='track'
}
```

### Response
- **Content-Type:** `audio/mpeg`
- **Content-Disposition:** `attachment; filename="DeepListener_Export_2026-02-02.mp3"`
- **Body:** MP3 binary stream

### Query Logic
- **type='all':** Query all ReviewItem, group by `sentence.trackId`
- **type='due':** Query `nextReview <= now()` ReviewItem, group by trackId
- **type='track':** Query ReviewItem for specified `trackId`

---

## Audio Processing Strategy

### Technology Choice
- **fluent-ffmpeg:** Mature FFmpeg Node.js wrapper for precise time-based slicing
- **Stream Processing:** Direct HTTP response streaming, no server disk I/O
- **Native Slicing:** Extract from original audio without re-encoding for speed and quality

### Processing Stages

#### Stage 1: Audio Segment Extraction
```typescript
function extractSegment(
  inputPath: string,
  startTime: number,
  duration: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .format('mp3')
      .audioBitrate('192k')
      .on('end', () => resolve(outputBuffer))
      .on('error', reject)
      .pipe();
  });
}
```

#### Stage 2: Silence Generation
```typescript
function generateSilence(duration: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input('anullsrc=r=44100:cl=mono')
      .inputFormat('lavfi')
      .duration(duration)
      .format('mp3')
      .audioBitrate('192k')
      .pipe();
  });
}
```

#### Stage 3: Memory Concatenation
```typescript
const audioBuffers: Buffer[] = [];

for (const segment of segments) {
  const audio = await extractSegment(
    segment.audioPath,
    segment.startTime,
    segment.endTime - segment.startTime
  );
  audioBuffers.push(audio);

  const silence = await generateSilence(2.0);
  audioBuffers.push(silence);
}

return Buffer.concat(audioBuffers);
```

---

## Frontend Integration

### 1. Vault Page (`/app/vault/page.tsx`)

**UI Components:**
```tsx
<div className="flex gap-3 mb-6">
  <Button onClick={() => exportAudio('all')} className="flex items-center gap-2">
    <Download className="w-4 h-4" />
    Export All ({items.length} sentences)
  </Button>
  <Button onClick={() => exportAudio('due')} variant="outline" className="flex items-center gap-2">
    <Clock className="w-4 h-4" />
    Export Today's Review ({dueCount} sentences)
  </Button>
</div>
```

**Export Logic:**
```typescript
async function exportAudio(type: string, trackId?: string) {
  const response = await fetch('/api/audio/export', {
    method: 'POST',
    body: JSON.stringify({ type, trackId })
  });

  const filename = response.headers
    .get('Content-Disposition')
    ?.match(/filename="(.+)"/)?.[1];

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
```

### 2. Review Page (`/app/review/page.tsx`)

**UI Components:**
```tsx
<Button
  onClick={() => exportAudio('due')}
  className="fixed bottom-6 right-6 shadow-lg"
  size="lg"
>
  <Download className="w-4 h-4 mr-2" />
  Export Due ({totalDue} sentences)
</Button>
```

### 3. Track Practice Page (`/app/practice/[id]/page.tsx`)

**UI Components:**
```tsx
<Button
  onClick={() => exportAudio('track', trackId)}
  variant="ghost"
  className="ml-auto"
>
  <Download className="w-4 h-4 mr-2" />
  Export Notes
</Button>
```

---

## Performance Optimizations

### 1. Streaming Response
```typescript
export async function POST(req: Request) {
  const { type, trackId } = await req.json();
  const segments = await gatherSegments(type, trackId);

  const stream = new ReadableStream({
    async start(controller) {
      for (const segment of segments) {
        const chunk = await processSegment(segment);
        controller.enqueue(chunk);
      }
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="${generateFilename()}"`
    }
  });
}
```

### 2. Timeout Control
```typescript
// Next.js config
export const maxDuration = 300;  // 5 minutes

// Client retry mechanism
async function exportWithRetry() {
  let attempt = 0;
  while (attempt < 3) {
    try {
      return await exportAudio();
    } catch (err) {
      if (err.name === 'AbortError' && attempt < 2) {
        attempt++;
        continue;
      }
      throw err;
    }
  }
}
```

### 3. Parallel Processing
```typescript
const segmentBuffers = await Promise.all(
  segments.map(seg => extractSegment(seg.audioPath, seg.start, seg.duration))
);
```

---

## Error Handling

### 1. Audio File Not Found
```typescript
const audioPath = path.join(process.cwd(), 'public', track.audioUrl);
if (!fs.existsSync(audioPath)) {
  return new Response(
    JSON.stringify({ error: 'Source audio not found' }),
    { status: 404 }
  );
}
```

### 2. Empty Export List
```typescript
if (segments.length === 0) {
  return new Response(
    JSON.stringify({ error: 'No sentences to export' }),
    { status: 400 }
  );
}
```

### 3. FFmpeg Not Installed
```typescript
const hasFFmpeg = await new Promise(resolve => {
  ffmpeg.getAvailableFormats((err, formats) => {
    resolve(!err && formats.mp3);
  });
});

if (!hasFFmpeg) {
  console.error('FFmpeg not installed. Audio export disabled.');
}
```

### 4. Memory Limit
```typescript
if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
  if (global.gc) global.gc();

  if (process.memoryUsage().heapUsed > 500 * 1024 * 1024) {
    return new Response(
      JSON.stringify({ error: 'Server memory limit exceeded' }),
      { status: 503 }
    );
  }
}
```

### 5. Client Abort
```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 240000);

fetch('/api/audio/export', { signal: controller.signal })
  .catch(err => {
    if (err.name === 'AbortError') {
      alert('Export timeout. Try exporting fewer sentences.');
    }
  });
```

---

## Testing Strategy

### Unit Tests

**Audio Processing:**
```typescript
describe('Audio Export', () => {
  it('should extract correct segment from audio', async () => {
    const segment = await extractSegment('/fixtures/test.mp3', 10.5, 3.2);
    expect(segment.length).toBeGreaterThan(0);

    const duration = await getAudioDuration(segment);
    expect(Math.abs(duration - 3.2)).toBeLessThan(0.1);
  });

  it('should generate silence of correct duration', async () => {
    const silence = await generateSilence(2.0);
    const duration = await getAudioDuration(silence);
    expect(duration).toBeCloseTo(2.0, 1);
  });
});
```

**API Endpoint:**
```typescript
describe('/api/audio/export', () => {
  it('should return 400 for empty export list', async () => {
    const response = await POST({
      json: async () => ({ type: 'track', trackId: 'nonexistent' })
    });
    expect(response.status).toBe(400);
  });

  it('should return audio stream for valid request', async () => {
    const response = await POST({ json: async () => ({ type: 'all' }) });
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(response.headers.get('Content-Disposition')).toMatch(/DeepListener_Export_/);
  });
});
```

### Integration Test Scenarios

1. **Small Export** (5-10 sentences): Verify basic functionality
2. **Large Export** (100+ sentences): Verify performance and memory
3. **Cross-Track Export**: Verify grouping and sorting
4. **Today's Review Export**: Verify time filtering logic

---

## Configuration Requirements

### Environment Setup

**Install FFmpeg:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

**Verify Installation:**
```bash
ffmpeg -version
```

### Dependencies

```bash
npm install fluent-ffmpeg @types/fluent-ffmpeg
```

---

## Implementation Tasks

### Task 1: API Route Implementation
**Files:** `src/app/api/audio/export/route.ts`

**Steps:**
1. Create API route structure
2. Implement query logic for three export types
3. Add FFmpeg audio extraction functions
4. Implement silence generation
5. Add streaming response handler
6. Implement error handling
7. Add timeout configuration

**Commit:**
```bash
git add src/app/api/audio/export/route.ts
git commit -m "feat: implement audio export API route"
```

---

### Task 2: Vault Page Export Integration
**Files:** `src/app/vault/VaultListClient.tsx`

**Steps:**
1. Add export button component
2. Implement `exportAudio` function
3. Add loading state during export
4. Calculate today's due count
5. Test export functionality

**Commit:**
```bash
git add src/app/vault/VaultListClient.tsx
git commit -m "feat: add export buttons to vault page"
```

---

### Task 3: Review Page Export Integration
**Files:** `src/app/review/ReviewClient.tsx`

**Steps:**
1. Add floating export button
2. Integrate export logic
3. Add progress indicator

**Commit:**
```bash
git add src/app/review/ReviewClient.tsx
git commit -m "feat: add export button to review page"
```

---

### Task 4: Track Page Export Integration
**Files:** `src/app/practice/[id]/page.tsx` or client component

**Steps:**
1. Add export button to track header
2. Query track-specific review items
3. Pass trackId to export function

**Commit:**
```bash
git add src/app/practice/[id]/
git commit -m "feat: add export button to track practice page"
```

---

### Task 5: Testing & Documentation
**Files:** `__tests__/audio-export.test.ts`, `README.md`

**Steps:**
1. Create unit tests for audio functions
2. Create API integration tests
3. Test with various export sizes
4. Update README with export feature documentation
5. Add FFmpeg installation guide

**Commit:**
```bash
git add __tests__/ README.md
git commit -m "test: add audio export tests and documentation"
```
