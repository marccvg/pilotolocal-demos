// ─────────────────────────────────────────────────────────────
// PilotoLocal — Mockup WhatsApp catálogo+encargos (comercio local)
// Fork de pilotoautomatico_mockup/script.js adaptado a:
//   • catálogo (no agenda/citas)
//   • encargos (no reservas horarias)
//   • push de reseñas Google al final de compra
//   • skin loading por ?skin=floristeria|boutique|papeleria|zapateria
// Mantiene: renderer, dual-view, autoplay, atajos de teclado.
// ─────────────────────────────────────────────────────────────

const params = new URLSearchParams(location.search);
const skinName = params.get('skin') || 'floristeria';

let SKIN = null;
let STEPS = [];
let CHAT_CLIENT = null;
let CHAT_ADMIN = null;

// ─── DOM refs ───
const el = {
  chat: document.getElementById('chat'),
  chatHeader: document.getElementById('chat-header'),
  chatAvatar: document.getElementById('chat-avatar'),
  chatName: document.getElementById('chat-name'),
  chatStatus: document.getElementById('chat-status'),
  chatDual: document.getElementById('chat-dual'),
  chatAvatarDual: document.getElementById('chat-avatar-dual'),
  chatNameDual: document.getElementById('chat-name-dual'),
  chatStatusDual: document.getElementById('chat-status-dual'),
  phoneDual: document.getElementById('phone-dual'),
  stepCurrent: document.getElementById('step-current'),
  stepTotal: document.getElementById('step-total'),
  btnNext: document.getElementById('btn-next'),
  btnPrev: document.getElementById('btn-prev'),
  btnAuto: document.getElementById('btn-auto'),
  btnDual: document.getElementById('btn-dual'),
  btnReset: document.getElementById('btn-reset'),
  sheet: document.getElementById('sheet'),
  sheetBackdrop: document.getElementById('sheet-backdrop'),
  sheetTitle: document.getElementById('sheet-title'),
  sheetContent: document.getElementById('sheet-content'),
  sheetCancel: document.getElementById('sheet-cancel'),
  sheetDual: document.getElementById('sheet-dual'),
  sheetBackdropDual: document.getElementById('sheet-backdrop-dual'),
  sheetTitleDual: document.getElementById('sheet-title-dual'),
  sheetContentDual: document.getElementById('sheet-content-dual'),
  sheetCancelDual: document.getElementById('sheet-cancel-dual'),
  skinLabel: document.getElementById('skin-label'),
};

// ─── State ───
let currentStep = 0;
let currentChat = 'admin';
let chatHistory = { patient: [], admin: [] };
let autoPlay = false;
let autoTimer = null;
let autoSpeedMult = 1;
const AUTO_BASE_MS = 2200;
let dualMode = false;

// ─────────────────────────────────────────────────────────────
// STEP BUILDER — toma el skin y genera la secuencia completa
// Orden: FASE A (admin configura) → FASE B (cliente usa)
// ─────────────────────────────────────────────────────────────
//
// Mapa de steps generados (166 steps totales, validados por validate_flow.py):
//   step 00-04   admin · bienvenida + menú (4 botones)
//   step 05-10   admin · "añadir producto" → prompt foto
//   step 11-14   admin · prompt nombre producto (text input)
//   step 15-21   admin · prompt precio + validación de error numérico
//   step 22-25   admin · precio OK → asigna categoría (list-message)
//   step 26-29   admin · asigna disponibilidad (3 opciones)
//   step 30-33   admin · preview + confirma publicación
//   step 34-37   admin · cierra con "añadir otro / menú"
//   step 38-41   admin · entra a "enviar novedad" → tipo
//   step 42-46   admin · redacta mensaje novedad (text input)
//   step 47-50   admin · preview novedad + envío a 47 clientes
//   step 51-55   admin · confirma envío + vuelta a menú
//   step 56-60   switch → patient · fecha divider + bienvenida cliente
//   step 61-65   patient · menú principal (4 botones) + "ver productos"
//   step 66-70   patient · lista categorías + selección cat[0] + card prod
//   step 71-75   patient · "me interesa" + prompt variante (botones)
//   step 76-80   patient · elige variante + "recoger / guardar"
//   step 81-84   patient · "paso a recoger" + prompt nombre
//   step 85-89   patient · prompt móvil + validación de error (incompleto)
//   step 90-93   patient · móvil OK + confirmación reserva
//   step 94-97   patient · push reseña Google (url-button) + vuelta a menú
//   step 98-102  patient · "hacer encargo" + prompt producto
//   step 103-107 patient · prompt variante (botones + "describir yo")
//   step 108-112 patient · texto libre descripción + prompt fecha
//   step 113-116 patient · elige fecha + confirmación encargo
//   step 117-121 switch → admin · notificación encargo + 3 botones
//   step 122-126 admin · "confirmar + precio" + prompt precio
//   step 127-130 admin · envía precio + hora recogida al cliente
//   step 131-135 switch → patient · entra a "preguntar" + prompt duda
//   step 136-140 patient · texto libre pregunta + forward al dueño
//   step 141-145 switch → admin · recibe duda + "responder yo"
//   step 146-150 admin · texto libre respuesta + confirmación envío
//   step 151-154 switch → patient · recibe respuesta del dueño
//   step 155-158 patient · "horario" + card con horario
//   step 159-162 switch → admin · "pedidos pendientes" (lista 3)
//   step 163-166 admin · selecciona pedido 1 + "listo + avisar"

