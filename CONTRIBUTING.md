# Cómo contribuir

¡Gracias por querer mejorar el juego! Toda ayuda sirve: ideas de ejercicios, correcciones, accesibilidad o reportes de errores.

## Reportar un problema

Abre un *issue* e incluye:

- Qué pasó y qué esperabas que pasara.
- El mundo y la pregunta (si puedes, una captura de pantalla).
- El navegador y el dispositivo.

## Proponer cambios

1. Haz un *fork* y crea una rama: `git checkout -b mejora/nombre-corto`.
2. Haz tus cambios en `index.html`.
3. Pruébalo abriendo el archivo en el navegador, en pantalla de computador y de celular, y en modo claro y oscuro.
4. Abre un *pull request* explicando qué cambiaste y por qué.

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
- **Sin dependencias:** el juego debe seguir siendo un solo archivo que funciona sin conexión.
- **Privacidad:** no agregar analítica, cookies, servicios externos ni campos que pidan datos del niño.
- **Seguridad:** no insertar texto externo con `innerHTML` sin pasarlo por `esc()`.
- **Derechos de autor:** no copiar imágenes, personajes ni textos de los libros. Los ejercicios deben ser originales.
- **Accesibilidad:** botones grandes, contraste suficiente y `aria-label` en las imágenes que dan información.

## Código de conducta

Trata a todas las personas con respeto. Este es un proyecto pensado para niños.
