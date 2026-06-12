import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const InputSchema = z.object({
  ingredientes: z.array(z.string().min(1).max(40)).min(1).max(30),
  excluir: z.array(z.string()).max(50).optional(),
});

const RecetaIA = z.object({
  nombre: z.string(),
  emoji: z.string(),
  tiempoMin: z.number().int().positive(),
  dificultad: z.enum(["Fácil", "Media", "Difícil"]),
  porciones: z.number().int().positive(),
  ingredientes: z.array(z.string()).min(2),
  pasos: z.array(z.string()).min(2),
});

const OutputSchema = z.object({
  recetas: z.array(RecetaIA).max(6),
});

export const sugerirRecetasIA = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Falta LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const excluir = (data.excluir ?? []).join(", ");
    const prompt = `Eres un chef. Sugiere hasta 5 recetas en español que se puedan cocinar usando principalmente estos ingredientes que el usuario tiene en casa: ${data.ingredientes.join(", ")}.
Reglas:
- Cada receta debe usar al menos 2 de los ingredientes disponibles.
- Puedes asumir condimentos básicos (sal, pimienta, aceite, agua).
- Pasos claros y concisos (3-6 pasos).
- Elige un emoji representativo (un solo carácter emoji).
- No repitas estas recetas: ${excluir || "ninguna"}.
- Devuelve solo JSON válido según el schema.`;

    try {
      const { experimental_output } = await generateText({
        model,
        prompt,
        experimental_output: Output.object({ schema: OutputSchema }),
      });
      return { recetas: experimental_output.recetas };
    } catch (err) {
      console.error("[sugerirRecetasIA] error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("RATE_LIMIT");
      if (msg.includes("402")) throw new Error("CREDITS");
      throw new Error(`IA_ERROR: ${msg.slice(0, 300)}`);
    }
  });
