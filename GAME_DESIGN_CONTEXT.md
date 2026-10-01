# Contexto de Design de Jogo — Baseado em *The Art of Game Design: A Book of Lenses* (3ª ed., Jesse Schell)

> **Como usar este arquivo:** este é o documento de contexto de referência para qualquer decisão de design,
> arquitetura e implementação do jogo que será construído em **React**. Leia antes de iniciar uma feature.
> Use as *perguntas* (as Lentes) como checklist de revisão. Nada aqui substitui a Regra do Loop: só o
> playtest confirma se uma decisão está certa.
>
> **Mapa dos arquivos:**
> - `GAME_DESIGN_CONTEXT.md` ← você está aqui (princípios, experiência, lentes — **Parte I** genérica,
>   **Parte II** aplicada ao Cassette Quest)
> - `GAME_DESIGN_CONTEXT_ARQUITETURA.md` — React na prática: estado, game loop, render, input,
>   acessibilidade, persistência, testes e anti-padrões
> - `GAME_DESIGN_CONTEXT_PROCESSO.md` — Regra do Loop, prototipagem, Oito Filtros, documentação,
>   playtest, balanceamento e rituais de time
> - `GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md` — sistemas do jogo: modelo de domínio, eras, fitas,
>   ecos, níveis como dados, balanceamento, chefes e diálogo
>
> **Documentos de design do projeto:** `Cassette_Quest_GDD_Completo.md`,
> `Cassette_Quest_Game_Bible_Completa.md`, `Cassette_Quest_Narrative_Bible.md`.

---

## 1. A hierarquia fundamental (Lentes #1, #3, #7, #8)

Schell organiza a criação em camadas. Errar a ordem é o erro mais comum:

```
Tema  →  Experiência Essencial  →  Elementos (Tetrade)  →  Implementação (React)
```

1. **Tema** — o jogo precisa ser *sobre algo*. Não "um jogo de nave", mas "a sensação de ser um piloto
   solitário defendendo um planeta que já perdeu". Toda decisão deve reforçar o tema (Lente #9 Unificação).
2. **Experiência Essencial** — o que o jogador deve *sentir*. É uma experiência, não uma feature.
3. **Elementos** — os quatro elementos do Tetrade, todos com igual importância.
4. **Implementação** — escolhas de React, estado, renderização. São *consequências* dos itens acima, nunca o ponto de partida.

> **Anti-padrão a evitar:** escolher a biblioteca/técnica primeiro e depois "inventar" o jogo em volta dela.
> Schell chama isso de se embriagar junto com o "bilionário bêbado" que é a tecnologia: ela é a mais
> volátil e sedutora das quatro lentes, e a que menos importa para o jogador.

### Lente #1 — Experiência Essencial
Perguntas obrigatórias antes de escrever qualquer código:
- Qual experiência eu quero que o jogador tenha?
- O que é *essencial* a essa experiência?
- Como o meu jogo captura essa essência?

**Regra prática:** escreva a experiência essencial em **uma frase** no topo do `README`.
Se você não conseguir, o design ainda não está pronto para ser implementado.

### Lente #8 — Design Holográfico
- Que elementos do jogo tornam a experiência agradável?
- Que elementos *prejudicam* a experiência?
- Como posso mudar elementos para melhorar a experiência?

**Regra prática React:** toda vez que você adicionar um componente, efeito visual ou regra de estado,
pergunte se aquilo *aumenta* ou *dilui* a experiência essencial. Um HUD bonito que não serve ao tema é
dívida de design, não polimento.

### Lente #3 — Fun
- Que partes do meu jogo são divertidas? Por quê?
- Que partes precisam ser mais divertidas?

Fun = **prazer com surpresas**. Um sistema previsível é satisfatório, mas não é divertido.


---

## 2. A Tetrade Elemental (Lente #7) — os quatro elementos do jogo

| Elemento | O que é | Onde vive no projeto React |
|---|---|---|
| **Tecnologia** | O meio material: browser, React, Canvas/DOM, input | `package.json`, `src/engine/`, escolhas de render |
| **Mecânica** | Regras, objetivos, espaço de ação, balanceamento | `src/game/` (reducers, regras puras, constantes) |
| **História** | A sequência de eventos narrada | `src/content/`, diálogos, textos |
| **Estética** | Aparência, som, sensação | componentes, `styles/`, áudio, animação |

**Perguntas (obrigatórias em todo review de design):**
- O design usa elementos dos quatro tipos?
- Melhoraria se eu reforçasse um ou mais elementos?
- Os quatro estão **em harmonia**, reforçando-se mutuamente rumo ao mesmo tema?

**Nota sobre o gradiente de visibilidade** (importante para priorizar esforço):
o jogador vê a **estética**, percebe a **história** e a **mecânica**, e praticamente **não vê a tecnologia**.
Logo: nunca sacrifique tema/estética/mecânica em nome de uma solução técnica que só o time admira.

