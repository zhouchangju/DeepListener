import { NextResponse } from 'next/server';
import { readFile, access } from 'fs/promises';
import path from 'path';

const OFFLINE_PAYLOAD = {
  last_poll: null,
  active_agents: [],
  status: 'offline',
} as const;

export async function GET() {
  const statePath = path.join(process.cwd(), '.symphony_state.json');

  try {
    // Use async fs so the event loop is not blocked while the state file is
    // read. A missing file means the symphony runner has not written state
    // yet, which is a normal "offline" condition rather than an error.
    await access(statePath);
    const content = await readFile(statePath, 'utf8');
    const state = JSON.parse(content);
    return NextResponse.json({ ...state, status: 'online' });
  } catch (error: unknown) {
    // ENOENT → offline (runner has not produced state yet). Anything else
    // (permission denied, corrupt JSON) is reported as a 500 with the file
    // absent case mapped to the offline payload.
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') {
      return NextResponse.json(OFFLINE_PAYLOAD);
    }
    return NextResponse.json({ error: 'Failed to read state' }, { status: 500 });
  }
}
