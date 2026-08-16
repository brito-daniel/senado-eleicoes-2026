const COR_ACCENT = "#ec1e6e";
const COR_SECONDARY = "#2dd4bf";
const COR_TEXT_MUTED = "#9aa5b8";
const COR_LINE = "rgba(255, 255, 255, 0.12)";

const PALETA_PARTIDOS = [
  "#ec1e6e", "#2dd4bf", "#f4c94c", "#7c83fd", "#ff8552",
  "#4cc9f0", "#c77dff", "#94d82d", "#ff6b6b", "#5eead4",
  "#ffa8c5", "#a3e635", "#f472b6", "#38bdf8", "#fbbf24"
];

const HEMICICLO_RAIO_MIN = 70;
const HEMICICLO_LINHA_ESPACO = 40;
const HEMICICLO_RAIO_TETO = 230;
const HEMICICLO_ESPACAMENTO = 26;

Chart.defaults.color = COR_TEXT_MUTED;
Chart.defaults.font.family = "'Space Mono', monospace";
Chart.defaults.font.size = 11;

async function main() {
  const [respostaParlamentares, respostaCandidaturas] = await Promise.all([
    fetch("data/parlamentares_senado.json"),
    fetch("data/senadores_candidaturas_2026.csv"),
  ]);
  const parlamentares = await respostaParlamentares.json();
  const candidaturasPorNome = parseCandidaturasCsv(await respostaCandidaturas.text());

  for (const p of parlamentares) {
    p.Candidatura2026 = candidaturasPorNome.get(p.NomeParlamentar) || null;
  }

  const partidos = agruparPorPartido(parlamentares);
  const ufs = agruparPorUf(parlamentares);

  renderGraficoTotalPorPartido(partidos);
  renderHemiciclo("hemiciclo-total", partidos);
  renderGraficoLegislatura(partidos);
  renderHemiciclo("hemiciclo-continua", partidos, { apenasContinua: true });
  renderStatsCandidaturas(parlamentares);
  configurarAgrupamentoLista({ partido: partidos, uf: ufs });
}

