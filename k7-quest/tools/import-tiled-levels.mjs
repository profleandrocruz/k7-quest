/**
 * tools/import-tiled-levels.mjs — DEVOLVE OS MAPAS DO TILED PARA O CODIGO.
 *
 * ESTE E O ITEM 2 DO `docs/loops.md`: ate aqui, o Tiled era um VISUALIZADOR. O
 * designer abria o mapa, arrastava um inimigo e nao tinha como publicar. Um editor
 * que nao publica nao e autoria (Lente #90).
 *
 *   npm run levels:import            ->  CONFIRMA que o que esta no Tiled bate com o
 *                                         codigo, e roda o validador de fases
 *   npm run levels:import -- --write ->  escreve src/game/content/levels/tiled/*.ts
 *
 * O CODIGO CONTINUA SENDO A FONTE DA VERDADE (esta e a mesma decisao do ADR 0001
 * aplicada ao conteudo). Por isso o padrao e CONFIRMAR e nao escrever: o padrao
 * responde "o que mudou no Tiled?" sem tocar em nada, e `--write` e a decisao
 * explicita de publicar.
 *
 * POR QUE O CODIGO GERADO VAI PARA `content/levels/tiled/` E NAO POR CIMA DO
 * `world1.ts`: as fases do slice tem comentarios queexplain POR QUE o mapa e assim
 * (a alternancia de eras do bosque, as duas solucoes do castelo). Sobrescrever esse
 * arquivo apagaria a intencao de design junto com o mapa. O que vem do Tiled e um
 *arquivo novo, com o mesmo estilo e o mesmo validador — e o `index.ts` escolhe entre
 * os dois explicitamente.
 *
 * A CONVERSAO NAO ESTA AQUI: ela mora em `src/game/content/levels/tiledFormat.ts`, o
 * mesmo modulo que o exportador carrega. Este arquivo so le disco, chama a regra e
 * escreve o resultado.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IN_DIR = join(ROOT, 'public', 'levels');
const OUT_DIR = join(ROOT, 'src', 'game', 'content', 'levels', 'tiled');

const WRITE = process.argv.includes('--write');

/**
 * Carrega a regra de conversao E o validador pelo resolver do Vite. O importador roda
 * o MESMO validador que o `npm test` roda: um mapa que quebra a fase tem de ser
 * recusado aqui, e nao descoberto num playtest.
 */
async function loadGame() {
  const vite = await createServer({
    root: ROOT,
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  });

  try {
    const format = await vite.ssrLoadModule('/src/game/content/levels/tiledFormat.ts');
    const validate = await vite.ssrLoadModule('/src/game/content/levels/validate.ts');
    const levels = await vite.ssrLoadModule('/src/game/content/levels/index.ts');
    return { format, validate, LEVELS: levels.LEVELS };
  } finally {
    await vite.close();
  }
}

/** Le todos os `.tmj` da pasta de trabalho. O `manifest.json` e opcional. */
function readMaps() {
  if (!existsSync(IN_DIR)) {
    throw new Error(
      `A pasta ${IN_DIR} nao existe. Rode \`npm run levels:export\` antes de importar.`,
    );
  }

  return readdirSync(IN_DIR)
    .filter((file) => file.endsWith('.tmj'))
    .sort()
    .map((file) => {
      // `filePath`, e nao `path`: `path` e o namespace de `node:path` importado acima, e
      // sombrea-lo faria o `catch` abaixo chamar um objeto em vez de ler o arquivo.
      const filePath = join(IN_DIR, file);
      try {
        // Tira o BOM (U+FEFF): tanto o Windows quanto o proprio Tiled podem gravar
        // um, e `JSON.parse` rejeita o arquivo inteiro por causa de tres bytes. Um mapa
        // legitimo que nao abre seria trabalho perdido do designer, sem motivo.
        return { file, map: JSON.parse(readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) };
      } catch (error) {
        throw new Error(`${file}: nao e um ".tmj" valido — ${error.message}`);
      }
    });
}

