import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { CatalogService } from "../services/catalog.service.js";

export interface ListCatalogDeps {
  catalogService: CatalogService;
}

export function createListCatalogTool({ catalogService }: ListCatalogDeps) {
  return createTool({
    id: "listCatalog",
    description: `List all available products in the organization's active catalog.
Call this FIRST before generating any quote, so you know the exact product names, codes, prices and units.
Returns all active catalog items with their details.`,

    inputSchema: z.object({}),

    outputSchema: z.object({
      success: z.boolean(),
      catalogName: z.string(),
      items: z.array(z.object({
        code: z.number(),
        name: z.string(),
        description: z.string().nullable(),
        pricePerUnit: z.number(),
        unit: z.string(),
      })),
      error: z.string().optional(),
    }),

    execute: async (_input, context) => {
      const orgId = context?.requestContext?.get("orgId") as string | undefined;
      if (!orgId) {
        return {
          success: false,
          catalogName: "",
          items: [],
          error: "Missing orgId in request context",
        };
      }

      const catalogId = await catalogService.getActiveCatalogId(orgId);
      if (!catalogId) {
        return {
          success: false,
          catalogName: "",
          items: [],
          error: "No active catalog found for this organization",
        };
      }

      const items = await catalogService.getAllItems(catalogId);

      return {
        success: true,
        catalogName: orgId,
        items: items.map((i) => ({
          code: i.code,
          name: i.name,
          description: i.description,
          pricePerUnit: i.pricePerUnit,
          unit: i.unit,
        })),
      };
    },
  });
}