function buildSteps(skin) {
  const g = skin.negocio_name;
  const owner = skin.owner_name;
  const client = skin.cliente_name;
  const clientFirst = client.split(' ')[0];
  const cats = skin.categorias;
  const p = skin.productos_sample;
  const prodAdd = skin.producto_add_sample;
  const nov = skin.novedad_sample;

  // Rama cliente ejemplo-A: busca categoría cats[0], producto p[0]
  const prodA = p[0];
  // Rama cliente ejemplo-B (encargo custom): usa producto p[3]
  const prodB = p[3];

  // Primeras 3-4 variantes de prodA, parseadas crudas
  const varsA = prodA.variantes
    .split(/[,·]/)
    .map(v => v.trim())
    .filter(v => v.length > 0 && v.length < 24)
    .slice(0, 3);

  return [
    // ═════════════════════════════════════════════════════════
    // FASE B — CLIENTE USA
    // ═════════════════════════════════════════════════════════

    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'date', payload: '💬 CLIENTE PIDIENDO' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `👋 ¡Hola! Bienvenid@ a <strong>${g}</strong>.<br><em>${skin.greeting_tag}</em><br><br>¿En qué te ayudo?`,
      time: '17:30'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '🛍️ Ver productos' },
      { text: '📦 Hacer encargo' },
      { text: '❓ Preguntar' },
      { text: '🕐 Horario' },
    ]},

    // ─── B.1: Cliente ve productos → compra ───
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '🛍️ Ver productos', time: '17:30', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '¿Qué buscas hoy?', time: '17:30'
    }},
    { chat: 'patient', action: 'list-message', payload: {
      btnText: 'Elegir categoría',
      sheetTitle: 'Categorías',
      sections: [{
        header: g,
        items: cats.map(c => ({ text: c.label, sub: c.sub })),
      }]
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: cats[0].label, time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `📷 <strong>${prodA.nombre}</strong><br>${prodA.img} ${prodA.precio}<br><em>${prodA.variantes}</em>`,
      time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '💬 Me interesa' },
      { text: '➡️ Ver siguiente' },
      { text: '⬅ Menú principal' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '💬 Me interesa', time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: `¡Buena elección! ${skin.pregunta_variante_text}`, time: '17:32'
    }},
    { chat: 'patient', action: 'reply-buttons', payload:
      varsA.map(v => ({ text: v })).concat([{ text: '⬅ Volver' }])
    },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: varsA[0] || 'estándar', time: '17:32', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '✓ Apuntado. ¿Pasas tú a por él o te lo guardamos?', time: '17:32'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '📍 Paso a recoger' },
      { text: '📦 Guardadmelo' },
      { text: '⬅ Volver' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '📍 Paso a recoger', time: '17:32', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: 'Perfecto. Dime tu nombre para apuntarlo:', time: '17:33'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: client, time: '17:33', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `Gracias, ${clientFirst}. ¿Me pasas tu móvil para avisarte cuando esté listo?`,
      time: '17:33'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '666 123 456', time: '17:34', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `✅ <strong>Reservado</strong><br><br>${prodA.img} ${prodA.nombre} · ${prodA.precio}<br><br>Lo tendrás listo <strong>hoy antes de las 19h</strong>. Te aviso cuando esté preparado.`,
      time: '17:34'
    }},
    // Push reseña Google (clave del modelo)
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: skin.cta_resena_text, time: '17:34'
    }},
    { chat: 'patient', action: 'url-button', payload: '⭐ Dejar reseña en Google' },
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},

    // ─── B.2: Cliente hace encargo custom ───
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '📦 Hacer encargo', time: '18:00', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: '¿Qué quieres encargar? Puedes decirme el nombre del producto o describirlo con tus palabras.',
      time: '18:00'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: prodB.nombre, time: '18:01', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `✓ <strong>${prodB.nombre}</strong>. ${skin.pregunta_variante_text}`,
      time: '18:01'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '✅ El estándar' },
      { text: '✍️ Describir yo' },
      { text: '⬅ Volver' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '✍️ Describir yo', time: '18:01', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: 'Descríbemelo con tus palabras:', time: '18:01'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out',
      text: 'Para regalo, con una tarjeta que ponga "feliz cumple abuela"',
      time: '18:02', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: `✓ Apuntado. ${skin.pregunta_fecha_text}`, time: '18:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: 'Mañana' },
      { text: 'Pasado mañana' },
      { text: 'Este fin de semana' },
      { text: 'Otra fecha...' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: 'Este fin de semana', time: '18:02', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `✅ <strong>Encargo recibido</strong><br><br>• ${prodB.nombre}<br>• "feliz cumple abuela"<br>• Para este fin de semana<br><br>${owner} te confirmará precio y hora de recogida en un rato.`,
      time: '18:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},

    // Notificación admin: encargo nuevo → confirmar + precio
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'date', payload: '🔔 LO VE EL PANADERO' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `🔔 <strong>Encargo nuevo de ${client}</strong><br><br>• ${prodB.nombre}<br>• "feliz cumple abuela"<br>• Para este fin de semana<br>• 📱 666 123 456`,
      time: '18:03'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✅ Confirmar + enviar precio' },
      { text: '💬 Pedir más info' },
      { text: '❌ No puedo con esta fecha' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '✅ Confirmar + enviar precio', time: '18:03', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '¿Precio final del encargo? (en €)', time: '18:03'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '35€' }, { text: '48€' }, { text: '60€' }, { text: 'Otro precio...' }
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '48€', time: '18:04', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `✅ Enviado a ${client}:<br><br>• <strong>48€</strong><br>• Recogida sábado 11h<br><br>Te aviso cuando responda.`,
      time: '18:04'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},

    // ─── B.3: Cliente pregunta → forward al dueño ───
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '❓ Preguntar', time: '19:00', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `Cuéntame tu duda. Si no te puedo contestar yo, se la paso a ${owner}.`,
      time: '19:00'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out',
      text: '¿Me podéis traer el modelo en otro color?',
      time: '19:01', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `Esta se la paso a ${owner}, te contesta en cuanto pueda ✨`,
      time: '19:01'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '👍 OK, espero' },
      { text: '⬅ Menú principal' },
    ]},

    // Admin recibe el forward y contesta
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `💬 <strong>${client}</strong> pregunta:<br><em>"¿Me podéis traer el modelo en otro color?"</em>`,
      time: '19:01'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✍️ Responder yo' },
      { text: '🤖 Que responda el bot' },
      { text: '⬅ Menú principal' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '✍️ Responder yo', time: '19:02', read: true
    }},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out',
      text: 'Sí claro, lo puedo pedir en 3-4 días. Dime qué color exacto quieres.',
      time: '19:02', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '✓ Enviado al cliente.', time: '19:02'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},

    // Patient recibe la respuesta
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `${owner}: "Sí claro, lo puedo pedir en 3-4 días. Dime qué color exacto quieres."`,
      time: '19:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},

    // ─── B.4: Cliente consulta horario ───
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '🕐 Horario', time: '20:00', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>${g}</strong><br><br>Lu–Vi: 10:00–13:30 · 17:00–20:30<br>Sá: 10:00–14:00<br>Do: cerrado<br><br>Festivos: lo avisamos por aquí.`,
      time: '20:00'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},

    // ─── A.3: Admin gestiona pedidos pendientes ───
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📦 Pedidos pendientes', time: '20:30', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>Pedidos pendientes (3)</strong><br><br>1. ${clientFirst} — ${prodA.nombre} · <em>Para hoy 19h</em><br>2. Clara M. — ${prodB.nombre} · <em>Sábado</em><br>3. David R. — ${p[1].nombre} · <em>Mañana</em>`,
      time: '20:30'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: `1. ${clientFirst}` },
      { text: '2. Clara M.' },
      { text: '3. David R.' },
      { text: '⬅ Menú principal' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: `1. ${clientFirst}`, time: '20:30', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>${client}</strong><br>${prodA.img} ${prodA.nombre} · ${prodA.precio}<br>Para hoy 19h · 📱 666 123 456`,
      time: '20:30'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✅ Listo + avisar cliente' },
      { text: '📅 Reprogramar' },
      { text: '⬅ Volver' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '✅ Listo + avisar cliente', time: '20:31', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `✅ Avisado a ${client}. Ya puede pasar a recogerlo.`,
      time: '20:31'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},

    // Patient recibe aviso de "listo"
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `🔔 ¡Hola ${clientFirst}! Tu <strong>${prodA.nombre}</strong> ya está listo. Puedes pasar cuando quieras antes de las 20:30 ✨`,
      time: '20:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '👍 Paso ahora' },
      { text: '⏰ Paso mañana' },
      { text: '⬅ Menú principal' },
    ]},

    // ─── A.4: Admin ve stats de clientes ───
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📊 Clientes', time: '21:00', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>Tus clientes</strong><br><br>• Total: 142<br>• Suscritos a novedades: 47<br>• Esta semana: 11 pedidos<br>• Habituales (3+ pedidos): 28<br>• Reseñas Google este mes: <strong>+6</strong>`,
      time: '21:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '🎯 Enviar a habituales' },
      { text: '📊 Ver más stats' },
      { text: '⬅ Menú principal' },
    ]},

    // ═════════════════════════════════════════════════════════
    // FASE C — FEATURES PREMIUM
    // stock_management · weekly_analytics · reserva_senal · push reseña
    // ═════════════════════════════════════════════════════════

    // ─── C.0: Menú de gestión diaria ───
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'date', payload: '📦 GESTIÓN DIARIA' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `¿Qué quieres gestionar?`,
      time: '09:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '📦 Stock' },
      { text: '📣 Enviar novedad' },
      { text: '📊 Esta semana' },
      { text: '⬅ Más opciones' },
    ]},

    // ─── C.1: stock_management ───
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📦 Stock', time: '09:01', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>📦 Inventario</strong><br><br>${cats[0].label} — <strong>12 productos</strong> · 1 agotado<br>${cats[1].label} — <strong>8 productos</strong> · todos disponibles<br>${cats[2] ? cats[2].label : '💒 Bodas'} — <strong>3 modelos</strong> activos<br>${cats[3] ? cats[3].label : '🪴 Plantas'} — <strong>6 disponibles</strong> · 2 agotadas<br><br>Toca una categoría para editar:`,
      time: '09:01'
    }},
    { chat: 'admin', action: 'list-message', payload: {
      btnText: 'Gestionar categoría',
      sheetTitle: 'Stock por categoría',
      sections: [{
        header: 'Selecciona categoría',
        items: cats.map(c => ({ text: c.label, sub: c.sub }))
      }]
    }},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: cats[0].label, time: '09:02', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>${cats[0].label}</strong><br><br>• ${p[0].nombre} — ${p[0].precio} ✅ ✏️<br>• ${p[1].nombre} — ${p[1].precio} ✅ ✏️<br>• ${p[2].nombre} — ${p[2].precio} <strong>🚫 Agotado</strong><br><br>12 productos en esta categoría`,
      time: '09:02'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '🚫 Marcar agotado' },
      { text: '✏️ Editar precio' },
      { text: '➕ Añadir producto rápido' },
      { text: '⬅ Volver' },
    ]},
    // Editar precio
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '✏️ Editar precio', time: '09:03', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `¿Qué producto quieres actualizar?`,
      time: '09:03'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: p[0].nombre },
      { text: p[1].nombre },
      { text: p[2].nombre },
      { text: '⬅ Volver' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: p[0].nombre, time: '09:04', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>${p[0].nombre}</strong><br>Precio actual: <strong>${p[0].precio}</strong><br><br>¿Nuevo precio? (en €)`,
      time: '09:04'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '30€' }, { text: '38€' }, { text: '42€' }, { text: 'Otro...' }
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '38€', time: '09:04', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `✅ <strong>Precio actualizado</strong><br><br>${p[0].nombre}<br>${p[0].precio} → <strong>38€</strong><br><br>Cambio visible en tu catálogo WhatsApp al instante.`,
      time: '09:05'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✏️ Otro producto' },
      { text: '👁️ Ver productos agotados' },
      { text: '⬅ Menú principal' },
    ]},
    // Vista agotados
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '👁️ Ver productos agotados', time: '09:06', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>🚫 Agotados ahora (3)</strong><br><br>• ${p[2].nombre}<br>• ${p[4] ? p[4].nombre : 'Monstera maceta 20cm'}<br>• Centro minimalista blanco<br><br>Cuando un cliente pregunte por ellos, te aviso.`,
      time: '09:06'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✅ Reponer: ' + p[2].nombre.split(' ').slice(0,3).join(' ') },
      { text: '⬅ Menú principal' },
    ]},

    // ─── D.1: Admin envía novedad a clientes suscritos ───
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📣 Enviar novedad', time: '09:30', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `📷 Envíame foto + un mensaje corto. Lo mando a tus <strong>47 suscriptores</strong> en WhatsApp.`,
      time: '09:30'
    }},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: `📎 [foto novedad.jpg]`, time: '09:31', read: true
    }},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: `${nov.titulo}\n\n${nov.cuerpo}`, time: '09:31', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `✅ <strong>Enviado a 47 clientes</strong><br><br>Te aviso de respuestas aquí mismo.`,
      time: '09:31'
    }},
    // Cliente recibe la novedad
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `📷 <strong>${nov.titulo}</strong><br><br>${nov.cuerpo}`,
      time: '09:32'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '✅ Resérvame uno' },
      { text: '👀 Ver más' },
      { text: '⬅ Menú principal' },
    ]},

    // ─── C.2: weekly_analytics ───
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📊 Esta semana', time: '10:00', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>📊 Semana 28/10 – 3/11</strong><br><br>📦 <strong>Pedidos: 23</strong> &nbsp;↑ 15% vs sem anterior<br>Lu ██ · Ma ████ · Mi ███ · Ju █████ · Vi ██████<br><br>💶 <strong>Ventas estimadas: €1.247</strong><br>Ticket medio: €54<br><br>📣 <strong>Novedades enviadas: 2</strong><br>Open rate: 78% (37 de 47 clientes)<br><br>⭐ <strong>Reseñas Google: +3 nuevas</strong> · Promedio 4.8`,
      time: '10:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '📅 Ver mes completo' },
      { text: '📊 Abrir dashboard web' },
      { text: '⬅ Menú principal' },
    ]},
    // Ver mes completo
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📅 Ver mes completo', time: '10:01', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>📊 Octubre 2026</strong><br><br>Sem 1 (1–5) &nbsp;&nbsp;████ 18 pedidos · €852<br>Sem 2 (6–12) &nbsp;██████ 21 pedidos · €1.103<br>Sem 3 (13–19) █████ 19 pedidos · €978<br>Sem 4 (20–26) ████████ 23 pedidos · €1.247<br><br><strong>Total mes: 81 pedidos · €4.180</strong><br>Mejor día: viernes (media 7 pedidos)`,
      time: '10:02'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},

    // ─── C.3: reserva_senal (encargo grande con anticipo Bizum) ───
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'date', payload: '💸 ENCARGO GRANDE CON SEÑAL' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '📦 Hacer encargo', time: '15:00', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '¿Qué quieres encargar?', time: '15:00'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out',
      text: 'Decoración floral para boda: arco de flores + 8 centros de mesa',
      time: '15:01', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `✓ Apuntado. Es un encargo especial (estimado <strong>+85€</strong>).<br><br>Para reservar tu fecha pedimos una <strong>señal del 15% ≈ €13</strong>.<br><br>Si cancelas con más de 48h de antelación, te la devolvemos íntegra.`,
      time: '15:01'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '💳 Pagar señal por Bizum' },
      { text: '💰 Reservar sin señal' },
      { text: '❌ Cancelar' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '💳 Pagar señal por Bizum', time: '15:02', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `Envía <strong>€13</strong> por Bizum al:<br><br>📱 <strong>666 XXX XXX</strong> (${g})<br>Concepto: <em>SEÑAL-${clientFirst.toUpperCase()}</em><br><br>Cuando lo hagas, adjunta el justificante aquí.`,
      time: '15:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '📎 Adjunto justificante Bizum' },
      { text: '⏳ Lo hago ahora' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '📎 Adjunto justificante Bizum', time: '15:05', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `✅ <strong>¡Señal recibida!</strong><br><br>Tu encargo de boda queda <strong>confirmado</strong> ✨<br><br>${g} te contactará en 24h para los detalles del diseño.`,
      time: '15:06'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '⬅ Menú principal' },
    ]},
    // Admin: notificación señal recibida
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `🔔 <strong>Señal de reserva recibida</strong><br><br>👤 ${client}<br>📋 Decoración boda: arco + 8 centros<br>💳 Señal €13 vía Bizum ✅<br>📎 Justificante adjunto<br><br>¿Agendas la reunión de diseño?`,
      time: '15:06'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '📅 Agendar reunión diseño' },
      { text: '📋 Ver todas las reservas' },
      { text: '⬅ Menú principal' },
    ]},

    // ─── C.4: Push reseña diferido (24h tras recogida) ───
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'date', payload: '✅ RECOGIDO · PIDE RESEÑA' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `🔔 <strong>${clientFirst} ha pasado a recoger</strong><br><br>${prodA.img} ${prodA.nombre} · ${prodA.precio}<br><br>¿Marco como entregado?`,
      time: '12:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✅ Entregado + push reseña' },
      { text: '✅ Entregado (sin push)' },
      { text: '⬅ Volver' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '✅ Entregado + push reseña', time: '12:01', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `✅ Pedido cerrado.<br><br>⏳ <strong>Push de reseña programado</strong> para mañana a las 12:00.<br><br>Mensaje previsto:<br><em>"Hola ${clientFirst}, ayer recogiste ${prodA.nombre}. Si te gustó, ¿nos dejas una reseña en Google? Nos ayuda muchísimo 🙏"</em>`,
      time: '12:01'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✏️ Editar mensaje' },
      { text: '⏰ Cambiar hora envío' },
      { text: '⬅ Menú principal' },
    ]},
    // 24h después: push enviado
    { chat: 'admin', action: 'date', payload: '📤 MENSAJE DE RESEÑA' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `📤 <strong>Push de reseña enviado</strong> a ${client}<br><br>Entregado ayer · Mensaje enviado hoy 12:00<br>Estado: <em>pendiente respuesta</em>`,
      time: '12:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '📊 Ver respuestas' },
      { text: '⬅ Menú principal' },
    ]},
    // Cliente recibe push diferido
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `Hola ${clientFirst} 👋 Ayer recogiste <strong>${prodA.nombre}</strong> de ${g}.<br><br>Si te quedó bien, ¿nos ayudas con una reseña en Google? Son solo 30 segundos y nos ayuda muchísimo a seguir en el barrio 🙏`,
      time: '12:00'
    }},
    { chat: 'patient', action: 'url-button', payload: '⭐ Dejar reseña en Google' },

    // ─── D.2: Cliente comparte / recomienda tras reseña ───
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `🙌 ¡Gracias ${clientFirst}! Reseña recibida ⭐⭐⭐⭐⭐<br><br>Si conoces a alguien a quien le gustaría ${g.toLowerCase()}, ¿nos recomiendas? Te enviamos un mensaje listo para compartir.`,
      time: '12:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '📣 Compartir con un amig@' },
      { text: '⬅ Menú principal' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '📣 Compartir con un amig@', time: '12:02', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `📩 <strong>Mensaje listo para reenviar</strong><br><br><em>"Te recomiendo ${g.toLowerCase()}. Puedes pedir por WhatsApp aquí: wa.me/346XXXXXXX"</em>`,
      time: '12:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '↗️ Reenviar ahora' },
      { text: '⬅ Menú principal' },
    ]},
  ];
}