/**
 * Compara duas fases e devolve as diferencas em texto legivel.
 *
 * Um `JSON.stringify(a) === JSON.stringify(b)` seria mais curto e inutil: a
 * diferenca que importa aqui e "o designer mexeu neste tile", nao "os objetos estao
 * em ordens diferentes".
 *
 * Por que o resultado importa tanto: este diff e o que o designer le ANTES de
 * publicar. Um erro aqui (mostrar a linha errada, ou nenhuma) faz o `--write` parecer
 * seguro quando nao e — e o `--write` escreve por cima de codigo.
 */
function diffLevel(a, b) {
  const changes = [];

  for (const era of new Set([...Object.keys(a.tilemaps), ...Object.keys(b.tilemaps)])) {
    const antes = a.tilemaps[era];
    const depois = b.tilemaps[era];
    if (!antes || !depois) {
      changes.push(`  ${era}: camada ${antes ? 'sumiu' : 'apareceu'}`);
      continue;
    }
    for (let y = 0; y < Math.max(antes.length, depois.length); y += 1) {
      const linhaAntes = antes[y] ?? '';
      const linhaDepois = depois[y] ?? '';
      if (linhaAntes === linhaDepois) continue;
      // A PRIMEIRA coluna que difere. O `Math.min` evita correr alem da linha mais
      // curta quando o designer mudou o tamanho do mapa.
      let coluna = 0;
      const limite = Math.min(linhaAntes.length, linhaDepois.length);
      while (coluna < limite && linhaAntes[coluna] === linhaDepois[coluna]) coluna += 1;
      changes.push(
        `  ${era} linha ${y} coluna ${coluna}: "${linhaAntes[coluna] ?? '-'}" -> "${linhaDepois[coluna] ?? '-'}"`,
      );
    }
    if (antes.length !== depois.length) {
      changes.push(`  ${era}: altura mudou de ${antes.length} para ${depois.length} linhas`);
    }
  }

  const chave = (spawn) => `${spawn.kind}@${spawn.at.x},${spawn.at.y}`;
  const antesSpawns = new Set(a.spawns.map(chave));
  const depoisSpawns = new Set(b.spawns.map(chave));
  for (const s of depoisSpawns) if (!antesSpawns.has(s)) changes.push(`  spawn NOVO: ${s}`);
  for (const s of antesSpawns) if (!depoisSpawns.has(s)) changes.push(`  spawn REMOVIDO: ${s}`);

  if (a.name !== b.name) changes.push(`  nome: "${a.name}" -> "${b.name}"`);
  if (a.musicRef !== b.musicRef) changes.push(`  musica: "${a.musicRef}" -> "${b.musicRef}"`);

  return changes;
}

/**
 * Gera o arquivo `.ts` da fase imported.
 *
 * O arquivo gerado e DADO, nao codigo de autoria: por isso ele sai com os tilemaps
 * como strings literais (o que o designer acabou de desenhar, linha a linha) e sem
 * nenhum comentario inventado. A intencao de design continua em `designNote`, que
 * veio do mapa.
 *
 * As linhas do mapa sao escapadas com `JSON.stringify`: um tile `\` ou uma aspa nunca
 * entra como sintaxe. Um mapa com tile novo (alem da legenda) ja foi recusado na
 * conversao, mas o arquivo gerado nao pode ser o ponto onde isso quebra.
 */
