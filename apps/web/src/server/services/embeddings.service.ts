import "server-only";
import { SupabaseClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import https from "https";
import * as embeddingsRepo from "../repos/embeddings.repo";
import { EntityType } from "../repos/embeddings.repo";
import {
  normalizeVector,
  EMBEDDING_MODEL,
  JINA_EMBEDDING_MODEL,
} from "../logic/similarity";
import { CURRENT_EMBEDDING_VERSION } from "../embedding-version";

export type EmbeddingProvider = "jina" | "open-ai";

async function getJinaEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: JINA_EMBEDDING_MODEL,
      task: "text-matching",
      dimensions: 1024,
      input: [text],
    });

    const options = {
      hostname: "api.jina.ai",
      port: 443,
      path: "/v1/embeddings",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const result = JSON.parse(responseData);
          if (!result.data || result.data.length === 0) {
            reject(new Error("No embedding received from Jina API"));
            return;
          }
          resolve(result.data[0].embedding);
        } catch (error) {
          reject(new Error(`Failed to parse Jina API response: ${error}`));
        }
      });
    });

    req.on("error", (error) => {
      reject(new Error(`Jina API request failed: ${error.message}`));
    });

    req.write(data);
    req.end();
  });
}

export async function generateAndStoreEmbedding(
  sb: SupabaseClient,
  userId: string,
  entityType: EntityType,
  entityId: string,
  text: string,
  provider: EmbeddingProvider,
  apiKey: string
) {
  let rawEmbedding: number[];
  let modelName: string;

  if (provider === "jina") {
    rawEmbedding = await getJinaEmbedding(text, apiKey);
    modelName = JINA_EMBEDDING_MODEL;
  } else {
    const client = new OpenAI({ apiKey });
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No embedding received from OpenAI");
    }

    rawEmbedding = response.data[0].embedding;
    modelName = EMBEDDING_MODEL;
  }

  const embedding = normalizeVector(rawEmbedding);
  console.log(
    "[embeddings] Generated embedding for",
    entityType,
    entityId,
    "using",
    provider
  );

  const { error: upsertError } = await embeddingsRepo.upsertEmbedding(sb, {
    entity_type: entityType,
    entity_id: entityId,
    user_id: userId,
    model: modelName,
    semantic_vector_ev2: embedding,
    version: CURRENT_EMBEDDING_VERSION,
    updated_at: new Date().toISOString(),
  });

  if (upsertError) {
    throw new Error(`Database error: ${upsertError.message}`);
  }

  console.log(
    `[embeddings] Upserted embedding for ${entityType} ID: ${entityId}`
  );
}
