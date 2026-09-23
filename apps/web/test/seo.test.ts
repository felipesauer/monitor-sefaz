import { describe, it, expect } from 'vitest';
import { ALL_UFS } from '@monitor-sefaz/catalog';
import {
  DEFAULT_SITE_URL,
  homeMeta,
  renderHead,
  resolveSiteUrl,
  ufMeta,
  verificationToken,
} from '../src/lib/seo.js';

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

describe('verificationToken', () => {
  it('aceita o código puro', () => {
    expect(verificationToken('X', 'abc123-XYZ_9')).toBe('abc123-XYZ_9');
    expect(verificationToken('X', '  1234ABCD  ')).toBe('1234ABCD');
  });

  it('aceita a <meta> inteira, como o Search Console e o Bing a mostram', () => {
    expect(
      verificationToken('X', '<meta name="google-site-verification" content="rXOxyZounnZ-8Z7o" />')
    ).toBe('rXOxyZounnZ-8Z7o');
    expect(verificationToken('X', "<meta name='msvalidate.01' content='0123ABCD'>")).toBe(
      '0123ABCD'
    );
  });

  it('ignora a variável vazia ou ausente', () => {
    expect(verificationToken('X', undefined)).toBeNull();
    expect(verificationToken('X', '   ')).toBeNull();
  });

  it('falha alto com colagem que não é código', () => {
    expect(() => verificationToken('GOOGLE_SITE_VERIFICATION', 'google123.html arquivo')).toThrow(
      /GOOGLE_SITE_VERIFICATION/
    );
    expect(() => verificationToken('X', '<meta name="x" content="a<b">')).toThrow();
  });
});

describe('descoberta do sitemap e verificação', () => {
  const siteUrl = 'https://exemplo.com.br/';

  it('aponta o sitemap em toda página', () => {
    expect(renderHead(homeMeta(siteUrl), siteUrl)).toContain(
      '<link rel="sitemap" type="application/xml" title="Sitemap" href="https://exemplo.com.br/sitemap.xml" />'
    );
  });

  it('só escreve as tags de verificação quando configuradas', () => {
    const without = renderHead(homeMeta(siteUrl), siteUrl);
    expect(without).not.toContain('google-site-verification');
    expect(without).not.toContain('msvalidate.01');

    const withBoth = renderHead(homeMeta(siteUrl), siteUrl, { google: 'g-123', bing: 'B456' });
    expect(withBoth).toContain('<meta name="google-site-verification" content="g-123" />');
    expect(withBoth).toContain('<meta name="msvalidate.01" content="B456" />');
  });
});
