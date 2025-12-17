import type { ReplayPerfReport } from "./types";

export function reportHtml(d3Source: string, chartJsSource: string, report: ReplayPerfReport): string {
  const safeJson = JSON.stringify(report).replace(/</g, "\\u003c");
  const title = `OpenFront Replay Perf Report - ${report.meta.gameID}`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
        margin: 0;
        background: #0b1220;
        color: #e5e7eb;
      }
      header { padding: 18px 22px; border-bottom: 1px solid rgba(255,255,255,0.08); }
      header h1 { margin: 0 0 6px 0; font-size: 18px; }
      header .meta { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 12px; opacity: 0.85; }
      main { padding: 16px 22px 40px; margin: 0 auto; }
      .grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
      @media (min-width: 900px) { .grid { grid-template-columns: 1fr 1fr; } }
      .card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 12px 8px; }
      .card h2 { margin: 0 0 8px 0; font-size: 14px; }
      .summary-sticky { position: sticky; top: 0; z-index: 100; background: #0b1220; padding: 10px 12px 6px; margin: -10px -12px 8px; border-radius: 12px 12px 0 0; }
      svg {overflow: visible;}
      .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
      .kpi { padding: 8px 10px; border-radius: 8px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); }
      .kpi .label { font-size: 11px; opacity: 0.8; margin-bottom: 1px; }
      .kpi .value { font-size: 16px; font-weight: 700; margin-top: 0; line-height: 1.2; }
      .kpi .sub { font-size: 11px; opacity: 0.75; margin-top: 1px; line-height: 1.2; }
      .chart { width: 100%; height: 260px; }
      .axis path, .axis line { stroke: rgba(255,255,255,0.18); }
      .axis text { fill: rgba(229,231,235,0.8); font-size: 11px; }
      .gridline line { stroke: rgba(255,255,255,0.06); }
      .tooltip { position: fixed; pointer-events: none; background: rgba(0,0,0,0.85); border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; padding: 8px 10px; font-size: 12px; line-height: 1.35; transform: translate(10px, 10px); display: none; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 12px; vertical-align: top; }
      th { opacity: 0.85; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
      .muted { opacity: 0.75; }
      .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 0 0 10px; font-size: 12px; }
      .controls label { display: inline-flex; gap: 6px; align-items: center; }
      .controls input[type="text"] { background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.10); color: #e5e7eb; border-radius: 8px; padding: 6px 8px; min-width: 220px; }
      input[type="range"] { background: transparent; cursor: pointer; }
      input[type="range"]::-webkit-slider-thumb { appearance: none; background: #60a5fa; border-radius: 50%; width: 16px; height: 16px; cursor: pointer; }
      input[type="range"]::-moz-range-thumb { background: #60a5fa; border-radius: 50%; width: 16px; height: 16px; cursor: pointer; border: none; }
      .collapsible { cursor: pointer; user-select: none; }
      .collapsible:hover { opacity: 0.8; }
      .collapsible::before { content: "▶"; display: inline-block; margin-right: 8px; transition: transform 0.2s; }
      .collapsible.collapsed::before { transform: rotate(0deg); }
      .collapsible.expanded::before { transform: rotate(90deg); }
      .collapsible-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
      .collapsible-content.expanded { max-height: 1000px; }
      .summary-sticky { position: sticky; top: 0; z-index: 100; background: #0b1220; }
    </style>
  </head>
  <body>
    <header>
      <h1>${title}</h1>
      <div class="meta">
        replay: <a href="${report.meta.apiBase}/game/${report.meta.gameID}" target="_blank">${report.meta.gameID}</a><br/>
        git: ${report.meta.replayGitCommit ?? "n/a"}<br/>
        map: ${report.meta.map} (${report.meta.mapSize}) | turns: ${report.meta.numTurns} | simulated: ${report.meta.numTicksSimulated}<br/>
        unknown clientIDs: ${report.meta.unknownClientIds.total} (non-mark: ${report.meta.unknownClientIds.withNonMarkIntents}, mark-only: ${report.meta.unknownClientIds.markOnly})<br/>
        generated: ${report.meta.generatedAt}
      </div>
    </header>
    <main>
      <div class="card summary-sticky">
        <div id="summary" class="summary"></div>
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 11px; opacity: 0.8; flex-shrink: 0;">
              Current range: <span id="timeline-range-display" class="mono">All turns</span>
            </div>
            <div id="timeline-range-bar" style="flex: 1; min-width: 0;"></div>
            <button id="timeline-reset" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.10); color: #e5e7eb; border-radius: 4px; padding: 2px 6px; font-size: 10px; cursor: pointer; flex-shrink: 0;">Reset</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top: 14px;">
        <h2 class="collapsible collapsed" onclick="toggleDiagnostics()">Diagnostics</h2>
        <div id="diagnostics" class="collapsible-content muted"></div>
      </div>

      <div class="grid" style="margin-top: 14px;">
        <div class="card">
          <h2>Tick execution time (ms)</h2>
          <div id="chart-tick-ms" class="chart"></div>
        </div>
        <div class="card">
          <h2>Intents per tick</h2>
          <div id="chart-intents" class="chart"></div>
        </div>
        <div class="card">
          <h2>Players alive (humans)</h2>
          <div id="chart-players" class="chart"></div>
        </div>
        <div class="card">
          <h2>🗺️ Tiles owned over time</h2>
          <div id="chart-tiles-owned" class="chart"></div>
        </div>
        <div class="card">
          <h2>🗺️ Peak tiles owned</h2>
          <div id="chart-tiles" class="chart"></div>
        </div>
      </div>

      <div class="grid" style="margin-top: 14px;">
        <!-- Income Sources -->
        <div class="card">
          <h2>💰 Gold earned: trade ships (K)</h2>
          <div id="chart-gold-earned-trade" class="chart"></div>
        </div>
        <div class="card">
          <h2>🚂 Gold earned: rail/trains (K)</h2>
          <div id="chart-gold-earned-train" class="chart"></div>
        </div>
        <div class="card">
          <h2>⚔️ Gold earned: conquest/war (K)</h2>
          <div id="chart-gold-earned-conquer" class="chart"></div>
        </div>
        <div class="card">
          <h2>📊 Gold income sources breakdown (K)</h2>
          <div id="chart-gold-sources" class="chart"></div>
        </div>
        <div class="card">
          <h2>➕ Troop sources (gains)</h2>
          <div id="chart-troop-sources" class="chart"></div>
        </div>
        <div class="card">
          <h2>➖ Troop drains (losses)</h2>
          <div id="chart-troop-drains" class="chart"></div>
        </div>

        <!-- Spending & Balance -->
        <div class="card">
          <h2>💸 Gold spent: total (K)</h2>
          <div id="chart-gold-spent-total" class="chart"></div>
        </div>
        <div class="card">
          <h2>⚖️ Gold earned: other (residual) (K)</h2>
          <div id="chart-gold-earned-other" class="chart"></div>
        </div>

        <!-- Diplomatic Activity -->
        <div class="card">
          <h2>🤝 Gold donations sent (K)</h2>
          <div id="chart-gold-donations-sent" class="chart"></div>
        </div>
        <div class="card">
          <h2>🎁 Gold donations received (K)</h2>
          <div id="chart-gold-donations-received" class="chart"></div>
        </div>
        <div class="card">
          <h2>👥 Troop donations sent</h2>
          <div id="chart-troop-donations-sent" class="chart"></div>
        </div>
        <div class="card">
          <h2>🛡️ Troop donations received</h2>
          <div id="chart-troop-donations-received" class="chart"></div>
        </div>

      </div>

      <div class="card" style="margin-top: 14px;">
        <h2>Players</h2>
        <div id="players-header-info" class="muted" style="font-size: 12px; margin: 0 0 10px;">
          Economy totals come from per-tick gold deltas (engine stats + balance changes), sampled every <span class="mono">${report.economy.sampleEveryTurns}</span> turns.
        </div>
        <div class="controls muted">
          <label><input type="checkbox" id="show-humans" checked /> Humans</label>
          <label><input type="checkbox" id="show-bots" /> Bots</label>
          <label><input type="checkbox" id="show-npcs" /> NPCs</label>
          <input type="text" id="player-search" placeholder="filter name / clientID" class="mono" />
        </div>
        <div style="overflow:auto;">
          <table id="players-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Type</th>
                <th>State</th>
                <th>Tiles (end)</th>
                <th>Tiles (max)</th>
                <th>Troops</th>
                <th>Gold (end)</th>
                <th>Earned (total)</th>
                <th>Earned (trade)</th>
                <th>Earned (rail)</th>
                <th>Earned (conquer)</th>
                <th>Earned (other)</th>
                <th>Spent (total)</th>
                <th>Lost (conquest)</th>
                <th>Earned (replay)</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </main>

    <div id="tooltip" class="tooltip"></div>
    <script>${d3Source}</script>
    <script id="report-data" type="application/json">${safeJson}</script>
    <script>${chartJsSource}</script>
  </body>
</html>`;
}

