# Decision Log

Durable decisions that future agents should inherit.

| ID | Decision | Reason | Owner | Date | Impact | Related Items |
|---|---|---|---|---|---|---|
| DEC-001 | Use SQLite for local database | Simple, portable, sufficient for single-user app | Project owner | 2026-01 | All data operations use Prisma with SQLite | prisma/schema.prisma |
| DEC-002 | Use undici ProxyAgent for proxy | Node.js 18+ fetch ignores HTTP_PROXY; needed for OpenAI/Google in restricted networks | Project owner | 2026-01 | Transcription providers require proxy config | src/lib/transcription/ |
| DEC-003 | Server Components + Client Hydration | Data fetching on server, interactivity on client | Project owner | 2026-01 | All routes use RSC for data, client components for UI | src/app/ |
| DEC-004 | Factory pattern for transcription | Multi-provider support with env-based selection | Project owner | 2026-01 | Adding new providers requires factory update | src/lib/transcription/factory.ts |
| DEC-005 | FSRS-4.5 for spaced repetition | State-of-the-art SRS algorithm with stability/difficulty | Project owner | 2026-02 | Review system depends on FSRS parameters | src/lib/fsrs.ts |
| DEC-006 | Zero-delay shadowing via AudioBuffer | Pre-decode entire audio, slice in memory for immersion | Project owner | 2026-02 | ShadowingConsole requires full audio decode on load | src/components/feature/ShadowingConsole.tsx |
| DEC-007 | Colocated tests alongside source | Co-locate *.test.ts with implementation for discoverability | Project owner | 2026-05 | All test files live next to source files | src/**/*.test.ts |
| DEC-008 | Agent harness with Contract/Adversarial modes | Protect production data while enabling safe iteration | Project owner | 2026-06 | All non-trivial changes require harness workflow | docs/agent-harness/ |
