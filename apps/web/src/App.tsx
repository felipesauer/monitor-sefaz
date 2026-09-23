import { DashboardPage } from './pages/DashboardPage.js';
import { UfPage } from './pages/UfPage.js';
import { pageId, type Page } from './lib/pages.js';

export function App({ page }: { page: Page }) {
  // O data-page vai no HTML pré-renderizado: é como o cliente sabe qual
  // página hidratar sem depender do formato da URL.
  return (
    <div data-page={pageId(page)}>
      {page.kind === 'uf' ? <UfPage uf={page.uf} /> : <DashboardPage />}
    </div>
  );
}