---

## 3. Mecânica: as Lentes de sistema (Lentes #12, #21–#43)

### 3.1 Objetivo e espaço (Lentes #21, #22, #24, #25, #26, #27)
- **Espaço funcional (#21):** como o espaço é definido e o que cada parte do espaço permite? Em React isso é
  o seu *modelo de mundo* — matriz, grid, grafo, ou lista. Escolha o modelo que torna as ações possíveis
  **triviais de expressar**, e não o que é mais fácil de renderizar.
- **Estado dinâmico (#22):** todo estado relevante deve ser explícito e derivável. Se uma regra depende de
  um dado implícito no DOM, isso é bug esperando acontecer.
- **Ação (#24):** quais são as ações atômicas? Devem ser poucas e combináveis. Ações são *comandos*
  (`{ type: 'MOVE', payload }`), nunca mutações ad-hoc de estado.
- **Objetivos (#25):** o objetivo é claro e visível? O jogador *sabe* o que quer agora?
- **Regras (#26):** as regras mudam de forma imprevisível? Regras estáveis geram domínio e maestria.
- **Habilidade (#27):** que habilidade o jogo exige (físico, mental, social)? Ela tem espaço para melhorar?

### 3.2 Escolhas e risco (Lentes #28–#34)
- **Valor esperado (#28)/Chance (#29):** toda aleatoriedade precisa ter distribuição *definida*. Use randômico
  **semeado (seeded)** — ver Arquitetura, seção 5 — para reprodutibilidade e depuração.
- **Justiça (#30):** o jogo trata o jogador de forma consistente? Nunca mude regras para "punir" o jogador.
- **Desafio (#31):** o desafio escala com a habilidade? (ver Fluxo, seção 5 deste arquivo)
- **Escolhas Significativas (#32)** — o teste mais importante da mecânica:
  - Que escolhas estou pedindo?
  - Elas são significativas? *Como?*
  - É o número certo de escolhas? Mais deixaria o jogador mais poderoso? Menos deixaria mais claro?
  - **Existe alguma estratégia dominante?** Se sim, o design falhou.
- **Triangularidade (#33):** escolhas que oferecem opções de *qualidade* diferente (rápido vs. seguro vs.
  recompensador) são melhores que variações de grau.
- **Habilidade vs. Sorte (#34):** calibre conforme o público. Casual tolera mais sorte; hardcore exige agência.

### 3.3 Tópicos de balanceamento (Lentes #39–#43, #47)
- **Tempo (#39):** o tempo é o recurso mais valioso. Decida o que acontece em tempo real x turnos, e respeite.
- **Recompensa (#40):** toda recompensa precisa ser **compreensível** ("ganhar uma recompensa que você não
  entende é como não ganhar nada") e **variável** (não excessivamente regular).
- **Punição (#41):** punições curtas e aprendizáveis. Perder progresso não ensina nada; perder tempo sim.
- **Simplicidade/Complexidade (#42) / Elegância (#43):** elegância é *complexidade emergente a partir de poucas
  regras*. Evite regras especiais pontuais; prefira generalizar uma regra existente.

### Lente #47 — Balance (a única pergunta que importa)
> **"O meu jogo parece certo? Por quê, ou por que não?"**

Detalhes de balanceamento são resolvidos por *trial and error* com números **expostos em um único lugar** —
ver Arquitetura, seção 6 (`gameBalance.ts`).

---

## 4. Interface: o jogador joga *através* de uma interface (Lentes #53–#60)

Em React, esta é a área onde a arquitetura mais impacta a experiência. Trate a UI de jogo como um **sistema de
comunicação com loops de feedback claros**, não como telas de formulário.

### 4.1 A Lente do Feedback (#57) — usar em *cada momento* do jogo
- O que o jogador **precisa** saber agora?
- O que o jogador **quer** saber agora?
- O que eu quero que ele **sinta** agora? Que feedback cria isso?
- Qual é o **objetivo** dele agora? Que feedback o ajuda nesse objetivo?

**Regra React:** toda ação do jogador deve gerar feedback em **≤ 100 ms** (visual, sonoro ou háptico).
Sem feedback, a experiência é confusa e frustrante — como o botão de pedestre que não acende.

### 4.2 A Lente da Transparência (#56)
- O jogador consegue fazer o que quer?
- Com prática, ele usará a interface **sem pensar**?
- Novos jogadores acham intuitivo? Customizar controles ajudaria ou atrapalharia?
- A interface funciona bem em **todas as situações** (com lag, em telas pequenas, no meio de uma animação)?

### 4.3 Canais de Informação (#59) — método em 3 passos
1. **Liste e priorize a informação:** "precisa saber a todo momento", "precisa olhar de vez em quando",
   "precisa saber ocasionalmente".
2. **Liste os canais disponíveis:** HUD superior, canto inferior direito, o próprio avatar, som, música,
   borda da tela, animação de um elemento, texto flutuante.
3. **Mapeie informação → canal.** Informação crítica *nunca* pode depender de um canal sutil.

### 4.4 A Lente de Modos (#60)
- Quais modos eu preciso? Por quê?
- Algum modo pode ser **colapsado ou combinado**?
- Modos se sobrepõem? Coloque-os em **canais de input diferentes**.
- Quando o modo muda, **como o jogador sabe**? Comunique a mudança de **mais de uma forma**.

**Regra React:** modo = estado explícito (`gamePhase`), nunca "implicado" por vários booleanos soltos.
Nunca use booleanos mutuamente exclusivos (`isMenu`, `isPaused`, `isPlaying`); use uma máquina de estados.

### 4.5 As Lentes da Juciness (#58) e do Prazer (#17)
> Um sistema "suculento" é aquele em que **um pouco de interação produz um fluxo contínuo de recompensa**.

- A interface dá **feedback contínuo** às ações? Se não, por quê?
- Existe **movimento de segunda ordem** (movimento derivado da ação do jogador), poderoso e interessante?
- Ao recompensar, **quantas formas simultâneas** de recompensa estou dando? Posso achar mais?

**Sinais de interface "seca" (evitar):** clique sem resposta visual, número que muda sem animação, acerto sem
som/partícula, transição instantânea entre estados, ausência de antecipação e *follow-through*.

### 4.6 A Curva de Interesse (#61)
Estruture o conteúdo como uma curva de interesse: **entrada forte → vales e picos alternados → clímax → denouement.**
- O início chama a atenção imediatamente?
- Há **estrutura fractal** (picos dentro de picos)? Deveria haver?
- As minhas intuições batem com o interesse *observado*? Se eu pedir para um playtester desenhar a curva, o que ele desenha?

Aplique isso em **micro** (uma partida), **meso** (um nível/fase) e **macro** (o jogo inteiro).

---

## 5. O Fluxo (Lente #18) — o critério de sucesso da experiência

```
        Alta  +-- Ansiedade -----------+
   Desafio    |      CANAL DE FLUXO     |
              |  (desafio =~ habilidade)|
        Baixa +-- Tedio ----------------+
              Baixa      Habilidade      Alta
```

- O jogo tem **objetivos claros**? Se não, como corrigir?
- Os objetivos do jogador são os que eu **pretendia**?
- Existem partes que **distraem** a ponto de ele esquecer o objetivo?
- Há um fluxo constante de desafios **nem fáceis, nem difíceis demais**, considerando que a habilidade cresce?
- A habilidade do jogador está crescendo no ritmo esperado? Se não, o que mudar?

**Implicação de arquitetura:** o balanceamento deve ser **data-driven** para permitir ajustar dificuldade sem
reescrever regras. O ciclo "tenso → alívio, tenso → alívio" é o padrão de prazer básico: implemente-o
explicitamente (ondas de inimigos, pausas de respiro, power-ups temporários).

**Como reconhecer fluxo em playtest:** o jogador fica **quieto**, absorto, fala baixo, fica lento para
responder e **irritado se você perguntar algo**. Não espere sorrisos. Observe o momento em que ele *sai* do
canal — esse evento é o seu bug de design.


---

## 6. A Jornada da Experiência (visão macro)

O livro modela a experiência do jogador como uma jornada com entrada, meio e fim. Orientações práticas:

- **Lente #15 — Brinquedo (Toy):** construa primeiro um "brinquedo" divertido de manipular, *depois* transforme
  em jogo com objetivos. **Em React:** faça um controlador/mecânica isolada que já seja gostoso de mexer,
  sem HUD, sem regras, sem pontuação. Se não for divertido como brinquedo, não será divertido como jogo.
- **Lente #11 — Inspiração Infinita:** o jogo deve abrir espaço para a inventividade e interpretação do jogador.
- **Lente #14 — Risco:** itere por mitigação de risco (ver arquivo de Processo, seção 2).
- **Lentes #19/#20 — Necessidades e Julgamento:** todo jogador busca **competência, autonomia e conexão**.
- **Lente #10 — Ressonância:** o jogo ressoa com a vida/emoções do jogador? Esse é o caminho para o significado.
- **Lente #39 — Tempo:** respeite o tempo do jogador; ofereça pausa, retomada e persistência confiáveis.
- **Lente #48 — Acessibilidade:** "o jogador deve conseguir visualizar claramente os primeiros passos".
  - Como ele vai saber como começar? Precisa explicar ou é auto-evidente?
  - O jogo se parece com algo que ele já viu? Se sim, destaque a semelhança; se não, ensine o comportamento.
  - O jogo atrai e dá vontade de tocar/manipular? Se não, como mudar?
- **Lentes #53/#54/#55 — Controle e Interface Física/Virtual:** mapeie o input físico (teclado, toque, mouse,
  gamepad) para a interface virtual de forma que *o input físico seja adequado ao virtual* (menus pop-up são um
  péssimo par para gamepad, por exemplo).
- **Lentes #65–#70 — História:** todo jogo tem história, mesmo o abstrato. Use **máquina de histórias (#65)**:
  mundo + personagens + objetivos + conflitos que geram eventos interessantes *por si mesmos*.
  Obstáculos (#66), Simplicidade e Transcendência (#67) e a Jornada do Herói (#68) são os moldes narrativos.
- **Lentes #71–#73 — Livre-arbítrio:** quanto mais liberdade, mais difícil controlar a curva de interesse —
  porém mais forte a sensação de agência. Controle indiretamente (#72) via objetivos, restrições e design de
  incentivos, e não via proibições explícitas.
- **Lentes #74–#83 — Personagens:** mesmo em jogos de sistema, avatares (#75), função do personagem (#76),
  traços (#77), rede de relações (#79), status (#80), transformação (#81) e contradição interna (#82)
  determinam o vínculo emocional.

---

## 7. Dimensões de Design (lentes de referência rápida)

Ao revisar uma feature, escolha as lentes relevantes:

| Lente | Pergunta-guia | Onde olhar no código React |
|---|---|---|
| #2 Surpresa | O jogo gera descoberta e novidade? | variação de conteúdo, aleatoriedade |
| #4 Curiosidade | O jogador quer saber o que vem depois? | progressão, recompensas ocultas |
| #5 Valor Endógeno | As coisas têm valor *dentro* do mundo do jogo? | economia interna, loot, pontuação |
| #6 Resolução de Problemas | O jogo exige pensar/resolver? | puzzles, otimização de build |
| #16 Jogador | Quem é o jogador? O que ele gosta/espera? | UX, difficulty curves, options |
| #17 Prazer | Que prazeres o jogo entrega? | feedback, animações, som |
| #23 Emergência | Regras simples geram complexidade? | composição de ações/efeitos |
| #45 Imaginação | Quanto o jogador completa na cabeça dele? | representação minimalista > realista |
| #46 Economia | Recursos são ganhos e gastos de forma interessante? | sinks & faucets, balanceamento |
| #49 Progresso Visível | O avanço fica claro? | barras, mapas, contadores, marcos |
| #50 Paralelismo | O jogador pode fazer várias coisas ao mesmo tempo? | filas, multitarefas, auto-battle |
| #51 Pirâmide | Há objetivos de curto/médio/longo prazo? | quest design, metas |
| #52 Puzzle | O jogo faz o jogador **parar e pensar**? | gates, enigmas, rotações |
| #62 Interesse Inerente | O jogo tem atrativos próprios além do "já visto"? | temas, mecânicas assinatura |
| #63 Beleza | O jogo é belo? | arte, tipografia, som, ritmo |
| #64 Projeção | O jogador projeta emoção e intenção no jogo? | personagens, expressividade |
| #84–#88 Social | Amizade, expressão, comunidade, griefing, amor | multiplayer, chat, emotes |
| #92 Tecnologia | A tecnologia é *foundational* ou *decorational*? | ver Processo, seção 5 |
| #93 Bola de Cristal | O jogo sobrevive à próxima mudança de plataforma? | abstração do engine/regras |
| #99 Raven | Que segredos o jogo guarda para quem olha de perto? | easter eggs, profundidade |
| #100 Propósito Secreto | Por que **eu** quero fazer este jogo? | motivação do desenvolvedor |

---

## 8. Checklist de Revisão (usar antes de cada PR/merge)

Copie e responda antes de considerar uma feature pronta:

```markdown
### Checklist de Design (The Art of Game Design)
- [ ] Qual a experiencia essencial desta feature? (Lente #1)
- [ ] Que lente do Tetrade ela toca: tecnologia, mecanica, historia, estetica? (Lente #7)
- [ ] Ela reforca o tema, ou apenas adiciona ruido? (Lentes #8, #9)
- [ ] Faz o jogo ser mais divertido? Onde? (Lente #3)
- [ ] Existe estrategia dominante introduzida? (Lente #32)
- [ ] O feedback chega em <= 100ms? (Lente #57)
- [ ] A informacao critica esta visivel no canal adequado? (Lente #59)
- [ ] Se ha modos, sao explicitos e comunicados de 2 formas? (Lentes #56, #60)
- [ ] A acao parece "suculenta" (movimento de segunda ordem, multiplas recompensas)? (Lente #58)
- [ ] O jogador sabe como comecar sem explicacao? (Lente #48)
- [ ] Foi feito/aplicado um playtest? (Lente #91)
- [ ] O jogo continua parecendo certo? (Lentes #47, #13)
```

> **Regra final:** quando em dúvida entre "mais features" e "mais loops de iteração sobre o que existe",
> escolha os loops. *The more times you test and improve your design, the better your game will be.*

---

# PARTE II — Aplicado ao projeto: **Cassette Quest: Echoes of Generations**

Esta parte traduz as lentes para o jogo real documentado em
`Cassette_Quest_GDD_Completo.md`, `Cassette_Quest_Game_Bible_Completa.md` e
`Cassette_Quest_Narrative_Bible.md`. Consulte os três sempre que este arquivo citar
"o GDD" ou "a Narrative Bible".

**Documentos complementares:**
- `GAME_DESIGN_CONTEXT_ARQUITETURA.md` — engenharia React (genérico + aplicável)
- `GAME_DESIGN_CONTEXT_PROCESSO.md` — processo, loops, playtest
- `GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md` — sistemas do jogo, modelo de dados, protótipos

---

## 9. Identificação das camadas para o Cassette Quest

Aplicando a hierarquia da seção 1 ao que já está escrito:

| Camada | Definição para este jogo | Fonte |
|---|---|---|
| **Tema** | *Crescer não é abandonar quem fomos — é carregar todas as versões enquanto avançamos.* | GDD (Mensagem Final), Narrative Bible (Última Cena) |
| **Experiência Essencial** | "Sentir que cada versão de mim — passada, presente e futura — é necessária para resolver o que está à frente." | derivado do Arco de Janus |
| **Elementos** | Mecânica = fitas + eras + ecos; História = 5 eras + Bit Zero; Estética = pixel art 16 bits, música por gênero; Tecnologia = plataforma 2D em React | GDD |
| **Implementação** | arquitetura React de `GAME_DESIGN_CONTEXT_ARQUITETURA.md` | — |

> **Ação recomendada (Lente #1):** comitar a frase da Experiência Essencial no topo do `README.md`,
> e a Lente #97 (Transformação) logo abaixo: *"Queremos que o jogador, ao terminar, olhe para as suas
> próprias fases da vida com mais gentileza."*

### Lente #9 — Unificação: o teste de coerência do Cassette Quest

O GDD já tem coerência temática notável. Use esta tabela para **manter** a coerência e barrar features órfãs:

| Elemento de jogo | Deve significar | Se um novo elemento não reforçar isso, repense |
|---|---|---|
| 5 mundos / 5 eras de hardware | 5 fases da vida | — |
| Fitas (Rock/Pop/Jazz/Eletrônica) | formas de expressão da identidade | — |
| Ecos Temporais | versões passadas/futuras de si mesmo | — |
| Fragmentos de Pixel | memória que precisa ser restaurada | — |
| Bit Zero | o medo coletivo das mudanças | — |
| Sistema de Eras | coexistência das fases | — |

**Pergunta de revisão (Lente #8):** *esta nova feature aumenta a sensação de "todas as minhas versões
importam" ou apenas adiciona conteúdo que poderia estar em qualquer plataforma?*

---

## 10. Riscos de design do Cassette Quest (Lente #14)

Ordenados por **perigo × probabilidade** — a ordem em que devem ser prototipados:

| # | Risco | Por que é grave | Protótipo de mitigação |
|---|---|---|---|
| 1 | **O "Sistema de Eras" não se prova divertido** | é o diferencial do jogo; se for chato, o jogo é um plataforma genérico | Protótipo isolado: 1 sala, 2 eras, troca com uma tecla. Um único obstáculo que só é vencido alternando. Jogar 5 minutos. |
| 2 | **4 fitas × 20 habilidades = complexidade para o jogador** | Lentes #42/#48: o jogador precisa **lembrar** o que cada fita faz | Protótipo de UI de fita: indicador claro da fita ativa + *preview* do efeito |
| 3 | **Ecos Temporais viram "multiplayer fake" confuso** | cooperação com IA é notoriamente difícil de explicar | Protótipo: 1 eco que repete a ação gravada do jogador. Se for legível, o conceito vale |
| 4 | **Escopo de conteúdo não fecha** (36 fases + 5 chefes + 6 formas finais) | escopo mata projetos (Lente #42, #47) | Protótipo de *pipeline*: quantas horas para produzir **1 fase** de ponta a ponta? Multiplique. Se estourar, corte fases. |
| 5 | **6 formas de Bit Zero sem distinção mecânica real** | vira "esponja de vida"; Lente #32 — as escolhas somem | Protótipo da luta final: cada forma precisa de uma mecânica **exclusiva** derivada do seu tema |
| 6 | **Fitas como buffs numéricos, não como formas de jogar** | se a fita é só um multiplicador, o tema não está na mecânica | Definir **1 habilidade qualitativa exclusiva** por fita antes de qualquer outra feature |

> **Regra prática:** nenhuma das 36 fases deve ser construída antes de o **risco #1** estar mitigado.
> Construir conteúdo sobre um núcleo não-validado é a forma mais rápida de desperdiçar meses.

---

## 11. Mecânica: as Lentes-chave do Cassette Quest

### 11.1 Lente #21 (Espaço Funcional) — o Modelo de Eras

Três modelos possíveis para o Sistema de Eras. **Escolha um e documente em ADR antes de codar:**

| Modelo | Como funciona | Prós | Contras | Adequado se… |
|---|---|---|---|---|
| **A. Overlay** | Cada era tem seu **array de colisão**; a posição do jogador é compartilhada. Trocar de era troca o mundo sob os pés | Simples e barato; ideal para puzzles de plataforma | Difícil dar sentido narrativo forte | o eco temático é "o mesmo lugar visto por outro ângulo" |
| **B. Instâncias separadas** | Cada era é um **nível independente** ligado por portais | Fácil de produzir conteúdo | Perde a coexistência (fere Lente #9) | precisa produzir muito conteúdo rápido |
| **C. Coexistência (camadas)** | Todas as eras existem **ao mesmo tempo**, translúcidas; o jogador interage fisicamente só com a ativa | Melhor expressão do tema (#9) e visualmente único | Mais caro; exige clareza visual extrema (#56) | o tema é o coração do jogo — **que é o caso** |

> **Recomendação fundamentada no tema:** o modelo **C (Coexistência)** é o que *encarna* "todas as minhas
> versões caminham comigo". Se o orçamento não comportar C, o fallback é **A**, nunca B — porque B
> transforma o tema em apenas uma sequência de fases.
> Ver `GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md`, seção 4, para o modelo de dados.

### 11.2 Lente #32 (Escolhas Significativas) — o teste das 4 fitas

As fitas só são uma boa mecânica se produzirem **triangularidade** (Lente #33): opções de **qualidade**
diferente, não de grau.

| Fita | Identidade (o que ela *diz* sobre quem Janus é) | Estilo de jogo | Custo / limitação |
|---|---|---|---|
| **Rock** | Força, inconformismo, quebrar barreiras | Dano em área, quebra-blocos, controle | **Lento** — perde oportunidades de tempo |
| **Pop** | Visibilidade, velocidade, aprovação social | Mobilidade, dash, corrida | **Frágil** — pouco dano e defesa |
| **Jazz** | Improviso, nuance, paciência | Flutuação, verticalidade, manipulação de tempo | **Indireto** — resolve por rodeios, não em linha reta |
| **Eletrônica** | Adaptação, tecnologia, controle do sistema | Hack, dash quântico, manipulação de estado | **Complexo** — exige domínio, pune descuido |

**Perguntas obrigatórias (Lente #32) para cada fase:**
- Existe mais de uma fita que resolve esta fase? **Se só uma resolve, não é escolha — é uma chave.**
- Existe uma fita que resolve **todas** as fases melhor? → estratégia dominante → corrija o balanceamento.
- Por que alguém escolheria Jazz aqui? Se a resposta não for clara em 5 segundos, a fase está mal desenhada.

> **Insight de design (Lentes #8, #9):** a melhor fase de Cassette Quest é aquela em que a solução
> "correta" usa uma fita **diferente da que o jogador usou nas últimas 3 fases**. Assim, a solução do jogo
> passa a ser "usar todas as suas versões" — exatamente o arco de Janus, expresso em jogabilidade.

### 11.3 Lente #18 (Fluxo) — a curva de dificuldade dos 5 mundos

O GDD já define a estrutura; o que falta é o **gráfico** e a calibração.

```
Dificuldade / Complexidade
  ^
  |                                                   / BIT ZERO (climax)
  |                                        / 5 (6 formas)
  |                          / 4 (cuidado)
  |             / 3 (sobrecarga)
  |    / 2 (identidade)
  | / 1 (descoberta)
  +--------------------------------------------------------> Tempo
     M1       M2        M3         M4        M5      Final
     ensina   combina   pressiona  integra   reflete  sintetiza
     fita     fitas     recursos   fitas+ecos tempo   tudo
```

**Regras de calibração (Lente #31 Desafio + Lente #61 Curva de Interesse):**
- **Mundo 1** ensina *uma* fita e o movimento. Nenhuma fase deve matar o jogador por erro de leitura.
- **Mundo 2** ensina a **combinar** fitas. Introduz o primeiro puzzle que exige 2 fitas em sequência.
- **Mundo 3** pressiona por **recursos e precisão** — a era da produtividade. Este é o mundo com mais
  pressão de tempo: o tema vira regra.
- **Mundo 4** **integra** tudo (fitas + ecos + proteção de NPCs). É o mundo mais "largo", não o mais difícil.
- **Mundo 5** é **reflexivo**: menos execução, mais tempo e memória. O desafio é de compreensão.
- **Bit Zero** é a **síntese**: cada forma exige a fita ensinada no respectivo mundo.

> **Checklist de fluxo por fase:** existe um momento de respiro depois do pico? Existe **feedback** claro
> do que matou o jogador? A fase pode ser vencida por uma habilidade ligeiramente acima do esperado
> (margem de maestria, Lente #27)?

### 11.4 Lentes #57, #59, #60 — interface de um jogo com 4 fitas

Mapeamento de canais (Lente #59) específico para o Cassette Quest:

| Informação | Importância | Canal proposto |
|---|---|---|
| Fita equipada (identidade) | **crítica e constante** | cor/cassete visível no **avatar** + ícone fixo no **HUD** + **paleta da tela** muda sutilmente |
| Habilidades da fita | crítica | HUD lateral com ícones das habilidades, com custo/cooldown visível |
| Vida / energia | alta, ocasional | HUD superior, com **animação de "batida"** ao mudar (Lente #58) |
| Fragmentos de Pixel | ocasional | contador + efeito de "sugar" visual ao coletar |
| Objetivos da fase | alta | texto curto e objetivo, ou ícone de objetivo com estado |
| Eco ativo | crítico quando existe | silhueta espectral com **cor distinta** + ícone/texto explicando o que ele fará |
| Modo atual (jogo/pausa/cutscene/menu de fita) | crítica | ver Lente #60 abaixo |

**Lente #60 — os modos do Cassette Quest, explicitados:**
- `overworld` (jogando), `cutscene`, `paused`, `fitaSelect`, `bossIntro`, `dialogue`,
  `gameOver`, `levelComplete`.
- **Cada modo precisa de tratamento visual distinto** (Lente #56): o menu de fita deve ser inconfundível,
  com o mundo desacelerado ao fundo — nunca uma sobreposição invisível.
- **Nunca** permita dois modos simultâneos: se o jogador pausa durante uma cutscene, o novo estado deve ser
  uma *sub-fase* de `cutscene`, não um booleano paralelo.

### 11.5 Lentes #65–#70 — a história como sistema, não como interrupção

O Cassette Quest tem narrativa forte. O risco é ela virar **cutscene passiva** — e a Lente #65 (máquina
de histórias) pede que o mundo gere eventos interessantes **por si mesmo**.

**Recomendações concretas** — transformar cada objetivo narrativo em **mecânica**:

| Mundo | Objetivo narrativo (Narrative Bible) | Como virar mecânica |
|---|---|---|
| 1 | "crescer não significa abandonar a imaginação" | A fita Rock primeiro é usada para **brincar** (quebrar blocos sem propósito) antes de ser arma |
| 2 | "identidade não precisa ser construída pela rejeição do outro" | No Festival das Fitas, cada tribo oferece **um caminho**, e **nenhum funciona sozinho** |
| 3 | "valor pessoal não depende da produtividade" | A fase tem um **contador de tempo explícito** que o jogador aprende a **ignorar** para vencer |
| 4 | "proteger não é controlar" | Escoltas em que o NPC **se recusa a obedecer** se for tratado como objeto |
| 5 | "legado é impacto, não fama" | Nada é perdido durante a fase; tudo é **registrado e devolvido** no final |

**Cada chefe deve ser um argumento, não um obstáculo** (Lentes #77–#79). Os diálogos do GDD já fazem isso;
o design precisa fazer também. Exemplo: **O Menino Eterno** deve *literalmente* congelar o cenário à
frente do jogador — o que obriga o jogador a **escolher** avançar, encenando o tema.



### 11.6 Lentes #40 e #41 — recompensas e punições do Cassette Quest

**Recompensas (o GDD já lista; falta a calibração):**

| Recompensa | Frequência ideal | Regra |
|---|---|---|
| Fragmentos de Pixel | constante (toda fase) | **nunca** apenas números: ligue-os a uma **restauração visual** da região (Lente #49). O jogador deve **ver** o Pixelverse reconectar |
| Disquetes Antigos | esparsa e surpreendente | recompensa **compreensível** (Lente #40: recompensa não entendida = sem recompensa) |
| Cartuchos Lendários | raros, marcos | melhorias permanentes com **nome e significado** (Coragem, Criatividade, Perseverança, Empatia, Legado) |
| Fitas | 1 por mundo, **no chefe** | determinação clara de progresso; a fita é o **troféu narrativo** |
| Memórias Perdidas | exploratória | recompensa **narrativa**: contam a história de Bit Zero e devem **alterar a percepção final** da luta |

**Punições (Lente #41):**
- Morte → retorno a checkpoint **próximo e visível**. Nunca repetir 5 minutos de conteúdo.
- Dano → perda breve e **legível** (knockback curto + invulnerabilidade temporária).
- **Nunca** punir removendo Fragmentos já coletados: isso pune a exploração, que é onde mora o tema.
- No Mundo 3, a tentação é punir com tempo. **A pressão de tempo deve ser regra do mundo, não crueldade
  do design** (Lente #30 — Justiça).

### 11.7 Lente #91 — plano de playtest da Vertical Slice

A demo definida no GDD é: intro + Mundo 1 completo + início do Mundo 2 + Sistema de Eras +
Fita Rock + Fita Pop + primeiro chefe + primeiros colecionáveis (45–60 min).

| Ordem | Pergunta de playtest | Lente | Quando testar |
|---|---|---|---|
| 1 | O jogador **entende a troca de eras** sem que eu explique? | #48, #56 | já no protótipo (antes da arte) |
| 2 | O jogador **sente que escolher fita é uma decisão**, ou só usa a última que ganhou? | #32, #33 | vertical slice |
| 3 | O jogador **termina o Mundo 1 querendo o Mundo 2**? | #61, #18 | vertical slice |
| 4 | O tema ("todas as versões importam") **aparece** para o jogador, ou só no roteiro? | #1, #8, #64 | vertical slice |
| 5 | O jogador **morre** e **entende por quê**? | #30, #57 | desde o protótipo |
| 6 | A luta contra **O Menino Eterno** produz o "aha" narrativo-mecânico? | #65, #77 | vertical slice |

> **Métrica mais útil (Lente #61):** peça ao playtester para desenhar a curva de interesse dos 45 minutos
> da demo e compare com a curva que o design **pretendia**. Divergência nos vales = o jogo não tem respiro;
> divergência nos picos = o jogo não cumpriu a promessa.

---

## 12. Checklist do Cassette Quest (para cada fase nova)

```markdown
### Fase: ______________  (Mundo __ / Fase __)
- [ ] Qual fita esta fase ENSINA? E qual fita ela REVELA como alternativa? (Lente #32)
- [ ] Se existe apenas UMA fita que resolve, justifique ou redesenhe (Lente #32)
- [ ] O jogador ja conhece todas as habilidades necessarias? Se nao, a fase ensina? (Lente #48)
- [ ] Existe um pico de interesse e um vale de respiro? (Lentes #61, #18)
- [ ] Qual e a punicao por falhar, e ela ensina algo? (Lente #41)
- [ ] A recompensa e compreensivel no momento em que e dada? (Lente #40)
- [ ] O tema do mundo aparece em MECANICA, nao apenas no dialogo? (Lentes #7, #9, #65)
- [ ] A informacao critica esta visivel no canal certo? (Lente #59)
- [ ] Se ha ecos/modos, o jogador sabe em que modo esta? (Lentes #56, #60)
- [ ] Existe feedback em <=100ms para toda acao? (Lente #57)
- [ ] Os Fragmentos de Pixel geram mudanca VISIVEL no cenario? (Lentes #49, #58)
- [ ] A fase pode ser concluida com uma habilidade acima do esperado? (Lente #27)
- [ ] Foi jogada por alguem que nao participou do design? (Lente #91)
```

---

## 13. Ordem de trabalho recomendada (Lentes #14, #15 + Regra do Loop)

Sequência que respeita a Regra do Loop e ataca o maior risco primeiro:

| Fase | Entregável | Responde à pergunta | Não construa ainda |
|---|---|---|---|
| **0** | `README.md` com Experiência Essencial (1 frase) + Lente #97 | "Por que este jogo existe?" | nada de código |
| **1** | Protótipo "Brinquedo" (Lente #15): Janus andando/pulando, feio, teclado | "É gostoso de mexer?" | HUD, menus, arte, som |
| **2** | Protótipo "Eras": 1 sala, 2 eras, troca com uma tecla | "A troca de eras é divertida por 5 minutos?" | fases, fitas, inimigos |
| **3** | Regras puras + testes (arquivo de Arquitetura, seções 2–4) | "As regras são determinísticas e testáveis?" | apresentação final |
| **4** | Protótipo "Fitas": 2 fitas com 1 habilidade qualitativa cada, o mesmo puzzle resolvido de 2 formas | "Escolher fita é uma decisão?" | as 20 habilidades |
| **5** | Vertical Slice: Mundo 1 completo com arte placeholder | "O jogador quer o Mundo 2?" | Mundos 3–5 |
| **6** | Polimento + juciness + som na vertical slice | "A experiência está no canal de fluxo?" | conteúdo novo |
| **7** | Expansão de conteúdo, mundo por mundo, com playtest a cada mundo | "O escopo fecha?" | — |

> **Aviso de escopo (Lente #42):** o GDD atual prevê 36 fases, 5 chefes e uma luta final de 6 formas.
> Isso é um escopo de estúdio. Se o projeto for de uma pessoa/equipe pequena, a recomendação honesta é:
> **3 mundos excelentes (15 fases) > 5 mundos inacabados**. Corte por *qualidade de tema*, não por tamanho:
> se precisar cortar, corte o Mundo 3 (o menos expressivo mecanicamente) antes do Mundo 4 ou 5.


