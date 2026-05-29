const { CosmosClient } = require("@azure/cosmos");
const OpenAI = require("openai");

const apiBase = process.env.API_BASE || "https://app-flagship-procurement-api-prod-7z1bw1.azurewebsites.net";
const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;
const openaiEndpoint = process.env.OPENAI_ENDPOINT;
const openaiKey = process.env.OPENAI_API_KEY;

const openai = new OpenAI({
  apiKey: openaiKey,
  baseURL: `${openaiEndpoint}openai/deployments/text-embedding-3-small`,
  defaultQuery: { "api-version": "2024-02-01" },
  defaultHeaders: { "api-key": openaiKey }
});

async function embed(text) {
  const result = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text
  });
  return result.data[0].embedding;
}

async function fetchJson(path) {
  const res = await fetch(`${apiBase}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
  return res.json();
}

(async () => {
  console.log("Connecting to Cosmos DB...");
  const cosmos = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
  const container = cosmos.database("procurement-ai").container("embeddings");

  console.log("Fetching vendors from API...");
  const vendorsResp = await fetchJson("/api/vendors");
  for (const v of vendorsResp.vendors) {
    const text = `Vendor: ${v.name}. Email: ${v.email || "no email"}. Status: ${v.status}.`;
    const embedding = await embed(text);
    await container.items.upsert({
      id: `vendor-${v.id}`,
      entity_type: "vendor",
      entity_id: v.id,
      text,
      data: v,
      embedding
    });
    console.log(`  Embedded vendor: ${v.name}`);
  }

  console.log("Fetching requisitions from API...");
  const reqsResp = await fetchJson("/api/requisitions");
  for (const r of reqsResp.requisitions) {
    const detailResp = await fetchJson(`/api/requisitions/${r.id}`);
    const lineItems = detailResp.line_items || [];
    const lineItemSummary = lineItems.map(li =>
      `${li.quantity}x ${li.description} @ $${li.unit_price}`
    ).join("; ");
    const text = `Requisition #${r.id}: "${r.title}" by ${r.requester} from ${r.vendor_name || "no vendor"}. Status: ${r.status}. Total: $${r.total_amount}. Line items: ${lineItemSummary}.`;
    const embedding = await embed(text);
    await container.items.upsert({
      id: `req-${r.id}`,
      entity_type: "requisition",
      entity_id: r.id,
      text,
      data: { ...detailResp.requisition, line_items: lineItems },
      embedding
    });
    console.log(`  Embedded requisition: ${r.title}`);
  }

  console.log("\nDone. Vendors + requisitions embedded.");
})().catch(e => { console.error("Error:", e.message); process.exit(1); });