import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { AuthProvider } from '@/auth/AuthProvider';
import { SavedTrailsProvider } from '@/saved/SavedTrailsProvider';
import { ToastProvider } from '@/components/Toast';
import HomePage from '@/pages/Home';
import NotFoundPage from '@/pages/NotFound';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <AuthProvider>
          <SavedTrailsProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </SavedTrailsProvider>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('application shell', () => {
  it('renders the homepage hero, navigation and live sample content', async () => {
    // jsdom does not implement scrolling; Layout calls it on route changes.
    window.scrollTo = vi.fn();

    renderAt('/');

    expect(screen.getByRole('heading', { level: 1, name: /The Himalaya, without the guesswork/i })).toBeTruthy();
    expect(screen.getAllByRole('navigation', { name: /navigation/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('main')).toBeTruthy();

    // The homepage loads from the sample repository without any network access.
    await waitFor(
      () => {
        expect(screen.getAllByText('Everest Base Camp Trek').length).toBeGreaterThan(0);
        expect(screen.getByText('Popular destinations')).toBeTruthy();
      },
      { timeout: 5000 },
    );

    // Statistics are derived from the dataset, not hard-coded marketing numbers.
    expect(screen.getByText('trails mapped')).toBeTruthy();
  });

  it('renders a helpful not-found page for unknown routes', async () => {
    window.scrollTo = vi.fn();
    renderAt('/does-not-exist');

    expect(await screen.findByRole('heading', { level: 1, name: /not on the map/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Browse trails/i })).toBeTruthy();
  });
});
