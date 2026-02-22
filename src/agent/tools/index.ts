import { createSearchDocumentsTool } from "./search-documents.js";
import { createSearchWebTool } from "./search-web.js";
import type { ToolRegistryDeps } from "./base.js";

export type { ToolRegistryDeps };

/**
 * Central tool registry.
 *
 * To add a tool:
 * 1. Create `src/agent/tools/my-tool.ts` with `createMyTool(deps?)`
 * 2. Add one line here: `myTool: createMyTool(deps)`
 *
 * The registry object keys become the tool names the agent uses.
 */
export function createToolRegistry(deps: ToolRegistryDeps) {
  return {
    searchDocuments: createSearchDocumentsTool(deps),
    searchWeb: createSearchWebTool(),
    // Add new tools here ↓
  };
}
