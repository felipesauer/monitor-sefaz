---
mnema:
  key: MONITOR-14
  state: DONE
  title: 'CI: workflow de lint + typecheck + test'
  description: >-
    Adiciona .github/workflows/ci.yml rodando pnpm lint + typecheck + test em
    PRs e pushes para main (turbo ordena o build). Fecha a lacuna de não haver
    CI de testes. Setup no padrão dos workflows existentes; concurrency cancela
    redundantes.
  acceptance_criteria:
    - ci.yml roda lint+typecheck+test em pull_request e push para main
    - usa --frozen-lockfile (validado local)
    - 'CI verde no PR #8 (verify pass, 199 testes)'
  labels:
    - ci
    - infra
  estimate: 1
  priority: 3
  assignee: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  reporter: 019f493e-dc1e-779a-8f08-cf01d04c38c8
  epic_key: null
  sprint_key: null
  reopen_count: 0
  metadata: {}
  updated_at: '2026-07-10T14:27:51.744Z'
---
# CI: workflow de lint + typecheck + test