// ─────────────────────────────────────────────────────────────
// RENDER ENGINE
// ─────────────────────────────────────────────────────────────

function isDual() { return dualMode; }

function getChatContainer(whichChat) {
  if (isDual()) {
    return whichChat === 'admin' ? el.chatDual : el.chat;
  }
  return el.chat;
}

function switchChat(target) {
  currentChat = target;
  const cfg = target === 'admin' ? CHAT_ADMIN : CHAT_CLIENT;
  if (isDual()) return;
  el.chatAvatar.className = 'avatar ' + cfg.avatarClass;
  el.chatAvatar.textContent = cfg.avatar;
  el.chatName.textContent = cfg.name;
  el.chatStatus.textContent = cfg.status;
  el.chat.innerHTML = '';
  chatHistory[target].forEach(node => el.chat.appendChild(node));
  scrollDown(el.chat);
}

function scrollDown(container) {
  const c = container || el.chat;
  requestAnimationFrame(() => { c.scrollTop = c.scrollHeight; });
}

function appendToChat(node, whichChat) {
  const target = whichChat || currentChat;
  const container = getChatContainer(target);
  container.appendChild(node);
  chatHistory[target].push(node);
  scrollDown(container);
}

function removeTyping() {
  ['patient', 'admin'].forEach(c => {
    const container = getChatContainer(c);
    const typings = container.querySelectorAll('.typing');
    typings.forEach(t => {
      t.remove();
      chatHistory[c] = chatHistory[c].filter(n => n !== t);
    });
  });
}

