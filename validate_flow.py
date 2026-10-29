#!/usr/bin/env python3
"""
validate_flow.py — comprueba que el motor de conversación en script.js
cumple las reglas UX:
  1) Cada mensaje del bot (action: 'msg' + dir: 'in') que requiere decisión
     tiene buttons adjuntos (reply-buttons / list-message / url-button)
     en los steps inmediatamente siguientes.
  2) Cada "rama" (bloque de chat entre switches o fin) termina
     con un reply-buttons que contiene `⬅ Menú principal`.
Salida: `OK: N steps verified` (exit 0) o `FAIL: ...` (exit 1).
"""

from __future__ import annotations

import pathlib
import re
import sys

def _resolve_script_path() -> pathlib.Path:
    """Localiza script.js. Buscamos en este orden:
    1. $PILOTOLOCAL_DIR si está definido.
    2. CWD/script.js (si el usuario hizo cd al proyecto antes de llamar).
    3. Hermano del validate_flow.py (si están junto a script.js).
    4. /home/Projects/pilotolocal/script.js como fallback canónico.
    """
    import os
    env = os.environ.get("PILOTOLOCAL_DIR")
    candidates = []
    if env:
        candidates.append(pathlib.Path(env) / "script.js")
    candidates.append(pathlib.Path.cwd() / "script.js")
    candidates.append(pathlib.Path(__file__).parent / "script.js")
    candidates.append(pathlib.Path("/home/Projects/pilotolocal/script.js"))
    for c in candidates:
        if c.is_file():
            return c
    return candidates[-1]


SCRIPT_PATH = _resolve_script_path()

# Un step termina en `}}, o }], o `},` según su forma. Para parsear sin un AST
# de JS, cortamos por marcadores conocidos del fichero y luego inspeccionamos
# cada bloque con regex simples.

STEP_START_RE = re.compile(
    r"\{\s*chat:\s*'(?P<chat>[^']+)'\s*,\s*action:\s*'(?P<action>[^']+)'"
    r"(?:\s*,\s*payload:\s*(?P<payload>.+?))?\s*\}(?=,\s*(?:\{|\]))",
    re.DOTALL,
)

MENU_LABEL = "⬅ Menú principal"


def extract_steps(src: str) -> list[dict]:
    """Extrae lista mínima de steps (chat/action + marcadores clave).

    No necesitamos reconstruir el payload entero; solo saber:
      - chat ('patient' | 'admin' | 'switch')
      - action ('msg' | 'reply-buttons' | 'list-message' | 'url-button' | 'typing' | 'date')
      - si action == 'msg', su dir ('in' | 'out')
      - si action == 'reply-buttons', si contiene el label de menú
    """
    # Localizar la función buildSteps y quedarnos con el return [...] interno.
    m = re.search(r"function buildSteps\(skin\)\s*\{(.+?)\n\}", src, re.DOTALL)
    if not m:
        sys.exit("FAIL: no encuentro function buildSteps en script.js")
    body = m.group(1)

    steps = []
    # Dividir por cada aparición de `{ chat: '...' ` (no las anidadas en payload).
    # Como payloads pueden tener llaves/strings, usamos indice de "{ chat:" en el
    # nivel top. Es seguro porque los steps son siempre al nivel del array.
    positions = [i.start() for i in re.finditer(r"\{\s*chat:\s*'", body)]
    positions.append(len(body))
    for i in range(len(positions) - 1):
        chunk = body[positions[i]:positions[i + 1]]
        chat_m = re.search(r"chat:\s*'([^']+)'", chunk)
        if not chat_m:
            continue
        chat = chat_m.group(1)

        if chat == "switch":
            # chat: 'switch', payload: 'patient' | 'admin'
            payload_m = re.search(r"payload:\s*'([^']+)'", chunk)
            steps.append({"chat": "switch", "target": payload_m.group(1) if payload_m else None})
            continue

        action_m = re.search(r"action:\s*'([^']+)'", chunk)
        if not action_m:
            continue
        action = action_m.group(1)
        step = {"chat": chat, "action": action}

        if action == "msg":
            dir_m = re.search(r"dir:\s*'([^']+)'", chunk)
            step["dir"] = dir_m.group(1) if dir_m else None
            text_m = re.search(r"text:\s*(?:`([^`]*)`|'([^']*)')", chunk, re.DOTALL)
            if text_m:
                step["text"] = text_m.group(1) or text_m.group(2) or ""
        elif action == "reply-buttons":
            step["has_menu_button"] = MENU_LABEL in chunk
            step["button_texts"] = re.findall(r"text:\s*(?:`([^`]+)`|'([^']+)')", chunk)

        steps.append(step)

    return steps


