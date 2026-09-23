import { describe, it, expect } from 'vitest';
import { DEFAULT_SITE_URL, homeMeta, renderHead, resolveSiteUrl } from '../src/lib/seo.js';

describe('resolveSiteUrl', () => {
  it('usa o deploy oficial quando SITE_URL não vem', () => {
    expect(resolveSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(resolveSiteUrl('  ')).toBe(DEFAULT_SITE_URL);
  });

  it('garante a barra final, que canonical e og:url esperam', () => {
    expect(resolveSiteUrl('https://exemplo.com.br/monitor')).toBe(
      'https://exemplo.com.br/monitor/'
    );
    expect(resolveSiteUrl('https://exemplo.com.br/')).toBe('https://exemplo.com.br/');
  });
});

describe('renderHead', () => {
  const siteUrl = 'https://exemplo.com.br/';

  it('escreve title, description, canonical, Open Graph e JSON-LD', () => {
    const head = renderHead(homeMeta(siteUrl), siteUrl);
    expect(head).toContain('<title>Monitor SEFAZ — Status em Tempo Real');
    expect(head).toContain('<link rel="canonical" href="https://exemplo.com.br/" />');
    expect(head).toContain('<meta property="og:url" content="https://exemplo.com.br/" />');
    expect(head).toContain('content="https://exemplo.com.br/og-image.png"');

    const ld = /<script type="application\/ld\+json">(.*)<\/script>/.exec(head)?.[1];
    expect(JSON.parse(ld ?? '')).toMatchObject({ '@type': 'WebApplication', url: siteUrl });
  });

  it('escapa atributos e não deixa o JSON-LD fechar o <script>', () => {
    const head = renderHead(
      {
        ...homeMeta(siteUrl),
        description: 'aspas " e <tags>',
        jsonLd: { name: '</script><script>alert(1)</script>' },
      },
      siteUrl
    );
    expect(head).toContain('content="aspas &quot; e &lt;tags&gt;"');
    expect(head).not.toContain('</script><script>');
    expect(head.match(/<\/script>/g)).toHaveLength(1);
  });
});