function levelToSource(level) {
  const tilemaps = Object.entries(level.tilemaps)
    .map(([era, rows]) => {
      const linhas = rows.map((row) => `      ${JSON.stringify(row)},`).join('\n');
      return `    ${JSON.stringify(era)}: [\n${linhas}\n    ],`;
    })
    .join('\n');

  const spawns = level.spawns
    .map((spawn) => {
      const partes = [`kind: ${JSON.stringify(spawn.kind)}`, `at: at(${spawn.at.x / 16}, ${spawn.at.y / 16})`];
      if (spawn.era) partes.push(`era: ${JSON.stringify(spawn.era)}`);
      if (spawn.props && Object.keys(spawn.props).length > 0) {
        partes.push(`props: ${JSON.stringify(spawn.props)}`);
      }
      return `    { ${partes.join(', ')} },`;
    })
    .join('\n');

  // `const objetivos`: "constObjectives" seria lido como a palavra `const` seguida de
  // `Objectives`, e o `const` solto vira erro de sintaxe no arquivo gerado.
  const objectives = level.objectives
    .map((o) => `    { id: ${JSON.stringify(o.id)}, kind: ${JSON.stringify(o.kind)}, description: ${JSON.stringify(o.description)}${o.target === undefined ? '' : `, target: ${o.target}`}${o.era ? `, era: ${JSON.stringify(o.era)}` : ''} },`)
    .join('\n');

  const dialogue = level.dialogue
    ? `  dialogue: ${JSON.stringify(level.dialogue, null, 2).split('\n').join('\n  ')},\n`
    : '';

  const rewards = level.rewards
    ? `  rewards: ${JSON.stringify(level.rewards)},\n`
    : '';

  return `/**
 * src/game/content/levels/tiled/${level.id}.ts — FASE GERADA A PARTIR DO TILED.
 *
 * NAO EDITE ESTE ARQUIVO A MAO: ele e reescrito por \`npm run levels:import -- --write\`.
 * Para mudar o que o jogo faz, mude o codigo da fase em \`src/game/content/levels/\` e
 * rode \`npm run levels:export\`; para mudar o MAPA, edite no Tiled e importe.
 *
 * Gerado de: ${level.id}
 * Eras: ${Object.keys(level.tilemaps).join(', ')}
 */
// O arquivo mora em levels/tiled/, entao types.ts esta a TRES niveis acima
// (game/types.ts) e authoring.ts a dois (levels/authoring.ts).
import type { LevelDefinition } from '../../../types';
import { at } from '../authoring';

export const ${level.id.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ?? '').toUpperCase()).replace(/^[0-9]/, 'L$&')}: LevelDefinition = {
  id: ${JSON.stringify(level.id)},
  world: ${level.world},
  name: ${JSON.stringify(level.name)},
  startEra: ${JSON.stringify(level.startEra)},
  unlockedEras: ${JSON.stringify(level.unlockedEras)},
  tilemaps: {
${tilemaps}
  },
  spawns: [
${spawns}
  ],
  objectives: [
${objectives}
  ],
${dialogue}  musicRef: ${JSON.stringify(level.musicRef)},
${rewards}  designNote: ${JSON.stringify(level.designNote)},
};
`;
}

/** Um `index.ts` que expoe as fases geradas, para o registro de fases escolher. */
function indexToSource(levels) {
  const imports = levels
    .map((level) => {
      const nome = level.id.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ?? '').toUpperCase()).replace(/^[0-9]/, 'L$&');
      return `import { ${nome} } from './${level.id}';`;
    })
    .join('\n');

  const registros = levels
    .map((level) => {
      const nome = level.id.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c) => (c ?? '').toUpperCase()).replace(/^[0-9]/, 'L$&');
      return `  ${nome},`;
    })
    .join('\n');

  return `/**
 * src/game/content/levels/tiled/index.ts — FASES QUE VIERAM DO TILED.
 *
 * Gerado por \`npm run levels:import -- --write\`. Cada fase e um \`LevelDefinition\`
 * comum, com a mesma validacao de qualquer outra (ver \`levels/validate.ts\`): importar
 * do Tiled nao cria um caminho sem teste, so um caminho mais curto.
 */
import type { LevelDefinition } from '../../../types';
${imports}

/** As fases vindas do Tiled, na ordem em que os mapas foram lidos. */
export const TILED_LEVELS: readonly LevelDefinition[] = [
${registros}
];
`;
}


