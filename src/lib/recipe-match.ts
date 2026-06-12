export type Recipe = {
  id: string;
  nombre: string;
  emoji: string;
  gradiente: string; // tailwind classes for image placeholder
  tiempoMin: number;
  dificultad: "Fácil" | "Media" | "Difícil";
  porciones: number;
  ingredientes: string[];
  pasos: string[];
  ia?: boolean;
};

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/s$/, ""); // singular básico
}

export function tokensIngrediente(ing: string): string[] {
  return normalizar(ing)
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

export type MatchResult = {
  receta: Recipe;
  tiene: string[];
  faltan: string[];
  score: number;
};

export function emparejar(recetas: Recipe[], disponibles: string[]): MatchResult[] {
  const setUsuario = disponibles.map(normalizar).filter(Boolean);
  if (setUsuario.length === 0) return [];

  const resultados: MatchResult[] = [];
  for (const receta of recetas) {
    const tiene: string[] = [];
    const faltan: string[] = [];
    for (const ing of receta.ingredientes) {
      const toks = tokensIngrediente(ing);
      const hit = toks.some((t) => setUsuario.some((u) => u.includes(t) || t.includes(u)));
      if (hit) tiene.push(ing);
      else faltan.push(ing);
    }
    if (tiene.length === 0) continue;
    const score = tiene.length / receta.ingredientes.length - faltan.length * 0.05;
    resultados.push({ receta, tiene, faltan, score });
  }
  return resultados.sort((a, b) => b.score - a.score);
}