function toggleDual() {
  dualMode = !dualMode;
  document.body.classList.toggle('dual', dualMode);
  if (el.btnDual) el.btnDual.textContent = dualMode ? '👤 Single view' : '👥 Dual view';
  if (dualMode) {
    chatHistory = { patient: [], admin: [] };
    el.chat.innerHTML = '';
    el.chatDual.innerHTML = '';
    el.chatAvatar.className = 'avatar';
    el.chatAvatar.textContent = CHAT_CLIENT.avatar;
    el.chatName.textContent = CHAT_CLIENT.name;
    el.chatStatus.textContent = CHAT_CLIENT.status;
    el.chatAvatarDual.className = 'avatar admin';
    el.chatAvatarDual.textContent = CHAT_ADMIN.avatar;
    el.chatNameDual.textContent = CHAT_ADMIN.name;
    el.chatStatusDual.textContent = CHAT_ADMIN.status;
    const savedStep = currentStep;
    currentStep = 0;
    hideSheet();
    for (let i = 0; i < savedStep; i++) {
      renderStep(i, { replay: true });
      currentStep = i + 1;
    }
    scrollDown(el.chat);
    scrollDown(el.chatDual);
  } else {
    el.chat.innerHTML = '';
    chatHistory[currentChat].forEach(n => el.chat.appendChild(n));
    const cfg = currentChat === 'admin' ? CHAT_ADMIN : CHAT_CLIENT;
    el.chatAvatar.className = 'avatar ' + cfg.avatarClass;
    el.chatAvatar.textContent = cfg.avatar;
    el.chatName.textContent = cfg.name;
    el.chatStatus.textContent = cfg.status;
    scrollDown(el.chat);
  }
}

