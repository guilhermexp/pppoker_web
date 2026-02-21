import type { AppContext } from "@api/ai/agents/config/shared";
import { db } from "@midpoker/db/client";
import { upsertCustomer } from "@midpoker/db/queries";
import { getAppUrl } from "@midpoker/utils/envs";
import { tool } from "ai";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(1).describe("Customer or company name"),
  email: z.string().email().describe("Primary email address"),
  billingEmail: z
    .string()
    .email()
    .optional()
    .describe("Billing email (if different from primary)"),
  phone: z.string().optional().describe("Phone number"),
  website: z.string().url().optional().describe("Website URL"),
  contact: z
    .string()
    .optional()
    .describe("Contact person name within the company"),
  country: z.string().optional().describe("Country name"),
  countryCode: z
    .string()
    .length(2)
    .optional()
    .describe("Country code (ISO 3166-1 alpha-2, e.g., 'US', 'BR')"),
  addressLine1: z.string().optional().describe("Street address line 1"),
  addressLine2: z.string().optional().describe("Street address line 2"),
  city: z.string().optional().describe("City"),
  state: z.string().optional().describe("State or province"),
  zip: z.string().optional().describe("ZIP or postal code"),
  vatNumber: z.string().optional().describe("VAT number for tax purposes"),
  note: z.string().optional().describe("Internal notes about the customer"),
});

export const createCustomerTool = tool({
  description: `Create a new customer in the system.

Use this tool to:
- Register a new client or company
- Add customer details for invoicing
- Store contact information

Required fields: name and email.
Optional: billing email, phone, address, VAT number, notes.`,
  inputSchema: createCustomerSchema,
  execute: async function* (
    {
      name,
      email,
      billingEmail,
      phone,
      website,
      contact,
      country,
      countryCode,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      vatNumber,
      note,
    },
    executionOptions,
  ) {
    const appContext = executionOptions.experimental_context as AppContext;
    const teamId = appContext.teamId as string;
    const userId = appContext.userId as string;

    if (!teamId) {
      yield {
        text: "Unable to create customer: Team ID not found in context.",
      };
      return;
    }

    try {
      const customer = await upsertCustomer(db, {
        name,
        email,
        billingEmail: billingEmail || null,
        phone: phone || null,
        website: website || null,
        contact: contact || null,
        country: country || null,
        countryCode: countryCode || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        vatNumber: vatNumber || null,
        note: note || null,
        teamId,
        userId,
      });

      if (!customer) {
        yield {
          text: "Failed to create customer. Please try again.",
        };
        return;
      }

      // Build response with customer details
      let response = "Successfully created customer:\n\n";
      response += "| Field | Value |\n";
      response += "|-------|-------|\n";
      response += `| **Name** | ${customer.name} |\n`;
      response += `| **Email** | ${customer.email} |\n`;
      if (customer.billingEmail)
        response += `| **Billing Email** | ${customer.billingEmail} |\n`;
      if (customer.phone) response += `| **Phone** | ${customer.phone} |\n`;
      if (customer.website)
        response += `| **Website** | ${customer.website} |\n`;
      if (customer.contact)
        response += `| **Contact** | ${customer.contact} |\n`;

      // Address
      const addressParts = [
        customer.addressLine1,
        customer.addressLine2,
        customer.city,
        customer.state,
        customer.zip,
        customer.country,
      ].filter(Boolean);

      if (addressParts.length > 0) {
        response += `| **Address** | ${addressParts.join(", ")} |\n`;
      }

      if (customer.vatNumber)
        response += `| **VAT Number** | ${customer.vatNumber} |\n`;

      response += `\n**Customer ID:** \`${customer.id}\``;

      yield {
        text: response,
        link: {
          text: "View customer",
          url: `${getAppUrl()}/customers/${customer.id}`,
        },
      };
    } catch (error) {
      yield {
        text: `Failed to create customer: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
});
