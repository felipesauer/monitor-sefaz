import { describe, it, expect } from 'vitest';
import { ALL_UFS } from '@monitor-sefaz/catalog';
import { DEFAULT_SITE_URL, homeMeta, renderHead, resolveSiteUrl, ufMeta } from '../src/lib/seo.js';

describe('ufMeta', () => {
  const siteUrl = 'https://exemplo.com.br/';
  const lastmod = '2026-09-23T10:00:00-03:00';
  const all = ALL_UFS.map((uf) => ufMeta(uf, siteUrl, lastmod));

  it('mira as buscas por estado no título e na descrição', () => {
    const sp = ufMeta('SP', siteUrl, lastmod);
    expect(sp.title).toBe('SEFAZ-SP fora do ar ou instável? Status da NF-e hoje');
    expect(sp.description).toContain('A SEFAZ-SP está fora do ar ou instável hoje?');
    expect(sp.description).toContain('em São Paulo');
    expect(sp.url).toBe('https://exemplo.com.br/sefaz-sp/');
  });

  it('cabe no que o Google exibe, em todas as UFs', () => {
    for (const meta of all) {
      expect(meta.title.length, meta.title).toBeLessThanOrEqual(60);
      expect(meta.description.length, meta.description).toBeLessThanOrEqual(160);
    }
  });

  it('não repete título nem descrição entre UFs', () => {
    expect(new Set(all.map((m) => m.title)).size).toBe(27);
    expect(new Set(all.map((m) => m.description)).size).toBe(27);
  });

  it('descreve a página e a trilha em JSON-LD', () => {
    const graph = ufMeta('RS', siteUrl, lastmod).jsonLd['@graph'] as Record<string, unknown>[];
    expect(graph[0]).toMatchObject({
      '@type': 'WebPage',
      url: 'https://exemplo.com.br/sefaz-rs/',
      dateModified: lastmod,
      about: { '@type': 'State', name: 'Rio Grande do Sul' },
    });
    expect(graph[1]).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, item: siteUrl },
        { position: 2, name: 'SEFAZ-RS', item: 'https://exemplo.com.br/sefaz-rs/' },
      ],
    });
  });
});

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
