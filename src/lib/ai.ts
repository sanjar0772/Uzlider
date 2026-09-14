import Anthropic from "@anthropic-ai/sdk";
import { EQUIPMENT_TYPES } from "@/lib/constants";

// ---------------------------------------------------------------------------
// AI document intake. Reads a rate confirmation (or BOL / POD / invoice) image
// or PDF and returns structured load fields the dispatcher can review before a
// load is created. Uses Claude vision + a strict tool schema so the model must
// return every field (nulling out anything it can't find) — no free-form JSON
// parsing, no hallucinated keys.
//
// Model is configurable via LOAD_EXTRACT_MODEL (default: claude-sonnet-5, which
// is plenty capable for structured document reading at a fraction of Opus cost).
// ---------------------------------------------------------------------------

const MODEL = process.env.LOAD_EXTRACT_MODEL || "claude-sonnet-5";

export type ExtractedLoad = {
  documentType: "RATE_CON" | "BOL" | "POD" | "INVOICE" | "OTHER" | null;
  confidence: "high" | "medium" | "low" | null;
  refNumber: string | null;
  broker: string | null;
  origin: string | null;
  destination: string | null;
  pickupDate: string | null; // YYYY-MM-DD
  deliveryDate: string | null; // YYYY-MM-DD
  rate: number | null;
  miles: number | null;
  weight: number | null; // lbs
  commodity: string | null;
  equipment: (typeof EQUIPMENT_TYPES)[number] | null;
  detention: number | null;
  lumperFee: number | null;
  notes: string | null;
};

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Split a `data:<mime>;base64,<data>` URL into its parts.
function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
  if (!m) return null;
  return { mediaType: m[1], data: m[2] };
}

const SAVE_LOAD_TOOL = {
  name: "save_load",
  description:
    "Record the freight load details extracted from the document. Set a field to null when the document does not clearly state it — never guess or invent values, especially the rate and reference number.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      documentType: {
        type: ["string", "null"],
        enum: ["RATE_CON", "BOL", "POD", "INVOICE", "OTHER", null],
        description: "What kind of document this is.",
      },
      confidence: {
        type: ["string", "null"],
        enum: ["high", "medium", "low", null],
        description: "Overall confidence in the extracted values.",
      },
      refNumber: {
        type: ["string", "null"],
        description: "Load / order / pro / reference number the broker assigned.",
      },
      broker: {
        type: ["string", "null"],
        description: "Broker or customer company name.",
      },
      origin: {
        type: ["string", "null"],
        description: "Pickup location, formatted 'City, ST'.",
      },
      destination: {
        type: ["string", "null"],
        description: "Delivery location, formatted 'City, ST'.",
      },
      pickupDate: { type: ["string", "null"], description: "Pickup date as YYYY-MM-DD." },
      deliveryDate: { type: ["string", "null"], description: "Delivery date as YYYY-MM-DD." },
      rate: {
        type: ["number", "null"],
        description: "Total line-haul rate paid to the carrier, in US dollars (number only).",
      },
      miles: { type: ["number", "null"], description: "Loaded miles." },
      weight: { type: ["number", "null"], description: "Weight in pounds." },
      commodity: { type: ["string", "null"], description: "Commodity / freight description." },
      equipment: {
        type: ["string", "null"],
        enum: [...EQUIPMENT_TYPES, null],
        description: "Trailer type required.",
      },
      detention: { type: ["number", "null"], description: "Detention charge in USD, if listed." },
      lumperFee: { type: ["number", "null"], description: "Lumper fee in USD, if listed." },
      notes: {
        type: ["string", "null"],
        description: "Special instructions (appointment times, references, requirements).",
      },
    },
    required: [
      "documentType", "confidence", "refNumber", "broker", "origin", "destination",
      "pickupDate", "deliveryDate", "rate", "miles", "weight", "commodity",
      "equipment", "detention", "lumperFee", "notes",
    ],
  },
} as const;

const PROMPT =
  "You are a freight dispatcher's assistant. Read this trucking document (usually a " +
  "rate confirmation) and extract the load details by calling the save_load tool. " +
  "The rate is the amount paid to the carrier — not any broker margin. Format cities " +
  "as 'City, ST'. Convert dates to YYYY-MM-DD. If a value is not clearly present, set " +
  "it to null rather than guessing.";

// Run extraction. Throws on a hard failure (bad input, API error) so the caller
// can decide how to surface it; returns the structured result on success.
export async function extractLoadFromDocument(
  dataUrl: string,
  mimeType: string
): Promise<ExtractedLoad> {
  if (!aiConfigured()) throw new Error("AI_NOT_CONFIGURED");

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) throw new Error("INVALID_DATA_URL");

  const client = new Anthropic();

  const isPdf = mimeType === "application/pdf" || parsed.mediaType === "application/pdf";
  const fileBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: parsed.data },
      }
    : {
        type: "image",
        source: {
          type: "base64",
          // Claude vision accepts jpeg/png/gif/webp.
          media_type: parsed.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: parsed.data,
        },
      };

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    // Mechanical extraction — no reasoning needed, keeps latency and cost down.
    thinking: { type: "disabled" },
    tools: [SAVE_LOAD_TOOL as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: "save_load" },
    messages: [{ role: "user", content: [fileBlock, { type: "text", text: PROMPT }] }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("NO_EXTRACTION");

  const raw = block.input as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const equipment =
    typeof raw.equipment === "string" &&
    (EQUIPMENT_TYPES as readonly string[]).includes(raw.equipment)
      ? (raw.equipment as ExtractedLoad["equipment"])
      : null;

  return {
    documentType: (str(raw.documentType) as ExtractedLoad["documentType"]) ?? null,
    confidence: (str(raw.confidence) as ExtractedLoad["confidence"]) ?? null,
    refNumber: str(raw.refNumber),
    broker: str(raw.broker),
    origin: str(raw.origin),
    destination: str(raw.destination),
    pickupDate: str(raw.pickupDate),
    deliveryDate: str(raw.deliveryDate),
    rate: num(raw.rate),
    miles: num(raw.miles),
    weight: num(raw.weight),
    commodity: str(raw.commodity),
    equipment,
    detention: num(raw.detention),
    lumperFee: num(raw.lumperFee),
    notes: str(raw.notes),
  };
}