TEXT_INPUT_HINTS = (
    "nombre", "Nombre", "móvil", "Móvil", "descríb", "Descríb",
    "Escribe", "escribe", "Dime", "Cuéntame", "Cómo se llama",
    "Precio?", "¿precio",
)


def _is_text_prompt(step: dict) -> bool:
    """Un bot_message es prompt de texto libre si pregunta por nombre, móvil,
    descripción u otro campo que la memoria durable permite como free-text."""
    txt = step.get("text", "") or ""
    return any(h in txt for h in TEXT_INPUT_HINTS)


def validate_bot_messages(steps: list[dict]) -> list[str]:
    """Regla 1: cada msg con dir='in' que requiere decisión del usuario
    debe tener controles (reply-buttons / list-message / url-button) en los
    siguientes 1-4 steps (saltando typings).

    Excepciones permitidas:
      • seguir con otro msg 'in' (bot continúa hablando antes de preguntar)
      • seguir con un msg 'out' si el bot pidió un dato de texto libre
        (nombre, móvil, descripción, precio custom...) — ver memoria durable.
    """
    errors = []
    for i, s in enumerate(steps):
        if s.get("chat") == "switch":
            continue
        if s.get("action") != "msg" or s.get("dir") != "in":
            continue

        has_followup_control = False
        has_followup_in_msg = False
        has_followup_out_msg = False
        for j in range(i + 1, min(i + 5, len(steps))):
            n = steps[j]
            if n.get("chat") == "switch":
                break
            if n.get("action") == "typing":
                continue
            if n.get("action") in ("reply-buttons", "list-message", "url-button"):
                has_followup_control = True
                break
            if n.get("action") == "msg":
                if n.get("dir") == "in":
                    has_followup_in_msg = True
                else:
                    has_followup_out_msg = True
                break

        if has_followup_in_msg or has_followup_control:
            continue
        if has_followup_out_msg and _is_text_prompt(s):
            continue  # bot pidió texto libre, usuario respondió
        errors.append(
            f"step {i} (chat={s['chat']}): bot_message sin buttons/list/url ni prompt de texto libre"
        )
    return errors


def validate_branches_end_with_menu(steps: list[dict]) -> list[str]:
    """Regla 2: cada rama (bloque entre 'switch' o entre inicio/fin) debe
    terminar en un reply-buttons que contenga `⬅ Menú principal`.
    """
    errors = []
    # Identificar límites de ramas.
    boundaries = [i for i, s in enumerate(steps) if s.get("chat") == "switch"]
    boundaries.append(len(steps))

    start = 0
    for b in boundaries:
        block = steps[start:b]
        if block:
            # Buscar el último reply-buttons del bloque.
            last_rb = None
            for s in block:
                if s.get("action") == "reply-buttons":
                    last_rb = s
            if last_rb is None:
                errors.append(f"rama que termina en step {b-1}: no tiene reply-buttons")
            elif not last_rb.get("has_menu_button"):
                errors.append(
                    f"rama que termina en step {b-1}: último reply-buttons no incluye '{MENU_LABEL}'"
                )
        start = b + 1
    return errors


def main() -> int:
    if not SCRIPT_PATH.exists():
        print(f"FAIL: no existe {SCRIPT_PATH}")
        return 1
    src = SCRIPT_PATH.read_text(encoding="utf-8")
    steps = extract_steps(src)
    if not steps:
        print("FAIL: no se extrajo ningún step de buildSteps")
        return 1

    errors = []
    errors.extend(validate_bot_messages(steps))
    errors.extend(validate_branches_end_with_menu(steps))

    menu_total = sum(1 for s in steps if s.get("action") == "reply-buttons" and s.get("has_menu_button"))

    if errors:
        print("FAIL:")
        for e in errors:
            print(f"  - {e}")
        print(f"\nSteps parseados: {len(steps)} · Botones '{MENU_LABEL}' totales: {menu_total}")
        return 1

    print(f"OK: {len(steps)} steps verified · {menu_total} ramas terminan con '{MENU_LABEL}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
