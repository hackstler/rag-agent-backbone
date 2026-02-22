import type { IEmbedder, IRetriever, IReranker } from "../../rag/interfaces.js";

/**
 * Dependencies injected into RAG-aware tools.
 *
 * Pattern for adding a new tool:
 * 1. Create `src/agent/tools/my-tool.ts`
 * 2. Export `createMyTool(deps?: ToolRegistryDeps)` — use deps only if the tool needs RAG
 * 3. Add one line in `tools/index.ts`: `myTool: createMyTool(deps)`
 *
 * Changing the embedding/retrieval provider only requires updating adapters.ts.
 * No tool file needs to change.
 */
export interface ToolRegistryDeps {
  embedder: IEmbedder;
  retriever: IRetriever;
  reranker: IReranker;
}
