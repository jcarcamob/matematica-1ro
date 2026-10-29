# Cómo contribuir

¡Gracias por querer mejorar el juego! Toda ayuda sirve: ideas de ejercicios, correcciones, accesibilidad o reportes de errores.

## Reportar un problema

Abre un *issue* e incluye:

- Qué pasó y qué esperabas que pasara.
- El mundo y la pregunta (si puedes, una captura de pantalla).
- El navegador y el dispositivo.

## Proponer cambios

1. Haz un *fork* y crea una rama: `git checkout -b mejora/nombre-corto`.
2. Haz tus cambios (la lógica está en `app.js` y los estilos en `styles.css`).
3. Pruébalo con `python3 -m http.server 8000` en `http://localhost:8000`, en pantalla de computador y de celular, en modo claro y oscuro, y sin conexión (DevTools › Network › Offline).
4. Si agregas un archivo nuevo, súmalo a la lista `SHELL` de `sw.js` y sube `VERSION` (por ejemplo `v1` → `v2`) para que los dispositivos instalados lo descarguen.
5. Abre un *pull request* explicando qué cambiaste y por qué.

## Agregar un tipo de pregunta

Cada mundo en `WORLDS` tiene un objeto `gens`. Cada generador es una función que retorna:

```js
{
  tag: "Nombre corto",         // etiqueta visible
  prompt: "Texto de la pregunta",
  speak: "Texto para la voz",  // opcional; si falta se lee prompt
  visual: "<svg>…</svg>",      // HTML/SVG generado con Draw
  kind: "num" | "choice" | "build",
  options: [...],              // solo para "choice"
  answer: 42,                  // respuesta correcta
  hint: "Pista tras el primer error",
  explain: "Explicación tras el segundo error"
}
```

Antes de enviar tu cambio, verifica en la consola del navegador que tu generador siempre produce una respuesta válida:

```js
const g = window.__test.WORLDS.find(w => w.id === "num").gens.miGenerador;
for (let i = 0; i < 500; i++) {
  const q = g();
  if (q.kind === "choice" && !q.options.some(o => String(o.v ?? o) === String(q.answer))) console.error(q);
}
```

## Criterios

- **Pedagogía:** que el ejercicio corresponda a 1° básico y use las representaciones del texto escolar (decenas y unidades, recta numérica, pictogramas, unidades no estandarizadas).
- **Lenguaje:** frases cortas y simples, en español de Chile.
- **Sin dependencias:** sin frameworks ni paso de compilación. El juego debe seguir funcionando sin conexión.
- **CSP:** no agregues scripts en línea (`<script>…</script>` u `onclick="…"`) ni orígenes externos. La CSP de `index.html` los bloquea a propósito.
- **Privacidad:** no agregar analítica, cookies, servicios externos ni campos que pidan datos del niño.
- **Seguridad:** no insertar texto externo con `innerHTML` sin pasarlo por `esc()`.
- **Derechos de autor:** no copiar imágenes, personajes ni textos de los libros. Los ejercicios deben ser originales.
- **Accesibilidad:** botones grandes, contraste suficiente y `aria-label` en las imágenes que dan información.

## Código de conducta

Trata a todas las personas con respeto. Este es un proyecto pensado para niños.
