# Plan: App de Recetas "¿Qué cocino?"

App web mobile-first en español. El usuario ingresa los ingredientes que tiene en casa y recibe recetas posibles, con pasos, tiempo e imagen del plato. Enfoque híbrido: primero se buscan coincidencias en una base curada de recetas locales (instantáneo, sin coste)

## Diseño y UX

- Mobile-first, una columna, optimizado para uso con una mano.
- Pantalla principal (`/`):
  - Encabezado breve con el nombre de la app.
  - Input de ingredientes tipo "chip": el usuario escribe → Enter o coma agrega un chip. Cada chip se puede eliminar.
  - Atajos rápidos: botones de ingredientes comunes (huevo, arroz, pollo, tomate, cebolla, ajo, pasta, queso...) para añadir con un toque.
  - Botón principal "Buscar recetas".
  - Lista de tarjetas de recetas resultantes con: imagen, nombre y tiempo (min).
- Pantalla de detalle (`/receta/$id` para locales, `/receta/ia/$slug` para generadas en sesión):
  - Imagen grande, título, tiempo, porciones.
  - Lista de ingredientes (marcando los que el usuario tiene vs los que faltan).
  - Pasos numerados de preparación.
  - Botón "Volver".
- Estado vacío y de carga claros (skeleton en tarjetas mientras responde).
- Sin login, sin persistencia entre sesiones (todo en memoria/React state). Los ingredientes ingresados se guardan en `localStorage` para no perderlos al recargar.

## Dirección visual

Se solicitarán 3 direcciones de diseño con `design--create_directions` antes de implementar la UI, manteniendo: español, mobile-first, cálido y apetitoso (no clínico). El usuario elegirá una.

## Fuente de datos

1. **Base local curada**: archivo `src/data/recipes.ts` con ~25–35 recetas en español (variadas: tortilla, pasta al ajo, arroz con pollo, ensaladas, sopas, postres simples, etc.). Cada receta incluye id, nombre, imagen (URL Unsplash o similar), tiempoMin, porciones, ingredientes (con nombre normalizado), pasos.
2. **Matching local**: función que normaliza ingredientes del usuario (minúsculas, sin tildes, singular básico) y puntúa cada receta por nº de coincidencias / nº de ingredientes faltantes. Se devuelven las que tengan al menos 1 coincidencia, ordenadas por mejor match.
3. Si no hay coincidencias se muestra una alerta que sugiera añadir más ingredientes

## Arquitectura técnica

- Stack: TanStack Start ya configurado.
- Rutas nuevas:
  - `src/routes/index.tsx`: reemplaza el placeholder, contiene el formulario y la lista de resultados.
  - `src/routes/receta.$id.tsx`: detalle de receta (lee de data local o del cache de sesión).
- Server function: `src/lib/recipes.functions.ts` con `suggestRecipesAI({ ingredients, excludeNames })` → devuelve `Array<{ nombre, tiempoMin, dificultad, porciones, ingredientes[], pasos[], imagenPrompt }>`. Usa `generateText` con `Output.object` + schema Zod corto. La imagen se resuelve con una URL placeholder temática (no se genera imagen IA en MVP para mantener coste/latencia bajos).
- Helper de matching: `src/lib/recipe-match.ts` (puro, testeable).
- Datos: `src/data/recipes.ts`.
- Cache de resultados IA en memoria (Zustand no necesario; basta con `useState` en la página y un `Map` por sesión guardado en `sessionStorage` para que el detalle pueda leerlos).
- Errores del gateway (429/402) se muestran como toast claro y se conservan los resultados locales.

## Metadatos SEO

`<title>` y descripción de la home en español enfocados en "qué cocinar con los ingredientes que tengo".

## Fuera de alcance (MVP)

- Login, favoritos, historial persistente.
- Filtros (vegetariano, sin gluten, calorías). Se pueden añadir luego.
- App nativa real (esto es una webapp mobile-first instalable, no React Native).
- Generación de imágenes con IA por receta.

## Próximos pasos

1. Generar 3 direcciones de diseño y que elijas una.
2. Implementar datos locales + matcher + UI.
3. Conectar Lovable AI para completar resultados.