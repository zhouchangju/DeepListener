# Demo Asset Provenance (DFS-002)

DeepListener ships one bundled demo so a new user can experience the
sentence-level learning loop without an API key or media import.

## Audio

| Asset | Path | Source | License |
|---|---|---|---|
| `demo-listening.mp3` | `public/demo/demo-listening.mp3` | Locally generated with Piper TTS 1.6.0 en_US-joe-medium; model and metadata: rhasspy/piper-voices | CC0 1.0 voice dataset (OHF-Voice voice-datasets); no model/runtime is redistributed |

Duration: 18.4s. Encoded to mono 22.05 kHz MP3 @ 64 kbps
for small bundle size. Speech needs little bitrate; this is intentionally
compact.

## Timeline

The bundled sentence timeline is authored in `src/lib/demo-seed.ts`
(`DEMO_SENTENCES`). It contains 6 sentence cues mapped to time
offsets within the clip. No provider transcription call is made for the demo
(DFS-002: the demo path never contacts an external provider).

Re-generated on 2026-08-05 by `scripts/replace-demo-audio.mjs`.

## Ownership / isolation

Demo records use `Track.trackType = "DEMO"` so they are distinguishable from
personal library data and removable without affecting personal tracks, notes,
or review history (DFS-004). See `src/lib/demo-seed.ts`.

## Checksum

```
afcbbf03f432d8954ae70f6a077060f498ced33ef0021a79f890c8e6f35fb1c4  public/demo/demo-listening.mp3
```

The replacement command intentionally records public provenance rather than a
maintainer's machine-local source path.

## References

- Voice model: <https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US/joe/medium>
- Training dataset and CC0 terms: <https://github.com/OHF-Voice/voice-datasets>
- Piper generation tooling (used only during asset preparation): <https://github.com/OHF-voice/piper1-gpl>
