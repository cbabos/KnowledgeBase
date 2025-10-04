import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import App from '../components/App/App';

// Mock fetch globally
const originalFetch = global.fetch as any;

beforeAll(() => {
  // @ts-ignore
  global.fetch = vi.fn((url: any, options?: any) => {
    const urlStr = typeof url === 'string' ? url : url?.url || '';
    if (urlStr.includes('/api/tools')) {
      return Promise.resolve({
        ok: true,
        json: async () => [
          { name: 'answer_question', description: 'Answer', input_schema: {} },
          { name: 'search_notes', description: 'Search', input_schema: {} },
        ],
      });
    }
    if (urlStr.includes('/api/request')) {
      const body = JSON.parse(options?.body || '{}');
      if (body.tool === 'answer_question') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              answer: 'Mocked answer',
              confidence: 'high',
              context_chunks: 1,
              citations: [
                {
                  document_id: '00000000-0000-0000-0000-000000000001',
                  filename: 'doc.md',
                  path: '/tmp/doc.md',
                  chunk_id: 1,
                  excerpt: 'Example excerpt',
                  used_version: 1,
                  latest_version: 2,
                  is_latest: false,
                },
              ],
            },
          }),
        });
      }
      // Default successful empty response
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: null }),
      });
    }
    // Default
    return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
  });
});

afterAll(() => {
  // @ts-ignore
  global.fetch = originalFetch;
});

test('lands on Q&A tab by default', async () => {
  render(<App />);
  await waitFor(() =>
    expect(screen.getByText('Ask a Question')).toBeInTheDocument()
  );
});

test('renders version information in citations', async () => {
  render(<App />);

  const input = await screen.findByPlaceholderText(
    'Ask a question about your knowledge base...'
  );
  fireEvent.change(input, { target: { value: 'What is doc?' } });
  fireEvent.click(screen.getByText('Ask'));

  await waitFor(() => {
    expect(screen.getByText('Sources (1)')).toBeInTheDocument();
  });

  // Show details to reveal citation body
  fireEvent.click(screen.getByText('Show Details'));

  // Version badges
  expect(screen.getByText('v1')).toBeInTheDocument();
  expect(screen.getByText(/Latest: v2/)).toBeInTheDocument();
  expect(screen.getByText('(Outdated)')).toBeInTheDocument();
});
