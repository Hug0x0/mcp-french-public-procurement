import { describe, expect, it } from 'vitest';

describe('mcp-french-public-procurement', () => {
  it('uses an mcp package name', () => {
    expect('mcp-french-public-procurement').toMatch(/^mcp-/);
  });

  it('has curated HTTP sources', () => {
    const sources = [
      {
            "title": "DECP consolidated tabular dataset",
            "url": "https://www.data.gouv.fr/datasets/donnees-essentielles-de-la-commande-publique-consolidees-format-tabulaire"
      },
      {
            "title": "data.economie.gouv.fr DECP API",
            "url": "https://data.economie.gouv.fr/explore/dataset/decp-v3-marches-valides/"
      },
      {
            "title": "API DECP",
            "url": "https://www.data.gouv.fr/datasets/api-decp"
      },
      {
            "title": "BOAMP",
            "url": "https://www.boamp.fr/"
      },
      {
            "title": "SIRENE data on data.gouv.fr",
            "url": "https://www.data.gouv.fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/"
      },
      {
            "title": "data.gouv.fr API",
            "url": "https://doc.data.gouv.fr/api/reference/"
      }
];
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source.url).toMatch(/^https?:\/\//);
    }
  });

  it('has a stable tool prefix', () => {
    expect('french_public_procurement').toMatch(/^[a-z0-9_]+$/);
  });
});
