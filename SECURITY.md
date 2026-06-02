# Política de Segurança

## 🛡️ Versões suportadas

Por ser um projeto em evolução, apenas a versão mais recente da branch `main`
recebe correções de segurança.

| Versão | Suporte |
| ------ | ------- |
| `main` (mais recente) | ✅ |
| versões anteriores | ❌ |

## 📣 Reportando uma vulnerabilidade

**Não abra uma issue pública** para falhas de segurança.

Use o canal privado do GitHub:

1. Acesse a aba **[Security → Report a vulnerability](https://github.com/felipesauer/monitor-sefaz/security/advisories/new)**
   do repositório (GitHub Security Advisories).
2. Descreva a falha, o impacto e, se possível, passos para reproduzir.

Se preferir, abra uma issue **sem detalhes sensíveis** apenas pedindo um canal de
contato privado.

**Resposta esperada:** confirmação de recebimento em até alguns dias e um plano de
correção combinado de forma responsável (coordinated disclosure) antes da
publicação dos detalhes.

## 🔍 Escopo e modelo de ameaça

Pontos relevantes ao avaliar segurança neste projeto:

- **Dados públicos:** o modo padrão apenas **lê** a página pública de
  disponibilidade da SEFAZ. Não há autenticação nem dados de contribuintes.
- **Certificado A1:** usado **somente** no modo `soap` opcional, lido de um
  arquivo local (`SEFAZ_CERT_PATH`) e nunca versionado nem transmitido a
  terceiros. **Nunca** faça commit de arquivos `.pfx`/`.p12` ou senhas.
- **Segredos:** mantenha tokens e credenciais fora do repositório; use variáveis
  de ambiente / secrets do GitHub Actions.
- **Sem coleta de dados de usuários:** a SPA é estática e não rastreia visitantes.

## 🤝 Reconhecimento

Pesquisadores que reportarem vulnerabilidades de forma responsável serão
creditados (se desejarem) nas notas da correção.
