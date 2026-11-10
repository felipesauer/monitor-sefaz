---
'@monitor-sefaz/contracts': minor
---

Passa a usar o zod 4 (4.6.7), que corrige a vulnerabilidade GHSA-mrhx-c7xc-m3w5 (consumo de memória ao validar coleções grandes com restrições).

Os esquemas exportados continuam com os mesmos nomes, os mesmos campos e a mesma regra de validação: os snapshots, o histórico, o resumo e as notas técnicas são aceitos exatamente como antes. O que muda para quem consome o pacote:

- Os esquemas agora são objetos do zod 4. Quem os compõe com código próprio em zod 3 (`.extend`, `z.union` e afins) precisa atualizar para o zod 4. Quem só chama `.parse`/`.safeParse` ou usa os tipos `*DTO` não precisa mudar nada.
- Os códigos de erro seguem o zod 4: um valor fora de um enum vem como `invalid_value`, em vez de `invalid_enum_value`.
