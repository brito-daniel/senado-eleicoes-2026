const COR_ACCENT = "#ec1e6e";
const COR_SECONDARY = "#2dd4bf";
const COR_TEXT_MUTED = "#9aa5b8";
const COR_LINE = "rgba(255, 255, 255, 0.12)";

const PALETA_PARTIDOS = [
  "#ec1e6e", "#2dd4bf", "#f4c94c", "#7c83fd", "#ff8552",
  "#4cc9f0", "#c77dff", "#94d82d", "#ff6b6b", "#5eead4",
  "#ffa8c5", "#a3e635", "#f472b6", "#38bdf8", "#fbbf24"
];

Chart.defaults.color = COR_TEXT_MUTED;
Chart.defaults.font.family = "'Space Mono', monospace";
Chart.defaults.font.size = 11;

async function main() {
  const resposta = await fetch("data/parlamentares_senado.json");
  const parlamentares = await resposta.json();

  const partidos = agruparPorPartido(parlamentares);

  renderGraficoTotalPorPartido(partidos);
  renderGraficoProporcional(partidos);
  renderGraficoLegislatura(partidos);
  renderGraficoProporcionalContinua(partidos);
  renderListaPartidos(partidos);
}

function agruparPorPartido(parlamentares) {
  const mapa = new Map();
  for (const p of parlamentares) {
    const sigla = p.SiglaPartidoParlamentar;
    if (!mapa.has(sigla)) mapa.set(sigla, []);
    mapa.get(sigla).push(p);
  }
  return [...mapa.entries()]
    .map(([sigla, membros]) => ({ sigla, membros }))
    .sort((a, b) => b.membros.length - a.membros.length);
}

function renderGraficoTotalPorPartido(partidos) {
  const ctx = document.getElementById("chart-total-partido");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: partidos.map((p) => p.sigla),
      datasets: [
        {
          label: "Parlamentares",
          data: partidos.map((p) => p.membros.length),
          backgroundColor: COR_ACCENT,
          borderRadius: 3,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: COR_LINE },
        },
        y: { grid: { display: false } },
      },
    },
  });
}

function renderGraficoProporcional(partidos) {
  const ctx = document.getElementById("chart-proporcional-partido");
  const total = partidos.reduce((soma, p) => soma + p.membros.length, 0);

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: partidos.map((p) => p.sigla),
      datasets: [
        {
          data: partidos.map((p) => p.membros.length),
          backgroundColor: partidos.map((_, i) => PALETA_PARTIDOS[i % PALETA_PARTIDOS.length]),
          borderColor: "#0d1b2e",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { boxWidth: 12, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: (item) => {
              const valor = item.raw;
              const pct = ((valor / total) * 100).toFixed(1);
              return `${item.label}: ${valor} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function renderGraficoLegislatura(partidos) {
  const ctx = document.getElementById("chart-legislatura-partido");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: partidos.map((p) => p.sigla),
      datasets: [
        {
          label: "Termina em 2027",
          data: partidos.map((p) => p.membros.filter((m) => m.NumeroLegislatura_2 === 57).length),
          backgroundColor: COR_ACCENT,
          borderRadius: 3,
        },
        {
          label: "Continua até 2031",
          data: partidos.map((p) => p.membros.filter((m) => m.NumeroLegislatura_2 === 58).length),
          backgroundColor: COR_SECONDARY,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { boxWidth: 12 } },
      },
      scales: {
        x: { stacked: true, grid: { display: false } },
        y: {
          stacked: true,
          beginAtZero: true,
          ticks: { precision: 0 },
          grid: { color: COR_LINE },
        },
      },
    },
  });
}

function renderGraficoProporcionalContinua(partidos) {
  const dados = partidos
    .map((p) => ({ sigla: p.sigla, total: p.membros.filter((m) => m.NumeroLegislatura_2 === 58).length }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);

  const ctx = document.getElementById("chart-proporcional-continua");
  const total = dados.reduce((soma, p) => soma + p.total, 0);

  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: dados.map((p) => p.sigla),
      datasets: [
        {
          data: dados.map((p) => p.total),
          backgroundColor: dados.map((_, i) => PALETA_PARTIDOS[i % PALETA_PARTIDOS.length]),
          borderColor: "#0d1b2e",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { boxWidth: 12, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: (item) => {
              const valor = item.raw;
              const pct = ((valor / total) * 100).toFixed(1);
              return `${item.label}: ${valor} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function renderListaPartidos(partidos) {
  const container = document.getElementById("lista-partidos");

  for (const { sigla, membros } of partidos) {
    const grupo = document.createElement("div");
    grupo.className = "partido-grupo";

    const termina2027 = membros.filter((m) => m.NumeroLegislatura_2 === 57);
    const continua2031 = membros.filter((m) => m.NumeroLegislatura_2 === 58);

    grupo.innerHTML = `
      <div class="partido-header">
        <span class="partido-sigla">${sigla}</span>
        <span class="partido-total">${membros.length} parlamentar${membros.length !== 1 ? "es" : ""}</span>
      </div>
      ${renderSubgrupo("Mandato termina em 2027", termina2027, false)}
      ${renderSubgrupo("Mandato continua até 2031", continua2031, true)}
    `;

    container.appendChild(grupo);
  }
}

function renderSubgrupo(titulo, membros, continua) {
  if (membros.length === 0) return "";
  return `
    <div class="mandato-subgrupo">
      <p class="mandato-subgrupo-titulo">${titulo}</p>
      <div class="cards-grid">
        ${membros.map((m) => renderCard(m, continua)).join("")}
      </div>
    </div>
  `;
}

function renderCard(m, continua) {
  const observacao = renderObservacao(m);
  return `
    <div class="card ${continua ? "card--continua" : ""}">
      <img class="card-photo" src="${m.UrlFotoParlamentar}" alt="${m.NomeParlamentar}" loading="lazy">
      <div class="card-body">
        <p class="card-nome">${m.NomeParlamentar}</p>
        <p class="card-uf">${m.UfParlamentar}</p>
        <span class="card-badge">${continua ? "Até 2031" : "Até 2027"}</span>
        ${observacao ? `<p class="card-obs">${observacao}</p>` : ""}
      </div>
    </div>
  `;
}

function renderObservacao(m) {
  if (m.AssumiuDefinitivamente === "Sim") {
    return `Assumiu definitivamente o mandato de ${m.NomeParlamentar_Titular} (${m.TipoSaidaTitular}).`;
  }
  if (m.EmExercicio === false) {
    return `Titular afastado temporariamente (${m.TipoSaidaTitular}). Mandato exercido por ${m.NomeParlamentar_Suplente}.`;
  }
  return "";
}

main();