function renderStep(idx, opts) {
  const s = STEPS[idx];
  if (!s) return;
  const replay = opts && opts.replay;

  if (s.chat === 'switch') {
    currentChat = s.payload;
    if (!isDual()) switchChat(s.payload);
    return;
  }

  if (!isDual() && s.chat !== currentChat) {
    switchChat(s.chat);
  } else {
    currentChat = s.chat;
  }

  removeTyping();

  if (s.action === 'date') {
    const div = document.createElement('div');
    div.className = 'date-divider';
    div.textContent = s.payload;
    appendToChat(div, s.chat);
    return;
  }

  if (s.action === 'typing') {
    if (replay) return;
    const div = document.createElement('div');
    div.className = 'typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    appendToChat(div, s.chat);
    return;
  }

  if (s.action === 'msg') {
    const div = document.createElement('div');
    div.className = 'msg ' + (s.payload.dir === 'in' ? 'in' : 'out');
    const meta = s.payload.read
      ? `<span class="meta">${s.payload.time} <span class="check">✓✓</span></span>`
      : `<span class="meta">${s.payload.time}</span>`;
    div.innerHTML = s.payload.text.replace(/\n/g, '<br>') + meta;
    appendToChat(div, s.chat);
    return;
  }

  if (s.action === 'reply-buttons') {
    const div = document.createElement('div');
    div.className = 'reply-buttons linked-up';
    s.payload.forEach(btn => {
      const b = document.createElement('button');
      b.className = 'reply-btn';
      b.innerHTML = btn.text;
      div.appendChild(b);
    });
    appendToChat(div, s.chat);
    return;
  }

  if (s.action === 'list-message') {
    const div = document.createElement('div');
    div.className = 'list-message-btn';
    div.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg> ${s.payload.btnText}`;
    div.onclick = () => showSheet(s.payload, s.chat);
    appendToChat(div, s.chat);
    if (!replay) {
      hideSheet();
      setTimeout(() => showSheet(s.payload, s.chat), 500);
    }
    return;
  }

  if (s.action === 'url-button') {
    const div = document.createElement('div');
    div.className = 'url-btn';
    div.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14z"/><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2z"/></svg> ${s.payload}`;
    appendToChat(div, s.chat);
    return;
  }
}

