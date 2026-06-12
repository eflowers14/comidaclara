import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { recetas as recetasLocales } from "@/data/recipes";
import { emparejar, type MatchResult, type Recipe } from "@/lib/recipe-match";
import { sugerirRecetasIA } from "@/lib/recipes.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "¿Qué cocino? — Recetas fáciles con lo que tienes en casa" },
      {
        name: "description",
        content:
          "Escribe los ingredientes que tienes en la nevera y descubre recetas fáciles para cocinar hoy.",
      },
      { property: "og:title", content: "¿Qué cocino? — Recetas fáciles con lo que tienes en casa" },
      {
        property: "og:description",
        content: "Recetas a partir de los ingredientes que ya tienes.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://comidaclara.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://comidaclara.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Comida Clara",
          url: "https://comidaclara.lovable.app/",
          description:
            "Encuentra recetas fáciles a partir de los ingredientes que tienes en casa.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Comida Clara",
          url: "https://comidaclara.lovable.app/",
        }),
      },
    ],
  }),
  component: Home,
});

const SUGERENCIAS = [
  "huevos",
  "pollo",
  "arroz",
  "pasta",
  "tomate",
  "cebolla",
  "ajo",
  "queso",
  "patatas",
  "aguacate",
];

const STORAGE_KEY = "ingredientes_v1";
const CACHE_IA_KEY = "recetas_ia_cache_v1";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function guardarRecetaIA(receta: Recipe) {
  try {
    const raw = sessionStorage.getItem(CACHE_IA_KEY);
    const cache: Record<string, Recipe> = raw ? JSON.parse(raw) : {};
    cache[receta.id] = receta;
    sessionStorage.setItem(CACHE_IA_KEY, JSON.stringify(cache));
  } catch {
    /* noop */
  }
}

