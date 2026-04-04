export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description: string;
  state: string;
}

export interface Tracker {
  getIssues(): Promise<Issue[]>;
}

interface LinearConfig {
  api_key?: string;
  project_slug?: string;
}

export class LinearTracker implements Tracker {
  private apiKey: string;

  constructor(private config: LinearConfig) {
    this.apiKey = config.api_key || process.env.LINEAR_API_KEY || '';
  }

  async getIssues(): Promise<Issue[]> {
    if (!this.apiKey || this.apiKey.includes('$') || this.apiKey === 'your_linear_api_key_here') {
      return this.getMockIssues();
    }
    
    // In a real implementation, you'd use a GraphQL library to fetch from Linear
    console.log(`Polling Linear API for project ${this.config.project_slug}...`);
    return [];
  }

  private async getMockIssues(): Promise<Issue[]> {
    return [
      {
        id: '1',
        identifier: 'DL-101',
        title: 'Fix phonetic notation rendering in practice mode',
        description: 'Phonetic symbols are not correctly displayed on some mobile devices.',
        state: 'Todo',
      },
    ];
  }
}
