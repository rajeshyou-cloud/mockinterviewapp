import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), getDashboard: vi.fn() }));
vi.mock('../../../../lib/auth/access', () => ({ requireRole: mocks.requireRole }));
vi.mock('../../../../lib/project-flow-dashboard', () => ({ getProjectFlowDashboard: mocks.getDashboard }));

import ProjectFlowPage from './page';

describe('Project Flow stakeholder dashboard', () => {
  it('renders the lifecycle, schema, portfolio, review and publication story on one page', async () => {
    mocks.getDashboard.mockResolvedValue({
      source: 'json-transition',
      totals: { questions: 1050, technologies: 7, topics: 98, versions: 1050, evidenceSources: 1476, evidenceLinks: 1476, reviewRecords: 686, publicationBatches: 0, legacyReleased: 300 },
      lifecycle: [
        { key: 'created', label: 'Created & versioned', count: 1050, explanation: 'Stable IDs.' },
        { key: 'published', label: 'Governed batch published', count: 0, explanation: 'Controlled release.' },
      ],
      statuses: [{ status: 'draft', count: 707 }, { status: 'ai-evidence-verified', count: 343 }],
      technologies: [{ technology: 'aws', total: 150, draft: 126, verified: 24, human: 0, evidence: 600 }],
      evidenceCategories: [{ category: 'uncategorized official evidence', count: 1476 }],
      reviewers: [], batches: [], bottleneck: '707 questions remain outside a verified state.',
    });
    const html = renderToStaticMarkup(await ProjectFlowPage());
    expect(mocks.requireRole).toHaveBeenCalledWith(['reviewer']);
    expect(html).toContain('How governed content moves from evidence to candidates');
    expect(html).toContain('Question lifecycle');
    expect(html).toContain('question_versions');
    expect(html).toContain('Technology pipeline');
    expect(html).toContain('No governed publication batch is live');
  });
});
