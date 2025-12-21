/**
 * Prompt prepended to venture/idea data before embedding
 * to help move the semantic vectors fairly into the semantic region populated by e.g.
 * venture ideas, business plans etc. This is to prevent that two descriptions map to a high similarity
 * simply because both framed it similarly as an idea while another merely outlined a technology.
 */
export const VENTURE_EMBEDDING_PROMPT =
  "Here is a detailed description of a venture or project idea I am currently working on, or intend to work on soon: ";
