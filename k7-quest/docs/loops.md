# Roadmap de loops

A Regra do Loop (Schell, cap. 7): *quanto mais vezes você testa e melhora seu design, melhor o jogo
fica.* Este arquivo é a lista do que ainda **não** foi testado, ordenada por **risco** — não por
facilidade.

A ordem segue `GAME_DESIGN_CONTEXT_CASSETTE_QUEST.md` §13: o sprint ataca o maior risco, não a tarefa
mais fácil de codar.

## Feito (e por que conta)

- [x] **Camada de domínio pura** com regras, dados e testes headless (ADR 0001)
- [x] **Vertical slice do Mundo 1** em dados: 4 fases, incluindo a que alterna eras
- [x] **Validador de fases**: nenhuma fase entra no jogo sem objetivo alcançável (Lente #30)
- [x] **Fases exportáveis para o Tiled** (`npm run levels:export`)
- [x] **Ciclo fechado com o Tiled**: editar no mapa publica código de volta
      (`npm run levels:import`), com o mesmo validador e a mesma regra de conversão
      (ADR 0008)

## 1. Testar o vertical slice com gente  ← o marco mais importante do projeto

**Pergunta:** *"o Sistema de Eras é divertido por 5 minutos?"*

**Por que primeiro:** é o risco nº 1 registrado no documento de sistemas. Todo o resto do jogo
depende da resposta. Nenhuma quantidade de conteúdo conserta um sistema de eras chato.

**Como:** 3–5 pessoas, sem explicar nada. Observar comportamento, não opinião
(`GAME_DESIGN_CONTEXT_PROCESSO.md`, cap. 25). Medir:

- Quantos tentam trocar de era sozinhos, e em quanto tempo?
- Entenderam o "Espaco ocupado nesta era" sem ajuda?
- A parede de Blocos: quebraram ou procuraram outra rota?
- Onde o fluxo de jogo sai do canal (Lente #18)?

**Sai daqui:** a primeira linha em `docs/playtests.md`, e números reais em `gameBalance.ts`.

## 2. Importador do Tiled → código — **feito, ver ADR 0008**

**Pergunta:** *"o designer consegue editar no Tiled sem medo de quebrar o jogo?"*

Respondeu `npm run levels:import` + ADR 0008. O que ficou de fora, e é a continuação natural
desse item: **fase nova** desenhada direto no Tiled. Hoje o importador existe e é testado, mas
nenhuma fase do slice foi *autoralmente* criada por ele — o que foi provado até agora é a
ida-e-volta, não a autoria do zero. Criar `w2-l1` em branco no Tiled e publicar sem tocar em
`src/` é o teste que falta para esta pergunta estar realmente fechada.

## 3. A luta multi-forma do Menino Eterno

**Pergunta:** *"cada forma do chefe introduz mecânica nova ou só mais vida?"*

Escopo e regras em ADR 0006. O teste do ADR: **nenhuma forma pode ser enchimento de barra**. As seis
teses (Criança Eterna, Rebelde Perdido, Produtivo Infinito, Guardião Sobrecarregado, Ancião Esquecido,
Forma Absoluta) cada uma exigem uma regra de mundo diferente — é isso que a torna a melhor luta do
jogo, e não o tamanho da barra de vida.

## 4. O K7 Deck (entra o Pixi)

**Pergunta:** *"o jogador entende que colecionou fitas, ou só viu um contador?"*

ADR 0002. Também é o momento de **ligar o chunk `pixi`** no `vite.config.ts`, que hoje está declarado
e vazio de propósito.

## 5. A era 3D (entra o R3F)

**Pergunta:** *"profundidade muda a decisão, ou só o visual?"*

A regra declarada da era 3D é *"o mesmo espaço tem mais camadas do que você consegue carregar"*. Se
não mudar a decisão do jogador, é polimento caro.

## 6. Puzzles de física (entra o Matter.js)

**Pergunta:** *"a ponte segura o peso, e o jogador aprende a ler o peso?"*

O motivo do Matter standalone está em ADR 0002: a mesma simulação roda headless no teste. É o único
dos quatro motores que dá para balancear por número antes de existir na tela.

## 7. O Mundo 2

Só depois dos anteriores. E com a aviso já escrito em
`GAME_DESIGN_CONTEXT.md` §13: **3 mundos excelentes > 5 inacabados**.
