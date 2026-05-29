const { CosmosClient } = require("@azure/cosmos");
const OpenAI = require("openai");

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

(async () => {
  const cosmos = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
  const container = cosmos.database("procurement-ai").container("embeddings");

  const question = "Which vendor sells coffee?";
  console.log("Question:", question);

  // Generate embedding for the question
  const embeddingResp = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });
  const queryVector = embeddingResp.data[0].embedding;
  console.log("Generated query embedding, length:", queryVector.length);

  // Vector search query
  const querySpec = {
    query: `SELECT TOP 3 c.id, c.entity_type, c.text, VectorDistance(c.embedding, @queryVector) AS score
            FROM c
            ORDER BY VectorDistance(c.embedding, @queryVector)`,
    parameters: [{ name: "@queryVector", value: queryVector }]
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  console.log("\nTop matches:");
  for (const r of resources) {
    console.log(`  [${r.score.toFixed(4)}] (${r.entity_type}) ${r.text}`);
  }
})().catch(e => { console.error("Error:", e.message); process.exit(1); });