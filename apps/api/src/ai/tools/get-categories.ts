import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@midpoker/db/client";
import { getCategories } from "@midpoker/db/queries";
import { getAppUrl } from "@midpoker/utils/envs";
import { tool } from "ai";
import { z } from "zod";

const getCategoriesSchema = z.object({
  includeChildren: z
    .boolean()
    .optional()
    .describe("Include subcategories in the response (default: true)"),
});

export const getCategoriesTool = tool({
  description: `Get all transaction categories available for the team.

Use this tool to:
- List all available categories before creating/updating transactions
- Find the correct category slug for a transaction
- Show users what categories they can use

Categories are hierarchical - parent categories can have children (subcategories).`,
  inputSchema: getCategoriesSchema,
  execute: async function* ({ includeChildren = true }, executionOptions) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;

    if (!teamId) {
      yield {
        text: "Unable to retrieve categories: Team ID not found in context.",
      };
      return;
    }

    try {
      const categories = await getCategories(db, { teamId });

      if (categories.length === 0) {
        yield {
          text: "No categories found. You can create categories in the settings.",
          link: {
            text: "Manage categories",
            url: `${getAppUrl()}/settings/categories`,
          },
        };
        return;
      }

      // Build formatted response
      let response = "## Available Transaction Categories\n\n";
      response += "| Category | Slug | Type |\n";
      response += "|----------|------|------|\n";

      for (const category of categories) {
        const type = category.system ? "System" : "Custom";
        response += `| **${category.name}** | \`${category.slug}\` | ${type} |\n`;

        // Add children if requested
        if (includeChildren && category.children?.length > 0) {
          for (const child of category.children) {
            response += `| \u00A0\u00A0\u2514\u2500 ${child.name} | \`${child.slug}\` | ${child.system ? "System" : "Custom"} |\n`;
          }
        }
      }

      const totalCount =
        categories.length +
        categories.reduce((acc, cat) => acc + (cat.children?.length || 0), 0);

      response += `\n**${totalCount} categories total**`;

      yield {
        text: response,
        link: {
          text: "Manage categories",
          url: `${getAppUrl()}/settings/categories`,
        },
      };
    } catch (error) {
      yield {
        text: `Failed to retrieve categories: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