function Home() {
  const [ingredientes, setIngredientes] = useState<string[]>([]);
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<MatchResult[] | null>(null);
  const [cargandoIA, setCargandoIA] = useState(false);
  const navigate = useNavigate();
  const llamarIA = useServerFn(sugerirRecetasIA);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setIngredientes(JSON.parse(raw));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ingredientes));
    } catch {
      /* noop */
    }
  }, [ingredientes]);

  const agregar = (raw: string) => {
    const partes = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (partes.length === 0) return;
    setIngredientes((prev) => {
      const set = new Set(prev.map((p) => p.toLowerCase()));
      const nuevos = partes.filter((p) => !set.has(p.toLowerCase()));
      return [...prev, ...nuevos];
    });
    setTexto("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      agregar(texto);
    } else if (e.key === "Backspace" && texto === "" && ingredientes.length > 0) {
      setIngredientes((p) => p.slice(0, -1));
    }
  };

  const eliminar = (i: number) => setIngredientes((p) => p.filter((_, idx) => idx !== i));

  const buscar = async () => {
    if (texto.trim()) agregar(texto);
    const lista = texto.trim()
      ? [...ingredientes, ...texto.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)]
      : ingredientes;
    if (lista.length === 0) {
      toast.error("Añade al menos un ingrediente");
      return;
    }
    const locales = emparejar(recetasLocales, lista);
    setResultados(locales);

    if (locales.length < 6) {
      setCargandoIA(true);
      try {
        const excluir = locales.map((r) => r.receta.nombre);
        const res = await llamarIA({ data: { ingredientes: lista, excluir } });
        const nuevos: MatchResult[] = res.recetas.map((r, i) => {
          const id = `ia-${slugify(r.nombre)}-${i}`;
          const receta: Recipe = {
            id,
            nombre: r.nombre,
            emoji: r.emoji || "🍽️",
            gradiente: "from-orange-200 to-rose-400",
            tiempoMin: r.tiempoMin,
            dificultad: r.dificultad,
            porciones: r.porciones,
            ingredientes: r.ingredientes,
            pasos: r.pasos,
            ia: true,
          };
          guardarRecetaIA(receta);
          const m = emparejar([receta], lista)[0];
          return (
            m ?? {
              receta,
              tiene: receta.ingredientes.slice(0, 1),
              faltan: receta.ingredientes.slice(1),
              score: 0,
            }
          );
        });
        setResultados((prev) => [...(prev ?? []), ...nuevos]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("RATE_LIMIT"))
          toast.error("Demasiadas peticiones a la IA. Prueba en un momento.");
        else if (msg.includes("CREDITS"))
          toast.error("Créditos de IA agotados en el espacio de trabajo.");
        else toast.error("No pude pedir más ideas a la IA");
      } finally {
        setCargandoIA(false);
      }
    }
  };

  const irADetalle = (r: Recipe) => {
    if (r.ia) guardarRecetaIA(r);
    navigate({ to: "/receta/$id", params: { id: r.id } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-amber-50 to-rose-50">
      <main className="mx-auto max-w-xl px-4 pb-24 pt-8">
        <header className="mb-6 text-center">
          <div className="mb-2 text-5xl">🍳</div>
          <h1 className="text-3xl font-bold tracking-tight text-stone-800">
            ¿Qué cocino? — Recetas fáciles con lo que tienes en casa
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Dime qué tienes y te digo qué cocinar
          </p>
        </header>

        <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200/60">
          <label htmlFor="ingredientes-input" className="mb-2 block text-sm font-medium text-stone-700">
            Tus ingredientes
          </label>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-2 focus-within:border-orange-400">
            {ingredientes.map((ing, i) => (
              <span
                key={`${ing}-${i}`}
                className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm text-orange-900"
              >
                {ing}
                <button
                  type="button"
                  onClick={() => eliminar(i)}
                  className="text-orange-700 hover:text-orange-900"
                  aria-label={`Quitar ${ing}`}
                >
                  ×
                </button>
              </span>
            ))}
            <Input
              id="ingredientes-input"
              aria-label="Añadir ingredientes"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={onKey}
              placeholder={ingredientes.length === 0 ? "huevos, pasta, tomate…" : "añadir más…"}
              className="h-8 flex-1 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="mt-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-stone-500">Rápido</p>
            <div className="flex flex-wrap gap-2">
              {SUGERENCIAS.filter(
                (s) => !ingredientes.map((i) => i.toLowerCase()).includes(s),
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => agregar(s)}
                  className="rounded-full border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 transition hover:border-orange-300 hover:bg-orange-50"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={buscar}
            className="mt-4 h-12 w-full rounded-2xl bg-orange-500 text-base font-semibold text-white hover:bg-orange-600"
          >
            Buscar recetas
          </Button>
        </section>

        {resultados !== null && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold text-stone-800">
              {resultados.length > 0
                ? `${resultados.length} ${resultados.length === 1 ? "receta" : "recetas"} para ti`
                : "Sin coincidencias"}
            </h2>

            {resultados.length === 0 && !cargandoIA && (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-6 text-center text-sm text-stone-600">
                Prueba añadiendo ingredientes más comunes como huevos, arroz, pasta o pollo.
              </div>
            )}

            <ul className="space-y-3">
              {resultados.map(({ receta, tiene, faltan }) => (
                <li key={receta.id}>
                  <button
                    onClick={() => irADetalle(receta)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200/60 transition hover:ring-orange-300"
                  >
                    <div
                      className={`flex h-20 w-20 flex-none items-center justify-center rounded-xl bg-gradient-to-br ${receta.gradiente} text-4xl shadow-inner`}
                    >
                      {receta.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-semibold text-stone-800">{receta.nombre}</h3>
                        {receta.ia && (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                            IA
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        ⏱ {receta.tiempoMin} min · {receta.dificultad}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        <span className="text-emerald-700">Tienes {tiene.length}</span>
                        {faltan.length > 0 && (
                          <span className="text-stone-500"> · te faltan {faltan.length}</span>
                        )}
                      </p>
                    </div>
                    <span className="text-stone-400">›</span>
                  </button>
                </li>
              ))}
              {cargandoIA && (
                <>
                  <li>
                    <Skeleton className="h-24 rounded-2xl" />
                  </li>
                  <li>
                    <Skeleton className="h-24 rounded-2xl" />
                  </li>
                </>
              )}
            </ul>
            {cargandoIA && (
              <p className="mt-3 text-center text-xs text-stone-500">
                Pidiendo más ideas a la IA…
              </p>
            )}
          </section>
        )}

        <footer className="mt-12 text-center text-xs text-stone-400">
          Hecho con 🧡 ·{" "}
          <Link to="/" className="underline">
            Inicio
          </Link>
        </footer>
      </main>
    </div>
  );
}
