#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const CONFIG = {
  "name": "mcp-french-public-procurement",
  "prefix": "french_public_procurement",
  "description": "MCP server for French public procurement data: DECP, BOAMP discovery, buyers, suppliers, and SIRENE context.",
  "sources": [
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
  ]
} as const;

interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

function jsonResult(data: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function errorResult(message: string): ToolResult {
  const data = { error: message };
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
    isError: true,
  };
}

function textFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,text/plain,application/xml,*/*',
      'User-Agent': `${CONFIG.name}/0.1 (+https://github.com/Hug0x0/${CONFIG.name})`,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

function dataGouvDatasetSummary(dataset: Record<string, unknown>) {
  return {
    id: dataset.id,
    slug: dataset.slug,
    title: dataset.title,
    page: dataset.page,
    organization: dataset.organization && typeof dataset.organization === 'object'
      ? (dataset.organization as Record<string, unknown>).name
      : undefined,
    resources_count: Array.isArray(dataset.resources) ? dataset.resources.length : undefined,
  };
}

async function searchDataGouv(query: string, pageSize: number) {
  const url = new URL('https://www.data.gouv.fr/api/1/datasets/');
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(pageSize));
  const data = await fetchJson<{ data?: Array<Record<string, unknown>>; total?: number }>(url.toString());
  return {
    query,
    total: data.total,
    datasets: (data.data ?? []).map(dataGouvDatasetSummary),
  };
}

function normalizePortalUrl(portalUrl: string): string {
  return portalUrl.replace(/\/$/, '');
}

async function odsRecords(portalUrl: string, dataset: string, params: Record<string, string | number | undefined>) {
  const url = new URL(`${normalizePortalUrl(portalUrl)}/api/explore/v2.1/catalog/datasets/${encodeURIComponent(dataset)}/records`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return fetchJson<Record<string, unknown>>(url.toString());
}

const server = new McpServer({ name: CONFIG.name, version: '0.1.0' });

server.tool(
  `${CONFIG.prefix}_get_sources`,
  'List curated sources used by this MCP.',
  {},
  async () => jsonResult({ server: CONFIG.name, description: CONFIG.description, sources: CONFIG.sources })
);

server.tool(
  `${CONFIG.prefix}_fetch_source_excerpt`,
  'Fetch a short text excerpt from a curated source by index or title keyword.',
  {
    source_key: z.string().describe('Source index, title keyword, or URL fragment.'),
    max_chars: z.number().int().min(200).max(4000).default(1200),
  },
  async ({ source_key, max_chars }) => {
    const normalized = source_key.toLowerCase();
    const source = CONFIG.sources.find((item, index) =>
      String(index + 1) === normalized ||
      item.title.toLowerCase().includes(normalized) ||
      item.url.toLowerCase().includes(normalized)
    );
    if (!source) return errorResult(`Unknown source: ${source_key}`);
    try {
      const text = await fetchText(source.url);
      return jsonResult({ source, excerpt: textFromHtml(text).slice(0, max_chars) });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : 'Failed to fetch source excerpt');
    }
  }
);


server.tool('french_public_procurement_search_decp', 'Query the consolidated DECP public-procurement dataset on data.economie.gouv.fr.', {
  buyer: z.string().optional().describe('Buyer/entity free-text search.'),
  supplier: z.string().optional().describe('Supplier free-text search.'),
  year: z.number().int().optional().describe('Publication/notification year when available.'),
  limit: z.number().int().min(1).max(100).default(20),
}, async ({ buyer, supplier, year, limit }) => {
  try {
    const where = [buyer ? `search('${buyer.replace(/'/g, "''")}')` : undefined, supplier ? `search('${supplier.replace(/'/g, "''")}')` : undefined, year ? `datenotification >= date'${year}-01-01' AND datenotification < date'${year + 1}-01-01'` : undefined].filter(Boolean).join(' AND ');
    const data = await odsRecords('https://data.economie.gouv.fr', 'decp-v3-marches-valides', { where, limit });
    return jsonResult({ source: 'data.economie.gouv.fr/decp-v3-marches-valides', query: { buyer, supplier, year, limit }, result: data });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : 'Failed to query DECP');
  }
});

server.tool('french_public_procurement_search_decp_curated', 'Query DECP and return curated procurement fields instead of raw OpenDataSoft records.', {
  query: z.string().optional().describe('Free-text search across the DECP record.'),
  year: z.number().int().optional().describe('Notification year when available.'),
  limit: z.number().int().min(1).max(100).default(20),
}, async ({ query, year, limit }) => {
  try {
    const where = [
      query ? `search('${query.replace(/'/g, "''")}')` : undefined,
      year ? `datenotification >= date'${year}-01-01' AND datenotification < date'${year + 1}-01-01'` : undefined,
    ].filter(Boolean).join(' AND ');
    const data = await odsRecords('https://data.economie.gouv.fr', 'decp-v3-marches-valides', { where, limit });
    const rows = Array.isArray(data.results) ? data.results as Array<Record<string, unknown>> : [];
    return jsonResult({
      source: 'data.economie.gouv.fr/decp-v3-marches-valides',
      query: { query, year, limit },
      total_count: data.total_count,
      contracts: rows.map((row) => ({
        id: row.id,
        object: row.objet ?? row.object,
        amount_eur: row.montant ?? row.valeurglobale,
        notification_date: row.datenotification,
        publication_date: row.datepublicationdonnees,
        procedure: row.procedure,
        buyer_name: row.acheteur_nom ?? row.acheteur_id,
        buyer_id: row.acheteur_id,
        supplier_name: row.titulaire_denominationsociale ?? row.titulaire_denominationsociale_1,
        supplier_id: row.titulaire_id ?? row.titulaire_id_1,
        cpv: row.cpv ?? row.codecpv,
        raw_keys_available: Object.keys(row).slice(0, 40),
      })),
    });
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : 'Failed to query curated DECP');
  }
});

server.tool('french_public_procurement_search_datasets', 'Search data.gouv.fr for public-procurement datasets such as DECP, BOAMP, concessions, buyers, and PLACE exports.', {
  query: z.string().default('données essentielles commande publique BOAMP'),
  page_size: z.number().int().min(1).max(50).default(10),
}, async ({ query, page_size }) => {
  try { return jsonResult(await searchDataGouv(query, page_size)); } catch (error) { return errorResult(error instanceof Error ? error.message : 'Failed to search procurement datasets'); }
});

server.tool('french_public_procurement_build_supplier_watch', 'Build useful source queries for monitoring one supplier or buyer across DECP, BOAMP and SIRENE context.', {
  name: z.string().describe('Supplier or buyer name.'),
  siret: z.string().optional().describe('Optional SIRET/SIREN identifier.'),
}, async ({ name, siret }) => jsonResult({
  name, siret,
  recommended_queries: [
    { source: 'DECP', query: siret ?? name },
    { source: 'BOAMP', query: name },
    { source: 'SIRENE', query: siret ?? name },
  ],
  data_gouv_queries: [`DECP ${name}`, `BOAMP ${name}`, `SIRENE ${siret ?? name}`],
}));


async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error(`${CONFIG.name} running on stdio`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
