/**
 * Embedding version tracking
 *
 * Maintains the current version of the embedding system.
 * Increment the version whenever changes are made to:
 * This allows us to track which embeddings need regeneration are compatible,
 * enables version-specific queries, richer provenance.
 * X.Y -> X requires db changes, such as a new column (new dimensionality, nex db index)
 * Re-create all indexes in that case. Y is for changes such as prompt engineering etc. that impact similarity
 * scores but does not require db operations.
 */

/**
 * Current embedding version
 */
export const CURRENT_EMBEDDING_VERSION = "embedding-version-2.0";

/**
 * Embedding Version Changelog
 *
 * embedding-version-2.0 (2025-12-16):
 * - Prepended context prompt to help semantic positioning
 * - Switched from openai text-embedding-3-large to jina's jina-embeddings-v3
 * - Needs a new embedding table due to new dimensionality
 * - Updated similarity thresholds as result of experiments
 *
 * embedding-version-1.0 (initial):
 * - Initial embedding implementation
 * - openai text-embedding-3-large
 */
