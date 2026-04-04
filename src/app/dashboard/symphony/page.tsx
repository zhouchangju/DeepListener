'use client';

import React, { useEffect, useEffectEvent, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActiveAgent {
  issue_id: string;
  issue_title: string;
  start_time: string;
  workspace: string;
}

interface SymphonyState {
  status: 'online' | 'offline';
  last_poll: string | null;
  active_agents: ActiveAgent[];
}

export default function SymphonyDashboard() {
  const [state, setState] = useState<SymphonyState | null>(null);

  const fetchState = useEffectEvent(async () => {
    try {
      const res = await fetch('/api/symphony/state');
      const data: SymphonyState = await res.json();
      setState(data);
    } catch (err) {
      console.error('Failed to fetch Symphony state', err);
    }
  });

  useEffect(() => {
    const poll = () => {
      void fetchState();
    };

    const timer = window.setTimeout(poll, 0);
    const interval = window.setInterval(poll, 5000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  if (!state) return <div className="p-8">Loading Symphony status...</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Symphony Dashboard</h1>
        <div className="flex items-center gap-2">
          <Badge variant={state.status === 'online' ? 'default' : 'destructive'}>
            {state.status.toUpperCase()}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Last Poll: {state.last_poll ? new Date(state.last_poll).toLocaleTimeString() : 'Never'}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{state.active_agents.length}</div>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mt-8">Active Runs</h2>
      {state.active_agents.length === 0 ? (
        <p className="text-muted-foreground">No active agents running.</p>
      ) : (
        <div className="grid gap-4">
          {state.active_agents.map((agent) => (
            <Card key={agent.issue_id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    <span className="font-mono text-blue-500 mr-2">{agent.issue_id}</span>
                    {agent.issue_title}
                  </CardTitle>
                  <Badge>RUNNING</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><span className="font-semibold">Started:</span> {new Date(agent.start_time).toLocaleString()}</p>
                <p><span className="font-semibold">Workspace:</span> <code className="bg-muted px-1 rounded">{agent.workspace}</code></p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
