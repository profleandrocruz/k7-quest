# Contexto de Processo — Derivado de *The Art of Game Design: A Book of Lenses* (3ª ed.)

> Complemento de `GAME_DESIGN_CONTEXT.md`. Aqui estão os **processos de trabalho** do livro, aplicados a
> sprints, backlog, protótipos e rituais de time em um projeto de jogo React.

---

## 1. A Regra do Loop (Cap. 7) — o princípio inegociável

> **"The Rule of the Loop: The more times you test and improve your design, the better your game will be."**
>
> *"A Regra do Loop não é uma lente, porque não é uma perspectiva — é uma verdade absoluta. Não há exceções."*

**Consequências diretas para o processo:**

1. **O modelo cascata está morto** (Lente #93 — o "waterfall" viola a Regra do Loop). Não existe
   "terminar o GDD, depois implementar, depois testar". Existe construir → testar → aprender → repetir.
2. **Cada loop deve valer a pena** (Loop Question 1: *how can I make every loop count?*):
   um loop que só confirma o que você já sabia é desperdício.
3. **Loops rápidos > loops completos** (Loop Question 2: *how can I loop as fast as possible?*):
   protótipo feio rodando hoje ensina mais que protótipo bonito na semana que vem.
4. **O trabalho nunca termina, apenas é abandonado.** O objetivo não é "ficar perfeito"; é acumular
   loops suficientes dentro do orçamento de tempo.

### 1.1 O modelo espiral na prática

```
1. Ideia básica de design
2. Identificar os MAIORES RISCOS do design
3. Construir prototipos que MITIGAM esses riscos
4. Testar os prototipos
5. Detalhar o design com base no que foi aprendido
6. Voltar ao passo 2
```

**Adaptação para um time React:**
- O passo 3 quase sempre cabe em **um componente isolado** + regras puras em `src/game/`.
- O passo 4 inclui **protótipos de teste rápido**: uma página oculta (`/debug`) que permite rodar a mecânica
  isolada com parâmetros ajustáveis, sem depender de menus, arte final ou áudio.
- Artes finais, telas de menu e polimento de UI ficam **para depois** de o núcleo ser divertido.

**Métrica de saúde do projeto:** quantos loops completos (construir → humano joga → ajustar) o time executou
no último mês? Se a resposta for menor que 1, o processo está engessado.

---

## 2. Risco e Prototipagem (Lente #14)

> *"Reduza ou elimine os riscos o mais cedo possível, geralmente construindo pequenos protótipos."*

**Riscos típicos de um jogo em React e como mitigá-los:**

| Risco | Protótipo de mitigação | Nota |
|---|---|---|
| "Não sabemos se a mecânica é divertida" | Protótipo 2D/DOM simplificado da mecânica, sem arte | Lentes #3, #15 |
| "Não sabemos se o React aguenta N objetos" | Protótipo que só desenha N elementos e mede FPS | Lente #92 — puramente técnico, sem gameplay |
| "Não sabemos se a progressão funciona" | Script de simulação rodando 1000 partidas headless | só possível com regras puras |
| "Não sabemos se o jogador entende a tela" | Playtest com wireframe antes de estilizar | Lentes #48, #57 |
| "Não sabemos se o público gosta do tema/estética" | Mockups estáticos + moodboard | Lente #63 |

**Protótipos são descartáveis por definição.** Se você começar a "limpar o código do protótipo" para
transformá-lo em produção, você traiu o objetivo do protótipo — que era **responder uma pergunta**.

### 2.1 Regras práticas de prototipagem

- **Nunca:** construir primeiro o menu, o sistema de save, o lobby, o polimento visual, o sistema de
  configurações. Nada disso responde "o jogo é divertido?".
- **Sempre:** construir primeiro a mecânica central, jogável em 1 minuto, por uma pessoa sozinha.
- **Inversão de prioridade:** o protótipo precisa ser **feio e rápido**, não bonito e completo.
- **Dica do livro — "escreva o código de baixo nível que não muda em algo estático, e o de alto nível
  em algo dinâmico, que muda rápido"**: em React isso se traduz em regras puras e estáveis
  (`src/game/`) com uma camada de apresentação **descartável e substituível**.
- **Registre o aprendizado de cada protótipo** (Lente #90). Um protótipo sem anotação de resultado é
  dinheiro jogado fora.

---

## 3. Os Oito Filtros (Lente #13) — porteiro de qualquer ideia

> *"Você só pode chamar seu design de pronto quando ele passa por todos os oito filtros sem exigir mudança."*

Antes de uma ideia virar item de backlog, ela precisa sobreviver a estas oito perguntas:

1. **Este jogo parece certo?** (sensação / instinto — Lente #47)
2. **O público-alvo vai gostar o suficiente?** (Lente #16)
3. **É um jogo bem projetado?** (Lentes #1–#12)
4. **É novo o suficiente?** (Lente #62)
5. **Vai vender / vai ter adesão?** (Lente #96)
6. **É tecnicamente possível construir?** (Lente #92)
7. **Atende às nossas metas sociais e de comunidade?** (Lentes #84–#88)
8. **Os playtesters gostam o suficiente?** (Lente #91)

**Filtros adicionais, se aplicáveis ao seu caso:**
- É um jogo educativo? *"Ensina o que deveria ensinar?"*
- É uma demo/portfólio? *"Mostra a habilidade que eu quero demonstrar em 60 segundos?"*
- Tem cliente? *"Atende ao que o cliente realmente quer?"* (Lente #94)

**Uso prático:** toda ideia nova no backlog deve ter, no corpo da issue, uma linha respondendo aos filtros
que ela afeta. Uma ideia que falha em um filtro **não é descartada** — é *reformulada* até passar.

---

## 4. Documentação (Lente #90)

> *"O propósito de um documento é (a) ajudar a lembrar e (b) ajudar a comunicar."*
> *"Desconfie do mito do Game Design Document: um documento não nasce pronto, ele **cresce em torno do design**."*

**Perguntas da lente:**
- O que precisamos **lembrar** enquanto fazemos este jogo?
- O que precisa ser **comunicado** enquanto fazemos este jogo?

**Tradução para um projeto React (documentos que valem a pena):**

| Documento | Formato | Propósito | Onde vive |
|---|---|---|---|
| Experiência Essencial | 1 frase no README | Alinhar o time e as decisões (Lente #1) | `README.md` |
| Declaração do Problema | parágrafo curto | Definir escopo e restrições (Lente #12) | `docs/vision.md` |
| Tabela de balanceamento | objeto TS comentado | Lembrar a intenção de cada número (Lente #47) | `src/game/gameBalance.ts` |
| Decisões de design (ADR) | arquivos curtos datados | Não repetir discussões | `docs/decisions/NNN-titulo.md` |
| Registro de playtests | tabela por sessão | Evidência do que mudou e por quê | `docs/playtests.md` |
| Roadmap de loops | lista de hipóteses a validar | Foco em risco, não em features | `docs/loops.md` |

**Regra:** se o documento não ajuda a lembrar nem a comunicar, **não escreva**. Todo documento é código
morto em potencial: só mantenha o que o time realmente consulta.

---

## 5. Tecnologia com cabeça fria (Lentes #92, #93)

> *"É difícil estudar as estrelas quando o sol está fora. É difícil estudar design de jogos quando a
> tecnologia está na sala."*

**Foundational vs. Decorational:**
- **Tecnologia foundational** = torna possível uma **experiência nova** (o cupcake sem o qual não há cupcake).
- **Tecnologia decorational** = apenas melhora o que já existia (a cereja e a cobertura).

**Perguntas obrigatórias antes de adotar qualquer coisa nova (biblioteca, engine, padrão):**
- Isso viabiliza uma experiência **nova**, ou só deixa a existente "um pouco melhor"?
- Se é decorational: **vale o custo de complexidade e o risco de Hype Cycle?**

**Hype Cycle e o Dilema do Inovador:**
- Tecnologias passam por *auge de expectativas infladas* → *desilusão* → *platô de produtividade*.
  Adotar no auge é caro e arriscado; adotar tarde demais é perder relevância.
- O jogo deve ser capaz de sobreviver à próxima onda (Lente #93 — Bola de Cristal): por isso **isolar a
  tecnologia** (React, canvas, input, storage) atrás de interfaces estáveis, com regras puras no centro.

**Cuidado de engenharia (o pecado do "bilionário bêbado"):**
Nunca deixe a empolgação técnica ditar o design. Se a decisão de arquitetura não pode ser explicada em
termos de **experiência do jogador**, ela precisa de uma justificativa de manutenibilidade — e nada mais.


---

## 6. Playtest (Lente #91) — as cinco perguntas

Playtest não é QA. QA verifica se o jogo **funciona**; playtest descobre se o jogo **funciona como
experiência**.

### 6.1 Por quê? (a pergunta mais importante)
Nunca faça playtest "para ver no que dá". Defina **uma** pergunta principal:
- "O jogador entende o que fazer nos primeiros 30 segundos?" (Lente #48)
- "O desafio fica no canal de fluxo?" (Lente #18)
- "O jogador sente que suas escolhas importam?" (Lente #32)
- "Onde ele fica entediado ou frustrado?" (Lentes #18, #31)
- "Ele compreende por que ganhou/perdeu?" (Lente #30)

### 6.2 Quem? (um playtest com a pessoa errada é pior que nenhum)
- Se o problema é **clareza/onboarding**, o ideal é **um jogador novo** no gênero.
- Se o problema é **profundidade/balanceamento**, jogadores experientes no gênero.
- **Você não pode ser o seu próprio playtester** para validar clareza: você já sabe demais.
- Anote o perfil de cada playtester junto com a sessão.

### 6.3 Onde?
Ambiente controlado, sem interrupções. Em remoto, exija **compartilhamento de tela + áudio** e que o
jogador **não seja instruído durante a sessão** — a instrução é justamente o dado mais valioso
(sua ausência revela o que falta na interface).

### 6.4 O que observar? (a parte que a maioria erra)
Não pergunte "você gostou?". Observe **comportamento**:
- Onde ele **hesita**? Onde ele **ignora** informação que você colocou na tela?
- Onde ele **não sabe para onde ir**? Onde ele **morre repetidamente**? Onde ele **para de reagir**?
- Ele **pede ajuda**? Ele **culpa o jogo**? (culpar o jogo = falha de feedback/transparência, Lentes #56/#57)
- Sinais de **fluxo**: silêncio, concentração, lentidão em responder (Lente #18).
- Ele **muda de estratégia**? Se não muda nunca, talvez não haja escolha significativa (Lente #32).

### 6.5 Como coletar?
- **Nunca** explique, nunca defenda, nunca corrija na frente do jogador. Anote.
- Prefira perguntas abertas e depois fechadas: *"O que você estava tentando fazer ali?"*
  *"O que você achou que ia acontecer?"* *"O que você não entendeu?"*
- Peça para o jogador **desenhar a curva de interesse** da sessão (Lente #61) e comparar com a esperada.
- Grave a sessão (com consentimento) e **assista de novo** — você sempre descobre algo que perdeu ao vivo.
- Registre cada achado em `docs/playtests.md` com: data, perfil, objetivo, observações, decisão tomada.

**Regra de ouro do playtest:** o jogador **nunca** está errado sobre a própria experiência;
ele pode estar errado sobre o **diagnóstico**, nunca sobre o **sentimento**. Sua função é converter o
sentimento em mudança de design.

---

## 7. Balanceamento com método (Lentes #11, #28, #40, #47)

O livro descreve o balanceamento como um processo de **trial and error** com o apoio de ferramentas.
Em um jogo React, ferramentas são baratas — use-as.

1. **Exponha os parâmetros** (Lente #47): todos os valores em `BALANCE` (ver Arquitetura, seção 6).
2. **Painel de debug em dev**: altere valores em runtime e veja o efeito imediatamente.
   Sem isso, cada iteração custa um build — e a Regra do Loop perde velocidade.
3. **Simulação headless**: rode 10.000 partidas com IA simples contra várias combinações de `BALANCE`.
   Isso responde "existe estratégia dominante?" (Lente #32) e "a dificuldade cresce na taxa certa?" (Lente #18).
4. **Tabelas de probabilidade explícitas** (Lentes #28, #29): mantenha as tabelas em `src/game/` e
   **calcule o valor esperado** de cada opção. Se duas opções têm EV muito diferentes e custo igual,
   você tem estratégia dominante.
5. **Pity timers e garantias** (Lentes #30, #34): para sessões curtas, compense o azar extremo para manter
   a percepção de justiça.
6. **Documente cada ajuste** com data + motivo + resultado do playtest que o justificou (Lente #90).

### 7.1 Ferramentas que valem construir cedo no projeto
- `?debug=1` → ativa HUD de diagnóstico (FPS, tick, seed, estado bruto).
- `?seed=12345` → força um seed: reproduza exatamente o bug ou a partida que você quer analisar.
- `?level=N` → pula direto para um nível: essencial para playtests focados (Lente #91).
- `?balance=...` ou painel → ajuste em runtime.
- Botão de **replay** (a partir de `state.log`): reveja entradas e diagnósticos de qualquer sessão.

**Todos os "cheats" de debug são fundamentais para o processo, não um luxo.** Eles são a materialização
da Regra do Loop dentro do software.


---

## 8. Ritmo de trabalho e rituais sugeridos

**Rituais derivados do livro:**

| Ritual | Frequência | Base no livro | Objetivo |
|---|---|---|---|
| **Loop Review** | semanal | Regra do Loop (Cap. 7) | "Quantos loops fechamos? O que aprendemos?" |
| **Lens Check** | por feature/PR | Lentes #3, #32, #47, #57 | Checklist do fim de `GAME_DESIGN_CONTEXT.md` |
| **Playtest Session** | a cada 1–2 semanas | Lente #91 | Evidência humana, não opinião de time |
| **Risk Grooming** | antes de cada sprint | Lente #14 | O sprint ataca o maior risco, não a tarefa mais fácil |
| **Balance Tuning** | contínuo (dev) | Lentes #47, #40 | Ajuste de `BALANCE` com painel em dev |
| **ADR (1 página)** | quando decide | Lente #90 | Não rediscutir decisões |

**Ordem de prioridade do backlog (do mais alto para o mais baixo):**
1. Risco que pode **matar o projeto** (Lente #14).
2. Loop que responde **"é divertido?"** (Regra do Loop, Lentes #3, #15).
3. Experiência essencial e tema (Lentes #1, #7, #9).
4. Clareza, feedback e fluxo (Lentes #57, #56, #18).
5. Conteúdo e progressão (Lentes #25, #49, #51).
6. Polimento e juciness (Lente #58).
7. Metadados: configurações, créditos, loja, achievements.

**O que nunca deve estar no topo:** refatoração estética, nova biblioteca "porque é legal",
feature que "todo jogo tem", ou UI bonita de um sistema que ainda não se provou divertido.

---

## 9. Responsabilidade do designer (Lentes #97–#100)

Schell encerra o livro tratando de **responsabilidade**, não de técnica. Isso deve estar refletido no
processo:

- **Lente #97 — Transformação:** jogos mudam quem joga. **Pergunte: no que eu quero que o meu jogo
  transforme as pessoas que jogarem?** Responda isso no README junto com a Experiência Essencial.
- **Lente #98 — Responsabilidade:** o designer responde pelo que cria. Cuide de:
  - representação de personagens e culturas;
  - modelos de monetização que não explorem compulsão (Lentes #96, #87);
  - privacidade de dados (especialmente em jogos com contas e analytics);
  - acessibilidade (Lente #48) — é uma responsabilidade, não uma opção.
- **Lente #99 — Corvo:** o jogo guarda segredos para quem olha de perto? Profundidade escondida é o que
  gera comunidade, teoria e longevidade.
- **Lente #100 — Propósito Secreto:** por que **você** quer fazer este jogo? Escreva o motivo em uma frase
  e mantenha-o visível. É o que sustenta o projeto nos loops difíceis — e o que dá **autenticidade** ao
  resultado.

---

## 10. Resumo do processo (TL;DR)

1. **Construir → testar com humanos → ajustar → repetir.** Sem exceções.
2. **O sprint ataca o maior risco primeiro**, não a tarefa mais fácil ou mais divertida de codar.
3. **Protótipos são descartáveis** e existem para responder uma pergunta específica.
4. **Só ideias que passam pelos Oito Filtros** entram no backlog, e falhar significa reformular.
5. **Documente para lembrar e para comunicar** — só o que serve a esses dois fins.
6. **Playtest tem cinco perguntas** (Por quê, Quem, Onde, O que, Como) e uma observável: comportamento.
7. **Balanceie com ferramentas**: `BALANCE` central, painel em dev, simulação headless, tabelas explícitas.
8. **Trate acessibilidade e responsabilidade como requisitos de design**, desde o início.

> *"Quando em dúvida entre adicionar conteúdo novo e melhorar o que já existe — melhore o que existe.
> É assim que loops se transformam em maestria, e maestria em diversão."*


