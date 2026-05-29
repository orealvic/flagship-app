const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseName = "procurement-ai";
const containerName = "embeddings";

(async () => {
  const client = new CosmosClient({ endpoint, key });

  console.log("Creating database...");
  const { database } = await client.databases.createIfNotExists({ id: databaseName });
  console.log("  database:", database.id);

  console.log("Creating container with vector index...");
  const { container } = await database.containers.createIfNotExists({
    id: containerName,
    partitionKey: { paths: ["/entity_type"] },
    indexingPolicy: {
      indexingMode: "consistent",
      automatic: true,
      includedPaths: [{ path: "/*" }],
      excludedPaths: [
        { path: "/embedding/*" },
        { path: "/\"_etag\"/?" }
      ],
      vectorIndexes: [{ path: "/embedding", type: "quantizedFlat" }]
    },
    vectorEmbeddingPolicy: {
      vectorEmbeddings: [{
        path: "/embedding",
        dataType: "float32",
        distanceFunction: "cosine",
        dimensions: 1536
      }]
    }
  }, { offerThroughput: 400 });

  console.log("  container:", container.id);
  console.log("Done.");
})().catch(e => { console.error("Error:", e.message); process.exit(1); });