function showSheet(payload, whichChat) {
  const useAdminSheet = isDual() && whichChat === 'admin';
  const sheet = useAdminSheet ? el.sheetDual : el.sheet;
  const backdrop = useAdminSheet ? el.sheetBackdropDual : el.sheetBackdrop;
  const title = useAdminSheet ? el.sheetTitleDual : el.sheetTitle;
  const content = useAdminSheet ? el.sheetContentDual : el.sheetContent;

  title.textContent = payload.sheetTitle;
  content.innerHTML = '';
  payload.sections.forEach(sec => {
    const h = document.createElement('div');
    h.className = 'sheet-section-header';
    h.textContent = sec.header;
    content.appendChild(h);
    sec.items.forEach(item => {
      const i = document.createElement('div');
      i.className = 'sheet-item';
      i.innerHTML = `<span>${item.text}</span>${item.sub ? '<span class="sublabel">'+item.sub+'</span>' : ''}`;
      i.onclick = () => hideSheet();
      content.appendChild(i);
    });
  });
  sheet.classList.add('visible');
  backdrop.classList.add('visible');
}

function hideSheet() {
  el.sheet.classList.remove('visible');
  el.sheetBackdrop.classList.remove('visible');
  if (el.sheetDual) el.sheetDual.classList.remove('visible');
  if (el.sheetBackdropDual) el.sheetBackdropDual.classList.remove('visible');
}

