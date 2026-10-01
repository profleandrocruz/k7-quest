# Registro de playtests

Cada sessão de playtest vira uma linha aqui. O motivo da tabela existe em
`GAME_DESIGN_CONTEXT_PROCESSO.md` (cap. 25): **um número em `gameBalance.ts` muda porque alguém
sentiu algo**, e o "porquê" é a única parte que não está no código.

## Estado atual

**Nenhuma sessão com jogador humano ainda.** Isso é o fato mais importante deste arquivo, e é a razão
de o vertical slice existir: ele está pronto para ser testado, não testado.

O que já foi validado até agora é **validação automatizada**, que é outra coisa:

| Validação | Onde | O que prova |
|---|---|---|
| 4 fases são jogáveis | `domain.test.ts` → `validateAllLevels` | Objetivo alcançável em cada era |
| O validador não é decorativo | `domain.test.ts` → "o teste do teste" | Uma fase selada é reprovada |
| Determinismo e replay | `domain.test.ts` → "determinismo" | Mesmo script, mesmo estado |
| O objetivo conta a fase | `domain.test.ts` → "objetivos" | Fragmentos do bolso não completam a fase |
| A troca de era é justa | `domain.test.ts` → "troca de era" | Posição preservada; bloqueio legível |

Nenhuma dessas respostas substitui um jogador dizendo "eu não entendi por que aquilo estava
bloqueado".

## Como registrar uma sessão

```markdown
### 2026-XX-XX — <descrição curta>

| Campo | Valor |
|---|---|
| Perfil | Quem jogou (idade, joga plataforma? frequência?) |
| Versão | `?seed=` usado, ou "qualquer" |
| Objetivo da sessão | A **uma** pergunta (Lente #91) |
| Duração | Minutos Effective Play Time |

**Observações** (comportamento, não opinião):
- Onde hesitou:
- Onde errou do mesmo jeito duas vezes:
- Pediu ajuda? Em quê?
- Disse que não entendeu o quê?
- Curva de interesse desenhada pelo jogador vs. a esperada:

**Decisão tomada:** o que muda, e onde (arquivo + número em `gameBalance.ts`).
```

## Sessões

_(nenhuma ainda)_
