# PilotoLocal — mockup WhatsApp catálogo

Mockup chatbot WhatsApp para pequeño comercio local (floristería, boutique, papelería, zapatería...). Catálogo + encargos + aviso de reseña Google + panel admin, todo en WhatsApp.

Fork del mockup `pilotoautomatico_mockup` (citas) adaptado al modelo catálogo/encargos.

## Cómo probarlo

Abre `index.html` en el navegador con el skin como query param:

```
file:///home/Projects/pilotolocal/index.html?skin=floristeria
file:///home/Projects/pilotolocal/index.html?skin=boutique
file:///home/Projects/pilotolocal/index.html?skin=papeleria
file:///home/Projects/pilotolocal/index.html?skin=zapateria
```

Sin `?skin=` carga `floristeria` por defecto.

### Atajos de presentación

| Tecla | Acción |
|---|---|
| `→` / `Enter` | Siguiente paso |
| `←` | Paso anterior |
| `Space` | Autoplay on/off |
| `D` | Dual view (cliente + dueño lado a lado) |
| `R` | Reset |
| `F` | Fullscreen |
| `H` | Ocultar controles |
| `B` | Quitar marco iPhone |

Query params extra: `&dual=1`, `&autostart=1`, `&clean=1`, `&nobezel=1`.

## Añadir skin nuevo

Copia uno de los JSON existentes de `skins/` y adáptalo. Mantén las claves:

- `slug`, `negocio_name`, `negocio_emoji`, `admin_name`, `owner_name`, `cliente_name`
- `greeting_tag`, `tono`
- `categorias[]` (key, label, sub)
- `productos_sample[]` (al menos 5 productos)
- `pregunta_variante_text`, `pregunta_fecha_text`
- `cta_resena_text` (texto push reseña Google — clave del modelo)
- `novedad_sample`, `producto_add_sample`

El motor del script genera los ~160 steps a partir del skin — no hace falta tocar `script.js`.

## Estructura

- `index.html` — UI iPhone + WhatsApp Business
- `styles.css` — styling pixel-perfect WhatsApp 2024
- `script.js` — motor de conversación, genera STEPS a partir del skin
- `skins/{vertical}.json` — overrides textos+categorías por vertical
- `validate_flow.py` — valida reglas UX (cada mensaje con decisión tiene botones; cada rama termina con `⬅ Menú principal`)

## Validar el flujo

```bash
python3 validate_flow.py
```

Debe reportar `OK: N steps verified`.

## Flujos cubiertos

**Rama admin (dueño):**
1. Bienvenida + menú (añadir producto / enviar novedad / pedidos / clientes)
2. Añadir producto (foto + nombre + precio + categoría + disponibilidad + preview)
3. Enviar novedad (tipo + mensaje + preview + envío a 47 clientes)
4. Pedidos pendientes (lista mock de 3 → marcar listo → aviso cliente)
5. Clientes (stats: total, suscritos, habituales, reseñas)

**Rama cliente:**
1. Saludo + menú (ver productos / encargo / preguntar / horario)
2. Ver productos → categoría → producto card → "Me interesa" → variante → recoger/guardar → nombre + móvil → confirmación + push reseña Google
3. Hacer encargo custom → producto + descripción + fecha → confirmación → admin confirma + precio
4. Preguntar → forward a dueño → respuesta → vuelta al cliente
5. Horario del comercio

Todas las ramas incluyen validaciones de input (precio no numérico, móvil incompleto) y terminan con `⬅ Menú principal`.