async function main() {
  const { format, validate, LEVELS } = await loadGame();
  const entradas = readMaps();
  if (entradas.length === 0) {
    throw new Error(`Nenhum .tmj em ${IN_DIR}. Rode \`npm run levels:export\` primeiro.`);
  }

  // Um erro de conversao (GID invalido, spawn fora da grade, mapa sem `k7Meta`) e
  // REPROVADO aqui, com o nome do arquivo: e um erro de autoria do mapa, e a
  // ferramenta aponta o arquivo, nao engole e segue.
  const grupos = format.groupMapsByLevel(entradas);
  const importadas = [];
  const problemas = [];

  for (const grupo of grupos) {
    // O mapa e conferido com o NOME do arquivo de verdade: um erro de autoria precisa
    // dizer "w1-l3-bosque--16bit.tmj: a camada e 64x13", nao "a fase".
    grupo.maps.forEach((map, i) => {
      try {
        format.assertMapShape(map, grupo.files[i]);
      } catch (error) {
        problemas.push(error.message);
      }
    });

    let fase;
    try {
      fase = format.levelFromMaps(grupo.files[0], grupo.maps);
    } catch (error) {
      problemas.push(error.message);
      continue;
    }

    // O MESMO validador do `npm test`. Uma fase importada nao ganha immunidade por
    // ter vindo de um editor visual: se o objetivo ficou inalcancavel, ela nao entra.
    const issues = validate.validateLevel(fase);
    if (issues.length > 0) {
      problemas.push(
        `a fase "${fase.id}" (de ${grupo.files.join(', ')}) nao passa no validador:\n` +
          issues.map((i) => `      - ${i.problem}`).join('\n'),
      );
      continue;
    }

    importadas.push(fase);
  }

  const porId = new Map(LEVELS.map((level) => [level.id, level]));
  const mudou = [];

  for (const fase of importadas) {
    const original = porId.get(fase.id);
    const diferencas = original ? diffLevel(original, fase) : ['fase nova (ainda nao existe no codigo)'];
    if (diferencas.length > 0) mudou.push({ fase, diferencas, original });
  }

  console.log(`[import] ${entradas.length} mapa(s) -> ${grupos.length} fase(s)`);
  for (const { fase, diferencas } of mudou) {
    console.log(`\n[import] ${fase.id}:`);
    for (const linha of diferencas.slice(0, 12)) console.log(linha);
    if (diferencas.length > 12) console.log(`  ... e mais ${diferencas.length - 12} mudanca(s)`);
  }

  if (problemas.length > 0) {
    console.error('\n[import] FALHAS:');
    for (const problema of problemas) console.error(`  - ${problema}`);
    process.exitCode = 1;
    return;
  }

  if (mudou.length === 0) {
    console.log('\n[import] os mapas do Tiled batem com o codigo. Nada a fazer.');
    return;
  }

  if (!WRITE) {
    console.log('\n[import] o Tiled tem mudancas ainda NAO publicadas no codigo.');
    console.log('[import] para publicar:  npm run levels:import -- --write');
    process.exitCode = 1;
    return;
  }

  mkdirSync(OUT_DIR, { recursive: true });
  for (const fase of importadas) {
    writeFileSync(join(OUT_DIR, `${fase.id}.ts`), levelToSource(fase), 'utf8');
  }
  writeFileSync(join(OUT_DIR, 'index.ts'), indexToSource(importadas), 'utf8');

  console.log(`\n[import] ${importadas.length} fase(s) escritas em src/game/content/levels/tiled/`);
  console.log('[import] para valer no jogo, registre-as em content/levels/index.ts e rode npm test');
}

main().catch((error) => {
  console.error('[import] erro:', error);
  process.exitCode = 1;
});



