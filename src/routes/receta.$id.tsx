import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { recetas as recetasLocales } from "@/data/recipes";
import { normalizar, type Recipe } from "@/lib/recipe-match";

export const Route = createFileRoute("/receta/$id")({
  component: DetalleReceta,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-orange-50 p-6 text-center">
      <div>
        <p className="text-lg text-stone-700">No encontramos esa receta.</p>
        <Link to="/" className="mt-4 inline-block text-orange-600 underline">
          Volver
        </Link>
      </div>
    </div>
  ),
});

const CACHE_IA_KEY = "recetas_ia_cache_v1";
const STORAGE_KEY = "ingredientes_v1";

function DetalleReceta() {
  const { id } = Route.useParams();
  const router = useRouter();
  const [receta, setReceta] = useState<Recipe | null>(null);
  const [misIng, setMisIng] = useState<string[]>([]);

  useEffect(() => {
    const local = recetasLocales.find((r) => r.id === id);
    if (local) {
      setReceta(local);
    } else {
      try {
        const raw = sessionStorage.getItem(CACHE_IA_KEY);
        const cache: Record<string, Recipe> = raw ? JSON.parse(raw) : {};
        setReceta(cache[id] ?? null);
      } catch {
        setReceta(null);
      }
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMisIng(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, [id]);

  if (!receta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-orange-50 p-6 text-center">
        <div>
          <p className="text-lg text-stone-700">No encontramos esa receta.</p>
          <button
            onClick={() => router.navigate({ to: "/" })}
            className="mt-4 text-orange-600 underline"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const setUsuario = misIng.map(normalizar).filter(Boolean);
  const ingredientesConEstado = receta.ingredientes.map((ing) => {
    const toks = normalizar(ing)
      .split(/\s+/)
      .filter((t) => t.length > 2);
    const tiene = toks.some((t) => setUsuario.some((u) => u.includes(t) || t.includes(u)));
    return { ing, tiene };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-rose-50">
      <main className="mx-auto max-w-xl pb-16">
        <div className="px-4 pt-4">
          <button
            onClick={() => router.history.back()}
            className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-sm text-stone-700 shadow-sm backdrop-blur hover:bg-white"
          >
            ‹ Volver
          </button>
        </div>

        <div
          className={`mx-4 mt-4 flex h-56 items-center justify-center rounded-3xl bg-gradient-to-br ${receta.gradiente} text-8xl shadow-inner`}
        >
          {receta.emoji}
        </div>

        <header className="px-5 pt-5">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-stone-800">{receta.nombre}</h1>
            {receta.ia && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                IA
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-stone-600">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200">
              ⏱ {receta.tiempoMin} min
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200">
              📊 {receta.dificultad}
            </span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-stone-200">
              👥 {receta.porciones}
            </span>
          </div>
        </header>

        <section className="mx-4 mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/60">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Ingredientes
          </h2>
          <ul className="space-y-2">
            {ingredientesConEstado.map(({ ing, tiene }) => (
              <li
                key={ing}
                className={`flex items-center gap-2 text-sm ${tiene ? "text-stone-800" : "text-stone-500"}`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
                    tiene ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {tiene ? "✓" : "•"}
                </span>
                {ing}
                {!tiene && (
                  <span className="text-[10px] uppercase tracking-wide text-stone-400">
                    falta
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mx-4 mt-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200/60">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Preparación
          </h2>
          <ol className="space-y-3">
            {receta.pasos.map((paso, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-orange-500 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed text-stone-700">{paso}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
