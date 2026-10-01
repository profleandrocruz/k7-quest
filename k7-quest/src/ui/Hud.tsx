/**
 * src/ui/Hud.tsx — O HUD: DOM DE PROPOSITO (Lente #48).
 *
 * Por que o HUD e DOM e nao canvas: leitor de tela, zoom do navegador, contraste
 * ajustavel e selecao de texto sao gratis no DOM e impossiveis no canvas. A regra do
 * projeto e explicita: "No canvas fica so o mundo."
 *
 * Este componente re-renderiza a 10 Hz, nunca a 60 — o throttle vive na store e nao
 * aqui. Tudo que ele mostra vem do `HudModel`, que o dominio ja decidiu.
 */
import { useHudStore } from '../engine/store';

function percent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

interface BarProps {
  label: string;
  value: number;
  max: number;
  tone: string;
}

function Bar({ label, value, max, tone }: BarProps) {
  return (
    <div className="bar">
      <span className="bar__label">{label}</span>
      <div
        className="bar__track"
        data-tone={tone}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value)}
      >
        <div className="bar__fill" data-tone={tone} style={{ width: `${percent(value, max)}%` }} />
      </div>
      <span className="bar__value">
        {Math.round(value)}/{max}
      </span>
    </div>
  );
}

export default function Hud() {
  const hud = useHudStore((s) => s.hud);

  return (
    <div className="hud">
      {/* ---- Canto superior esquerdo: o estado do jogador ---- */}
      <section className="hud__panel hud__panel--tl" aria-label="Estado do jogador">
        <Bar label="Vida" value={hud.health} max={hud.maxHealth} tone="danger" />
        <Bar label="Energia" value={hud.energy} max={hud.energyMax} tone="accent" />
        <p className="hud__meta">
          Fragmentos <strong>{hud.fragments.collected}/{hud.fragments.total}</strong>
        </p>
        {hud.enemiesRemaining > 0 ? (
          <p className="hud__meta">Inimigos: {hud.enemiesRemaining}</p>
        ) : null}
      </section>

      {/* ---- Canto superior direito: os dois canais de decisao ---- */}
      <section className="hud__panel hud__panel--tr" aria-label="Fita e eras">
        <h2 className="hud__heading">Fita</h2>
        {hud.tape ? (
          <p className="hud__tape" style={{ color: hud.tape.color }}>
            {hud.tape.name}
          </p>
        ) : (
          <p className="hud__meta">Nenhuma</p>
        )}

        <h2 className="hud__heading">Eras</h2>
        <ul className="chips">
          {hud.eras.map((era) => (
            <li key={era.era}>
              <span
                className="chip"
                data-active={era.active}
                data-locked={!era.unlocked}
                style={{ borderColor: era.palette }}
                title={era.blockedReason ?? era.rule}
              >
                <kbd className="chip__key">{era.shortcut}</kbd>
                {era.name}
                {!era.unlocked ? <span className="chip__lock"> travada</span> : null}
              </span>
            </li>
          ))}
        </ul>

        <h2 className="hud__heading">Ecos</h2>
        <p className="hud__meta">
          {hud.echoes.recording
            ? `Gravando (${hud.echoes.frames} amostras)`
            : `${hud.echoes.active} ativos / ${hud.echoes.savedHere} de ${hud.echoes.limit}`}
        </p>
      </section>

      {/* ---- Rodape: UM objetivo por vez, e a mensagem mais recente ---- */}
      <section className="hud__panel hud__panel--bottom" aria-label="Objetivo atual">
        {hud.objective ? (
          <p className="hud__objective" data-done={hud.objective.done}>
            <span className="hud__objective-text">{hud.objective.description}</span>
            <span className="hud__objective-count">
              {hud.objective.current}/{hud.objective.target}
            </span>
          </p>
        ) : null}
        {hud.status ? (
          <p className="hud__status" role="status">
            {hud.status}
          </p>
        ) : null}
      </section>
    </div>
  );
}