function parseCandidaturasCsv(texto) {
  const linhas = texto.trim().split("\n");
  const mapa = new Map();
  for (let i = 1; i < linhas.length; i++) {
    const campos = linhas[i].split(";");
    const nome = (campos[0] || "").trim();
    const candidatura = (campos[4] || "").trim();
    if (nome) mapa.set(nome, candidatura);
  }
  return mapa;
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

function agruparPorUf(parlamentares) {
  const mapa = new Map();
  for (const p of parlamentares) {
    const uf = p.UfParlamentar;
    if (!mapa.has(uf)) mapa.set(uf, []);
    mapa.get(uf).push(p);
  }
  return [...mapa.entries()]
    .map(([sigla, membros]) => ({ sigla, membros }))
    .sort((a, b) => a.sigla.localeCompare(b.sigla));
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

function calcularPosicoesAssentos(n, { raioMin, linhaEspaco, raioTeto, espacamento }) {
  if (n <= 0) return [];

  let numFileiras = 1;
  let capacidades = [];
  while (true) {
    capacidades = [];
    for (let i = 0; i < numFileiras; i++) {
      const raio = raioMin + i * linhaEspaco;
      capacidades.push({ raio, capacidade: Math.max(1, Math.floor((Math.PI * raio) / espacamento) + 1) });
    }
    const total = capacidades.reduce((soma, c) => soma + c.capacidade, 0);
    const raioAtual = raioMin + (numFileiras - 1) * linhaEspaco;
    if (total >= n || raioAtual >= raioTeto) break;
    numFileiras++;
  }

  const totalCapacidade = capacidades.reduce((soma, c) => soma + c.capacidade, 0);
  const escala = n / totalCapacidade;
  const porFileira = capacidades.map((c) => Math.max(1, Math.round(c.capacidade * escala)));

  let diferenca = n - porFileira.reduce((soma, v) => soma + v, 0);
  let idx = porFileira.length - 1;
  while (diferenca !== 0) {
    if (diferenca > 0) {
      porFileira[idx]++;
      diferenca--;
    } else if (porFileira[idx] > 1) {
      porFileira[idx]--;
      diferenca++;
    }
    idx = idx === 0 ? porFileira.length - 1 : idx - 1;
  }

  const posicoes = [];
  capacidades.forEach(({ raio }, i) => {
    const qtd = porFileira[i];
    for (let j = 0; j < qtd; j++) {
      const theta = qtd === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (qtd - 1);
      posicoes.push({ raio, theta });
    }
  });

  posicoes.sort((a, b) => b.theta - a.theta || a.raio - b.raio);
  return posicoes;
}

function renderHemiciclo(containerId, partidos, { apenasContinua = false } = {}) {
  const grupos = partidos
    .map((p, i) => ({
      sigla: p.sigla,
      cor: PALETA_PARTIDOS[i % PALETA_PARTIDOS.length],
      qtd: apenasContinua
        ? p.membros.filter((m) => m.NumeroLegislatura_2 === 58).length
        : p.membros.length,
    }))
    .filter((g) => g.qtd > 0);

  const total = grupos.reduce((soma, g) => soma + g.qtd, 0);
  const posicoes = calcularPosicoesAssentos(total, {
    raioMin: HEMICICLO_RAIO_MIN,
    linhaEspaco: HEMICICLO_LINHA_ESPACO,
    raioTeto: HEMICICLO_RAIO_TETO,
    espacamento: HEMICICLO_ESPACAMENTO,
  });

  const raioMaxUsado = posicoes.reduce((max, p) => Math.max(max, p.raio), HEMICICLO_RAIO_MIN);
  const margem = 50;
  const largura = raioMaxUsado * 2 + margem * 2;
  const altura = raioMaxUsado + margem + 30;
  const cx = largura / 2;
  const cy = altura - 30;
  const raioAssento = 8;

  const assentosSvg = [];
  let cursor = 0;
  for (const g of grupos) {
    const pct = ((g.qtd / total) * 100).toFixed(1);
    for (let k = 0; k < g.qtd; k++) {
      const { raio, theta } = posicoes[cursor++];
      const x = (cx + raio * Math.cos(theta)).toFixed(1);
      const y = (cy - raio * Math.sin(theta)).toFixed(1);
      assentosSvg.push(
        `<circle cx="${x}" cy="${y}" r="${raioAssento}" fill="${g.cor}"><title>${g.sigla}: ${g.qtd} (${pct}%)</title></circle>`
      );
    }
  }

  const legenda = grupos
    .map((g) => {
      const pct = ((g.qtd / total) * 100).toFixed(1);
      return `<li class="hemiciclo-legenda-item"><span class="hemiciclo-legenda-swatch" style="background:${g.cor}"></span>${g.sigla} — ${g.qtd} (${pct}%)</li>`;
    })
    .join("");

  const container = document.getElementById(containerId);
  container.innerHTML = `
    <svg viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Diagrama de repartição eleitoral por partido">
      ${assentosSvg.join("")}
    </svg>
    <ul class="hemiciclo-legenda">${legenda}</ul>
  `;
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

function renderStatsCandidaturas(parlamentares) {
  renderStatGrid(
    "stats-candidaturas-2027",
    parlamentares.filter((p) => p.NumeroLegislatura_2 === 57),
    ""
  );
  renderStatGrid(
    "stats-candidaturas-2031",
    parlamentares.filter((p) => p.NumeroLegislatura_2 === 58),
    "stat-card--2031"
  );
}

function renderStatGrid(containerId, membros, modificadorAno) {
  const contagens = new Map();
  for (const m of membros) {
    const categoria = m.Candidatura2026 || "Não informado";
    contagens.set(categoria, (contagens.get(categoria) || 0) + 1);
  }

  const categorias = [...contagens.entries()].sort((a, b) => b[1] - a[1]);

  const container = document.getElementById(containerId);
  container.innerHTML = categorias
    .map(([categoria, qtd]) => {
      const semCandidatura = categoria === "Não vai concorrer";
      return `
        <div class="stat-card ${modificadorAno} ${semCandidatura ? "stat-card--sem-candidatura" : ""}">
          <p class="stat-value">${qtd}</p>
          <p class="stat-label">${categoria}</p>
        </div>
      `;
    })
    .join("");
}

function concordarGenero(texto, sexo) {
  if (sexo !== "Feminino") return texto;
  return texto
    .replace(/\bCandidato\b/g, "Candidata")
    .replace(/\b1º(?=\s|$)/g, "1ª")
    .replace(/\bDeputado\b/g, "Deputada")
    .replace(/\bGovernador\b/g, "Governadora");
}

function formatarCandidatura(m) {
  const bruto = m.Candidatura2026;
  if (!bruto) return { texto: "Candidatura não informada", concorre: false };
  if (bruto === "Não vai concorrer") {
    return { texto: "Não vai concorrer", concorre: false };
  }
  return { texto: `Concorre: ${concordarGenero(bruto, m.SexoParlamentar)}`, concorre: true };
}

function renderListaPartidos(partidos) {
  const container = document.getElementById("lista-partidos");
  container.innerHTML = "";
  const gruposPartido = [];

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
      <div class="partido-mandatos-resumo">
        <p class="partido-mandatos-resumo-item partido-mandatos-resumo-item--2027">${formatarResumoMandato(termina2027.length, "termina")}</p>
        <p class="partido-mandatos-resumo-item partido-mandatos-resumo-item--2031">${formatarResumoMandato(continua2031.length, "continua")}</p>
      </div>
      ${renderSubgrupo("Mandato termina em 2027", termina2027, false)}
      ${renderSubgrupo("Mandato continua até 2031", continua2031, true)}
    `;

    container.appendChild(grupo);
    gruposPartido.push({ sigla, elemento: grupo });
  }

  return gruposPartido;
}

function formatarResumoMandato(qtd, tipo) {
  if (qtd === 0) {
    return tipo === "termina"
      ? "Nenhum parlamentar termina o mandato em 2027."
      : "Nenhum parlamentar continua no mandato até 2031.";
  }
  if (qtd === 1) {
    return tipo === "termina" ? "1 parlamentar termina o mandato em 2027." : "1 continua no mandato até 2031.";
  }
  return tipo === "termina"
    ? `${qtd} parlamentares terminam o mandato em 2027.`
    : `${qtd} continuam no mandato até 2031.`;
}

function renderMenuPartidos(partidos, gruposPartido) {
  const container = document.getElementById("menu-partidos");
  if (!container) return null;
  container.innerHTML = "";

  const pills = partidos.map((p, i) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "menu-partido-pill";
    pill.textContent = p.sigla;
    pill.addEventListener("click", () => {
      gruposPartido[i].elemento.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    container.appendChild(pill);
    return pill;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const idx = gruposPartido.findIndex((g) => g.elemento === entry.target);
        if (idx === -1) continue;
        pills.forEach((pill, i) => pill.classList.toggle("active", i === idx));
      }
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );
  gruposPartido.forEach((g) => observer.observe(g.elemento));
  return observer;
}

function configurarAgrupamentoLista(grupos) {
  let observerAtual = null;

  function renderizar(tipo) {
    if (observerAtual) observerAtual.disconnect();
    const gruposLista = renderListaPartidos(grupos[tipo]);
    observerAtual = renderMenuPartidos(grupos[tipo], gruposLista);
  }

  const botoes = document.querySelectorAll(".agrupamento-toggle-btn");
  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      if (botao.classList.contains("active")) return;
      botoes.forEach((b) => b.classList.toggle("active", b === botao));
      renderizar(botao.dataset.agrupamento);
    });
  });

  renderizar("partido");
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
  const eleicao = formatarCandidatura(m);
  return `
    <div class="card ${continua ? "card--continua" : ""}">
      <img class="card-photo" src="${m.UrlFotoParlamentar}" alt="${m.NomeParlamentar}" loading="lazy">
      <div class="card-body">
        <p class="card-nome">${m.NomeParlamentar}</p>
        <p class="card-uf">${m.UfParlamentar}</p>
        <span class="card-badge">${continua ? "Até 2031" : "Até 2027"}</span>
        <span class="card-badge card-badge--eleicao ${eleicao.concorre ? "" : "card-badge--sem-candidatura"}">${eleicao.texto}</span>
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
