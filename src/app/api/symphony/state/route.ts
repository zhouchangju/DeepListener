import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const statePath = path.join(process.cwd(), '.symphony_state.json');
  
  if (!fs.existsSync(statePath)) {
    return NextResponse.json({ 
      last_poll: null, 
      active_agents: [],
      status: 'offline' 
    });
  }

  try {
    const content = fs.readFileSync(statePath, 'utf8');
    const state = JSON.parse(content);
    return NextResponse.json({ ...state, status: 'online' });
  } catch {
    return NextResponse.json({ error: 'Failed to read state' }, { status: 500 });
  }
}
