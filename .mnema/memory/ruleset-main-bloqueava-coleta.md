---
title: "Ruleset protect-main x coleta automática (regra pull_request removida)"
topics: []
created_at: 2026-07-10T15:22:12.492Z
updated_at: 2026-07-10T15:22:58.401Z
---
Ruleset protect-main (id 18771541) na branch main. Incluía a regra pull_request (exigir PR + 1 approval), bypass só para RepositoryRole Admin (id 5).

PROBLEMA: collect.yml faz git push direto na main como github-actions[bot]. O bot não é admin, então o push era recusado com GH013 Repository rule violations — a coleta rodava (135 serviços OK) mas o step Commitar dados atualizados falhava e o site parava de atualizar. Também explica o aviso "Changes must be made through a pull request" nos pushes manuais do dono (passavam por ser admin).

Isentar o Actions via bypass Integration FALHOU em repo pessoal (must be part of owner organization).

SOLUCAO aplicada e verificada: removida só a regra pull_request via gh api PUT rulesets/18771541. Mantidas deletion, non_fast_forward, required_linear_history e o bypass admin. Coleta pós-fix rodou success. Para reativar PR obrigatório, a coleta teria de abrir/mergear PR em vez de push direto.</content>
<topics>["ci", "ruleset", "coleta", "infra"]</topics>

