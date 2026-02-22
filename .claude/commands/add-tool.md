# /add-tool

Add a new Mastra tool to the agent's tool registry.

## Usage
/add-tool <tool-name> "<description>"

Examples:
- /add-tool summarize-document "Summarizes a document by ID"
- /add-tool list-documents "Lists all indexed documents with metadata"

## What this skill does

1. Reads `src/agent/tools/search-documents.ts` as the reference pattern
2. Reads `src/agent/tools/base.ts` for the ToolRegistryDeps interface
3. Reads `src/agent/tools/index.ts` to see the current registry
4. Generates `src/agent/tools/<tool-name>.ts` with:
   - JSDoc comment explaining the tool's purpose
   - `inputSchema` with typed Zod fields
   - `outputSchema`
   - `execute` with the requested logic
   - `deps: ToolRegistryDeps` parameter ONLY if the tool needs embedder/retriever/reranker
5. Adds one line in `createToolRegistry()` in `tools/index.ts`
6. Runs `npx tsc --noEmit` to verify no type errors
7. Shows the diff

## Instructions for Claude

When this skill is invoked:

1. Parse the tool name (kebab-case) and description from the arguments.
   - Tool name becomes the filename: `<tool-name>.ts`
   - The exported function name: `create<PascalCase>Tool`
   - The registry key: `<camelCase>` (matches the function name without "create" and "Tool")

2. Read these files before generating:
   - `src/agent/tools/search-documents.ts` — pattern reference
   - `src/agent/tools/base.ts` — ToolRegistryDeps definition
   - `src/agent/tools/index.ts` — current registry

3. Decide if the tool needs RAG deps (embedder/retriever/reranker):
   - YES if the tool searches or processes documents from the knowledge base
   - NO if it's a utility, external API call, or doesn't touch the vector DB

4. Generate `src/agent/tools/<tool-name>.ts` following this template:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
// import { ragConfig } from "../../config/rag.config.js";  // if needed
// import type { ToolRegistryDeps } from "./base.js";       // if needs RAG deps

/**
 * <Description of what this tool does and when the agent should use it>
 */
export function create<PascalCase>Tool(/* deps?: ToolRegistryDeps */) {
  return createTool({
    id: "<tool-name>",
    description: `<Clear description for the agent.
Include WHEN to call this tool and what it returns.>`,
    inputSchema: z.object({
      // typed fields with .describe() for each
    }),
    outputSchema: z.object({
      // typed return shape
    }),
    execute: async ({ /* destructured input */ }) => {
      // implementation
    },
  });
}
```

5. Add one line to `createToolRegistry()` in `tools/index.ts`:

```typescript
import { create<PascalCase>Tool } from "./<tool-name>.js";
// ...
export function createToolRegistry(deps: ToolRegistryDeps) {
  return {
    searchDocuments: createSearchDocumentsTool(deps),
    searchWeb: createSearchWebTool(),
    <camelCase>: create<PascalCase>Tool(/* deps if needed */),
  };
}
```

6. Run `npx tsc --noEmit` from the worktree root to check types.

7. Show the user the created file and the diff to `tools/index.ts`.

## Rules
- Never touch existing tool files (Open/Closed principle)
- Use `z.string().describe("...")` on every input field
- Always export the factory function, never the tool instance directly
- Follow the naming convention: filename kebab-case, function PascalCase, registry key camelCase
