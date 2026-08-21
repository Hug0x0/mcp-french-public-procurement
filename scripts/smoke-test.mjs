#!/usr/bin/env node

const sources = [
  [
    "DECP consolidated tabular dataset",
    "https://www.data.gouv.fr/datasets/donnees-essentielles-de-la-commande-publique-consolidees-format-tabulaire"
  ],
  [
    "data.economie.gouv.fr DECP API",
    "https://data.economie.gouv.fr/explore/dataset/decp-v3-marches-valides/"
  ],
  [
    "API DECP",
    "https://www.data.gouv.fr/datasets/api-decp"
  ],
  [
    "BOAMP",
    "https://www.boamp.fr/"
  ],
  [
    "SIRENE data on data.gouv.fr",
    "https://www.data.gouv.fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/"
  ],
  [
    "data.gouv.fr API",
    "https://doc.data.gouv.fr/api/reference/"
  ]
];
let failures = 0;

for (const [title, url] of sources) {
  try {
    const response = await fetch(url, { headers: { Accept: 'text/html,application/json,*/*', 'User-Agent': 'mcp-french-public-procurement-smoke/0.1' } });
    const body = await response.text();
    const ok = response.ok && body.length > 50;
    console.log(`${ok ? 'OK' : 'FAIL'} ${response.status} ${title} ${url}`);
    if (!ok) failures += 1;
  } catch (error) {
    failures += 1;
    console.log(`FAIL ${title} ${url} ${error.message}`);
  }
}

process.exitCode = failures === 0 ? 0 : 1;