function updateProgress() {
  el.stepCurrent.textContent = currentStep;
  el.stepTotal.textContent = STEPS.length;
}

function next() {
  if (currentStep >= STEPS.length) return;
  renderStep(currentStep);
  currentStep++;
  updateProgress();
  hideSheet();
}

function prev() {
  if (currentStep <= 0) return;
  reset(false);
  const target = currentStep - 1;
  for (let i = 0; i < target; i++) {
    renderStep(i, { replay: true });
    currentStep = i + 1;
  }
  updateProgress();
}

function reset(resetSteps = true) {
  if (resetSteps) currentStep = 0;
  chatHistory = { patient: [], admin: [] };
  el.chat.innerHTML = '';
  if (el.chatDual) el.chatDual.innerHTML = '';
  currentChat = 'admin';
  if (!isDual()) {
    switchChat('admin');
  } else {
    el.chatAvatar.className = 'avatar';
    el.chatAvatar.textContent = CHAT_CLIENT.avatar;
    el.chatName.textContent = CHAT_CLIENT.name;
    el.chatStatus.textContent = CHAT_CLIENT.status;
    el.chatAvatarDual.className = 'avatar admin';
    el.chatAvatarDual.textContent = CHAT_ADMIN.avatar;
    el.chatNameDual.textContent = CHAT_ADMIN.name;
    el.chatStatusDual.textContent = CHAT_ADMIN.status;
  }
  updateProgress();
  hideSheet();
  if (autoPlay) toggleAuto();
}

function toggleAuto() {
  autoPlay = !autoPlay;
  el.btnAuto.textContent = autoPlay ? '⏸️ Pausar' : '▶️ Auto';
  if (autoPlay) {
    startAutoTimer();
  } else {
    clearInterval(autoTimer);
  }
}

function startAutoTimer() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = setInterval(() => {
    if (currentStep >= STEPS.length) { toggleAuto(); return; }
    next();
  }, AUTO_BASE_MS / autoSpeedMult);
}

function toggleSpeed() {
  autoSpeedMult = autoSpeedMult === 1 ? 2 : 1;
  const btn = document.getElementById('btn-speed');
  if (btn) {
    btn.textContent = autoSpeedMult === 2 ? '🐢 x1' : '⚡ x2';
    btn.classList.toggle('active', autoSpeedMult === 2);
  }
  if (autoPlay) startAutoTimer();
}

// ─────────────────────────────────────────────────────────────
// INIT — carga skin, construye STEPS, enlaza eventos
// ─────────────────────────────────────────────────────────────

async function init() {
  try {
    const r = await fetch(`skins/${skinName}.json`, { cache: 'no-store' });
    if (!r.ok) throw new Error(`skin "${skinName}" no encontrado`);
    SKIN = await r.json();
  } catch (err) {
    console.error('[pilotolocal] fallo cargando skin:', err);
    el.chat.innerHTML = `<div class="msg in"><strong>❌ Error:</strong> no encontré el skin <code>${skinName}</code>.<br>Prueba <code>?skin=floristeria</code>.</div>`;
    return;
  }

  CHAT_CLIENT = {
    avatar: SKIN.negocio_emoji,
    name: SKIN.negocio_name,
    status: 'en línea',
    avatarClass: '',
  };
  CHAT_ADMIN = {
    avatar: SKIN.negocio_emoji,
    name: SKIN.admin_name,
    status: 'siempre activo · bot verificado ✓',
    avatarClass: 'admin',
  };

  STEPS = buildSteps(SKIN);
  if (el.skinLabel) el.skinLabel.textContent = SKIN.slug;

  el.chatAvatar.textContent = CHAT_ADMIN.avatar;
  el.chatName.textContent = CHAT_ADMIN.name;
  el.chatStatus.textContent = CHAT_ADMIN.status;
  if (el.chatAvatarDual) el.chatAvatarDual.textContent = CHAT_ADMIN.avatar;
  if (el.chatNameDual) el.chatNameDual.textContent = CHAT_ADMIN.name;
  if (el.chatStatusDual) el.chatStatusDual.textContent = CHAT_ADMIN.status;

  el.btnNext.onclick = next;
  el.btnPrev.onclick = prev;
  el.btnAuto.onclick = toggleAuto;
  const btnSpeed = document.getElementById('btn-speed');
  if (btnSpeed) btnSpeed.onclick = toggleSpeed;
  el.btnReset.onclick = () => reset(true);
  if (el.btnDual) el.btnDual.onclick = toggleDual;

  el.sheetBackdrop.onclick = hideSheet;
  el.sheetCancel.onclick = hideSheet;
  if (el.sheetBackdropDual) el.sheetBackdropDual.onclick = hideSheet;
  if (el.sheetCancelDual) el.sheetCancelDual.onclick = hideSheet;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Enter') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === ' ') { e.preventDefault(); toggleAuto(); }
    else if (e.key === 'r' || e.key === 'R') reset(true);
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }
    else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('hide-controls');
    else if (e.key === 'b' || e.key === 'B') document.body.classList.toggle('nobezel');
    else if (e.key === 'd' || e.key === 'D') toggleDual();
    else if (e.key === 'x' || e.key === 'X') toggleSpeed();
  });

  if (params.get('clean') === '1') document.body.classList.add('clean');
  if (params.get('nobezel') === '1') document.body.classList.add('nobezel');
  if (params.get('dual') === '1') setTimeout(() => toggleDual(), 100);
  if (params.get('speed') === '2') setTimeout(() => toggleSpeed(), 50);
  if (params.get('autostart') === '1') setTimeout(() => toggleAuto(), 1000);
  if (params.get('mode') === 'guion') setTimeout(() => openGuion(), 400);

  reset(true);
}

