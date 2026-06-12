import { createFileRoute, Link } from "@tanstack/react-router";

import { recetas } from "@/data/recipes";

export const Route = createFileRoute("/comidas-baratas")({
  head: () => ({
    meta: [
      { title: "Comidas rápidas y baratas — Recetas con pocos ingredientes" },
      {
        name: "description",
        content:
          "Recetas rápidas y baratas con 5 ingredientes o menos. Cocina en poco tiempo gastando poco dinero con lo que ya tienes en casa.",
      },
      { property: "og:title", content: "Comidas rápidas y baratas — Recetas con pocos ingredientes" },
      {
        property: "og:description",
        content:
          "Recetas rápidas y baratas con 5 ingredientes o menos para cocinar sin complicaciones.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://comidaclara.lovable.app/comidas-baratas" },
    ],
    links: [
      { rel: "canonical", href: "https://comidaclara.lovable.app/comidas-baratas" },
    ],
  }),
  component: ComidasBaratas,
});

function ComidasBaratas() {
  const baratas = recetas
    .filter((r) => r.ingredientes.length <= 5)
    .sort((a, b) => a.tiempoMin - b.tiempoMin);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-rose-50">
      <main className="mx-auto max-w-xl px-4 pb-24 pt-8">
        <div className="mb-4">
          <Link to="/" className="text-sm text-orange-700 underline">
            ‹ Inicio
          </Link>
        </div>
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-stone-800">
            Comidas rápidas y baratas
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Recetas con 5 ingredientes o menos, pensadas para cocinar rápido y gastando poco.
            Perfectas cuando solo tienes unos básicos de despensa en casa.
          </p>
        </header>

        <ul className="space-y-3">
          {baratas.map((r) => (
            <li key={r.id}>
              <Link
                to="/receta/$id"
                params={{ id: r.id }}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/60 transition hover:ring-orange-300"
              >
                <div
                  className={`flex h-20 w-20 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${r.gradiente} text-4xl shadow-inner`}
                >
                  {r.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold text-stone-800">{r.nombre}</h2>
                  <p className="mt-0.5 text-xs text-stone-500">
                    ⏱ {r.tiempoMin} min · {r.dificultad} · {r.ingredientes.length} ingredientes
                  </p>
                  <p className="mt-1 truncate text-xs text-stone-600">
                    {r.ingredientes.join(", ")}
                  </p>
                </div>
                <span className="text-stone-400">›</span>
              </Link>
            </li>
          ))}
        </ul>

        {baratas.length === 0 && (
          <p className="text-center text-sm text-stone-500">
            Pronto añadiremos más recetas baratas y rápidas.
          </p>
        )}
      </main>
    </div>
  );
}
