# Composição do Senado Federal

Site estático de data journalism sobre a composição atual do Senado Federal, com destaque para quais mandatos terminam na legislatura atual (2027) e quais seguem até 2031.

## Dados

Os dados em [`data/parlamentares_senado.json`](data/parlamentares_senado.json) foram extraídos e tratados a partir da API de dados abertos do Senado Federal, com informações de filiação partidária coletadas em 26/07/2026.

## Rodando localmente

```
python3 -m http.server
```

Depois acesse `http://localhost:8000`.

## Deploy

Publicado via GitHub Pages, servindo o branch `main` a partir da raiz do repositório.

---

Elaborado por Daniel Brito · Dados: Senado Federal
