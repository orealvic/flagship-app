const express = require("express");
const { CosmosClient } = require("@azure/cosmos");
const OpenAI = require("openai");

const router = express.Router();

const openaiEndpoint = process.env.OPENAI_ENDPOINT;
const openaiKey = process.env.OPENAI_API_KEY;
const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;

const embeddingClient = new OpenAI({
  apiKey: openaiKey,
  baseURL: `${openaiEndpoint}openai/deployments/text-embedding-3-small`,
  defaultQuery: { "api-version": "2024-02-01" },
  defaultHeaders: { "api-key": openaiKey }
});

const chatClient = new OpenAI({
  apiKey: openaiKey,
  baseURL: `${openaiEndpoint}openai/deployments/gpt-4o-mini`,
  defaultQuery: { "api-version": "2024-02-01" },
  defaultHeaders: { "api-key": openaiKey }
});

const cosmos = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
const container = cosmos.database("procurement-ai").container("embeddings");

async function retrieveContext(question, topK = 3) {
  const embeddingResp = await embeddingClient.embeddings.create({
    model: "text-embedding-3-small",
    input: question
  });
  const queryVector = embeddingResp.data[0].embedding;

  const querySpec = {
    query: `SELECT TOP @topK c.id, c.entity_type, c.entity_id, c.text, c.data,
                    VectorDistance(c.embedding, @queryVector) AS score
            FROM c
            ORDER BY VectorDistance(c.embedding, @queryVector)`,
    parameters: [
      { name: "@queryVector", value: queryVector },
      { name: "@topK", value: topK }
    ]
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return resources;
}

function buildSystemPrompt(retrievedDocs) {
  const context = retrievedDocs.map((d, i) => `[Source ${i + 1}] ${d.text}`).join("\n");
  return `You are a helpful assistant for the Flagship Procurement application. 
Answer questions about vendors, requisitions, and line items using ONLY the information in the sources below.
If the sources don't contain enough information, say so honestly.
Cite sources by their number (e.g., "[Source 1]") when relevant.

Sources:
${context}`;
}

router.post("/", async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message_required" });
    }

    const startedAt = Date.now();

    // 1. Retrieve relevant context
    const docs = await retrieveContext(message, 3);
    const retrievalMs = Date.now() - startedAt;

    // 2. Build messages array with system prompt + history + new message
    const messages = [
      { role: "system", content: buildSystemPrompt(docs) },
      ...history.slice(-6),  // keep last 6 turns to avoid runaway context
      { role: "user", content: message }
    ];

    // 3. Call gpt-4o-mini
    const completionStart = Date.now();
    const completion = await chatClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.3
    });
    const completionMs = Date.now() - completionStart;

    const answer = completion.choices[0].message.content;
    const sources = docs.map(d => ({
      id: d.id,
      entity_type: d.entity_type,
      entity_id: d.entity_id,
      text: d.text,
      score: d.score
    }));

    res.json({
      response: answer,
      sources,
      timing: {
        retrieval_ms: retrievalMs,
        completion_ms: completionMs,
        total_ms: Date.now() - startedAt
      },
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        total_tokens: completion.usage?.total_tokens
      }
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;