init();

// ─────────────────────────────────────────────────────────────
// GUION PANEL — script de campo para visitas puerta a puerta
// ─────────────────────────────────────────────────────────────

function buildGuionHTML(skin) {
  const g = skin.guion;
  if (!g) return '<p style="color:#888;padding:20px">Este skin no tiene guión configurado.</p>';

  let html = '';

  // Entrada
  html += `<div class="g-section">
    <div class="g-section-label">🚪 Entrada — di esto al entrar</div>
    <div class="g-text">${g.entrada}</div>
  </div>`;

  // Preguntas
  html += `<div class="g-section">
    <div class="g-section-label">❓ Preguntas — toca para marcar como hecha</div>`;
  g.preguntas.forEach((p, i) => {
    html += `<div class="g-pregunta" data-idx="${i}" onclick="this.classList.toggle('done')">
      <div class="g-q-text">${p.q}</div>
      <div class="g-outcomes">
        <span class="g-outcome si">SÍ: ${p.si}</span>
        <span class="g-outcome no">NO: ${p.no}</span>
      </div>
    </div>`;
  });
  html += `</div>`;

  // Demo trigger
  html += `<div class="g-section">
    <div class="g-section-label">📱 Cuando hay dolor — di esto para pasar a la demo</div>
    <div class="g-trigger">${g.demo_trigger}</div>
  </div>`;

  // Objeciones
  html += `<div class="g-section">
    <div class="g-section-label">🛡️ Objeciones — toca para ver la respuesta</div>`;
  g.objeciones.forEach((o) => {
    html += `<div class="g-objecion" onclick="this.classList.toggle('open')">
      <div class="g-objecion-q">${o.o}</div>
      <div class="g-objecion-r">${o.r}</div>
      <div class="g-objecion-hint">Toca para ver respuesta →</div>
    </div>`;
  });
  html += `</div>`;

  // Cierre
  html += `<div class="g-section">
    <div class="g-section-label">🤝 Cierre</div>
    <div class="g-cierre">${g.cierre}</div>
  </div>`;

  return html;
}

function openGuion() {
  if (!SKIN || !SKIN.guion) return;
  const overlay = document.getElementById('guion-overlay');
  const body = document.getElementById('guion-body');
  const title = document.getElementById('guion-title');
  title.textContent = `📋 Guión — ${SKIN.negocio_name || SKIN.slug}`;
  body.innerHTML = buildGuionHTML(SKIN);
  overlay.style.display = 'flex';
}

function closeGuion() {
  document.getElementById('guion-overlay').style.display = 'none';
}

// Wire up after init
const _origInit = init;
document.addEventListener('DOMContentLoaded', () => {
  // btn-guion puede no existir en versiones sin el panel
  const btnGuion = document.getElementById('btn-guion');
  if (btnGuion) btnGuion.onclick = openGuion;
  const btnClose = document.getElementById('guion-close');
  if (btnClose) btnClose.onclick = closeGuion;
  const overlay = document.getElementById('guion-overlay');
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeGuion(); });
});

// Añadir atajo de teclado G al listener existente
document.addEventListener('keydown', (e) => {
  if ((e.key === 'g' || e.key === 'G') && !e.ctrlKey && !e.metaKey) {
    const overlay = document.getElementById('guion-overlay');
    if (overlay) {
      if (overlay.style.display === 'none') openGuion();
      else closeGuion();
    }
  }
});

// Wire buttons after skin loads (init() es async)
const _guionInitPatch = setInterval(() => {
  const btn = document.getElementById('btn-guion');
  if (btn && !btn._wired) {
    btn._wired = true;
    btn.onclick = openGuion;
    clearInterval(_guionInitPatch);
  }
}, 100);
