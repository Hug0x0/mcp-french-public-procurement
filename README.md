# mcp-french-public-procurement

MCP server for French public procurement data: DECP, BOAMP discovery, buyers, suppliers, and SIRENE context.

## Tools

Run the MCP and call `french_public_procurement_get_sources` first to inspect source coverage. This server also exposes domain-specific tools for the topic described above.

Includes raw and curated DECP search, procurement dataset discovery, and supplier/buyer watch-plan helpers.

## Install

```bash
npm install
npm run build
npm test
npm run dev
```

## Claude Desktop

```json
{
  "mcpServers": {
    "french-public-procurement": {
      "command": "npx",
      "args": ["mcp-french-public-procurement"]
    }
  }
}
```

## Sources

- DECP consolidated tabular dataset: https://www.data.gouv.fr/datasets/donnees-essentielles-de-la-commande-publique-consolidees-format-tabulaire
- data.economie.gouv.fr DECP API: https://data.economie.gouv.fr/explore/dataset/decp-v3-marches-valides/
- API DECP: https://www.data.gouv.fr/datasets/api-decp
- BOAMP: https://www.boamp.fr/
- SIRENE data on data.gouv.fr: https://www.data.gouv.fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/
- data.gouv.fr API: https://doc.data.gouv.fr/api/reference/

## Publishing

See [docs/publishing.md](docs/publishing.md).

## Glama / Docker

The repo includes `Dockerfile` and `glama.json`.

Build steps:

```json
["npm install", "npm run build"]
```

CMD arguments:

```json
["node", "dist/index.js"]
```

## Safety

This MCP helps agents discover and summarize public sources. It is not an official authority. Verify decisions against the competent public service or original data producer.

## License

MIT
