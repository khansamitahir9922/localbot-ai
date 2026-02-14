import { Pinecone } from "@pinecone-database/pinecone";

/* ─────────────────────────────────────────────────────────────
   Pinecone client & helpers
   ───────────────────────────────────────────────────────────── */

/**
 * Singleton Pinecone client instance.
 * Reused across requests to avoid creating a new connection each time.
 */
let pineconeClient: Pinecone | null = null;

function getClient(): Pinecone {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error("PINECONE_API_KEY is not set in environment variables.");
    }
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  return pineconeClient;
}

/**
 * Returns the Pinecone index object for our FAQ vectors.
 * Index name comes from the PINECONE_INDEX env variable.
 */
export function getPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX;
  if (!indexName) {
    throw new Error("PINECONE_INDEX is not set in environment variables.");
  }
  return getClient().index(indexName);
}

/* ────────────────────────── Types ────────────────────────── */

export interface VectorMetadata {
  chatbot_id: string;
  question: string;
  answer: string;
}

/* ────────────────────────── Upsert ────────────────────────── */

/**
 * Upsert a single vector into Pinecone.
 *
 * @param id       Unique ID for the vector (typically the qa_pairs row ID).
 * @param vector   The embedding array (1536 floats from text-embedding-3-small).
 * @param metadata Object with chatbot_id, question, and answer — stored
 *                 alongside the vector so we can return it in query results.
 */
export async function upsertVector(
  id: string,
  vector: number[],
  metadata: VectorMetadata
): Promise<void> {
  const index = getPineconeIndex();
  await index.upsert({
    records: [
      {
        id,
        values: vector,
        metadata,
      },
    ],
  });
}

/**
 * Upsert multiple vectors in a single batch call.
 */
export async function upsertVectorsBatch(
  vectors: { id: string; values: number[]; metadata: VectorMetadata }[]
): Promise<void> {
  if (vectors.length === 0) return;
  const index = getPineconeIndex();
  await index.upsert({ records: vectors });
}

/* ────────────────────────── Query ────────────────────────── */

export interface QueryMatch {
  id: string;
  score: number;
  question: string;
  answer: string;
}

/**
 * Query Pinecone for the most similar vectors, filtered by chatbot_id.
 *
 * @param vector    The query embedding (e.g. from the customer's question).
 * @param chatbotId Only return results belonging to this chatbot.
 * @param topK      Number of results to return (default 5).
 * @returns         Array of matches with id, score, question, and answer.
 */
export async function queryVectors(
  vector: number[],
  chatbotId: string,
  topK: number = 5
): Promise<QueryMatch[]> {
  const index = getPineconeIndex();

  const result = await index.query({
    vector,
    topK,
    includeMetadata: true,
    filter: {
      chatbot_id: { $eq: chatbotId },
    },
  });

  return (result.matches ?? []).map((match) => ({
    id: match.id,
    score: match.score ?? 0,
    question: (match.metadata?.question as string) ?? "",
    answer: (match.metadata?.answer as string) ?? "",
  }));
}

/* ────────────────────────── Delete ────────────────────────── */

/**
 * Delete a single vector by ID.
 * Call this when a Q&A pair is deleted from the knowledge base.
 */
export async function deleteVector(id: string): Promise<void> {
  const index = getPineconeIndex();
  await index.deleteOne({ id });
}

/**
 * Delete multiple vectors by their IDs.
 */
export async function deleteVectors(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const index = getPineconeIndex();
  await index.deleteMany({ ids });
}
