/**
 * Despachante da coleta. O Cron Trigger do Worker não coleta mais: no plano
 * Workers Free cada execução agendada tem 10 ms de CPU, e uma rodada de coleta
 * gasta ~160 ms, então mais da metade era cortada (`exceededResources`). O
 * trabalho pesado foi para o GitHub Actions; daqui só sai o pedido, uma chamada
 * de API com CPU desprezível.
 */

/** Workflow que faz a coleta, no branch padrão. */
export const COLLECT_WORKFLOW = 'collect.yml';

export interface DispatchEnv {
  /** Token fine-grained: só este repositório, Actions: read and write. */
  GITHUB_DISPATCH_TOKEN?: string;
  /** `dono/repo`; vem do `[vars]` do wrangler.toml. */
  GITHUB_REPOSITORY?: string;
}

export interface DispatchResult {
  readonly ok: boolean;
  readonly status: number | null;
  readonly detail: string;
}

/** Pede ao GitHub uma execução do `collect.yml` no `main`. Nunca lança. */
export async function dispatchCollect(
  env: DispatchEnv,
  fetchImpl: typeof fetch = fetch
): Promise<DispatchResult> {
  if (!env.GITHUB_DISPATCH_TOKEN || !env.GITHUB_REPOSITORY) {
    return {
      ok: false,
      status: null,
      detail: 'sem GITHUB_DISPATCH_TOKEN ou GITHUB_REPOSITORY; nada a despachar',
    };
  }
  const url = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${COLLECT_WORKFLOW}/dispatches`;
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_DISPATCH_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'monitor-sefaz-worker',
      },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (res.status === 204) {
      return { ok: true, status: 204, detail: 'coleta despachada' };
    }
    const body = (await res.text()).slice(0, 200);
    return { ok: false, status: res.status, detail: body };
  } catch (err) {
    return { ok: false, status: null, detail: err instanceof Error ? err.message : String(err) };
  }
}
