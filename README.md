# Matemática 1° Básico

Juego web para que niños y niñas de **1° básico (Chile)** practiquen matemática jugando. Las preguntas se leen en voz alta y se responden tocando la pantalla, así que sirve aunque el niño todavía esté aprendiendo a leer.

Es una página estática: no necesita servidor propio ni cuenta. También es una **PWA**: se puede instalar como app en celular, tablet o computador y funciona sin internet.

## Contenidos

Los ejercicios siguen los temas y las representaciones del Texto del Estudiante de Matemática 1° Básico (Mineduc, Tomos 1 y 2).

| Mundo | Qué practica | Referencia en el texto |
|---|---|---|
| Números hasta 100 | Bloques de decenas y unidades, cajas de 10, recta numérica, antecesor y sucesor, contar de 2, 5 y 10, comparar | Tomo 1, Cap. 7 |
| Componer y descomponer | Tabla de decenas y unidades, "10 y 3 son…", partes de un número, armar números con bloques | Tomo 1, Cap. 2 y 7 |
| Resolver problemas | Juntar, agregar, quitar, comparar y formar 10, hasta 20 | Tomo 1, Cap. 4–5; Tomo 2, Cap. 10–12 |
| Medir | Unidades no estandarizadas: clips, gomas, cubos, palos de helado y vasos | Tomo 2, Cap. 14 |
| Comparar medidas | Más largo, más corto, cabe más, es más grande | Tomo 2, Cap. 14 |
| Tablas y pictogramas | Recolectar datos, tablas de conteo y pictogramas | Tomo 2, Cap. 13 |
| Gran repaso | Preguntas mezcladas de todos los mundos | — |

## Cómo se juega

- Cada ronda tiene 8 preguntas generadas al azar.
- Si el niño se equivoca recibe una pista. Al segundo error, el juego explica la respuesta.
- Cada ronda entrega de 1 a 3 estrellas.
- El panel **"Para papás, mamás y profes"** muestra el avance por mundo y permite elegir la voz.

## Usarlo

- **Rápido:** abre `index.html` en cualquier navegador moderno (doble clic). Así se puede jugar, pero no instalar como app.
- **Local con PWA:** sirve la carpeta con `python3 -m http.server 8000` y abre `http://localhost:8000`.
- **Publicado:** con GitHub Pages en **Settings › Pages › Deploy from a branch**, rama `main`, carpeta `/ (root)`.

### Instalar como app (PWA)

La instalación necesita HTTPS (por ejemplo GitHub Pages) o `localhost`.

- **Android y computador (Chrome o Edge):** en **"Para papás, mamás y profes"** aparece el botón **Instalar en este dispositivo**. También se puede instalar desde el menú del navegador.
- **iPhone y iPad:** abre la página en Safari y elige **Compartir › Agregar a inicio**.

Después de la primera visita con internet, el juego funciona sin conexión, incluidas las fuentes.

### Voz

El juego usa la síntesis de voz del navegador y elige sola la voz femenina más natural en español que encuentre. La calidad depende del dispositivo:

- **Computador:** Microsoft Edge trae voces neuronales, por ejemplo *Catalina* (Chile).
- **iPhone, iPad o Mac:** descarga *Paulina* o *Mónica* (mejorada) en Ajustes › Accesibilidad › Contenido leído › Voces.

## Privacidad

- No pide nombre, edad ni ningún dato del niño.
- No envía información a ningún servidor. La única petición externa es la descarga de las fuentes tipográficas desde Google Fonts. Después queda en la caché del dispositivo, y si no carga, el juego usa fuentes del sistema.
- Tiene una política de seguridad de contenido (CSP) estricta: solo ejecuta scripts del propio sitio y solo permite Google Fonts como origen externo.
- El progreso (estrellas y voz elegida) se guarda solo en el `localStorage` del navegador.

## Estructura

```
index.html             estructura de la página y CSP
styles.css             estilos (modo claro y oscuro)
app.js                 lógica del juego
sw.js                  service worker (modo sin conexión)
manifest.webmanifest   datos de la app instalable
icons/                 íconos de la app
```

`app.js` está organizado en módulos:

- `Store`: progreso local.
- `Voice` y `Sfx`: voz y sonidos.
- `Draw`: material concreto y pictórico (SVG y CSS).
- `WORLDS`: generadores de preguntas.
- `Game`: motor de rondas y pantallas.
- `Pwa`: registro del service worker y botón de instalar.

## Contribuir

Revisa [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE). Este repositorio no incluye contenido de los textos escolares del Mineduc: los ejercicios son originales y solo siguen los mismos temas.
