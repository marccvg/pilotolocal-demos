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

// Dispatcher: según skin.tipo escoge flow específico
function buildSteps(skin) {
  if (skin.tipo === 'citas') return buildStepsCitas(skin);
  return buildStepsProducto(skin);
}

// ─────────────────────────────────────────────────────────────
// FLOW CITAS (peluquería, estética, fisio) — reserva + recordatorio
//   + rellenar hueco + reseña
// ─────────────────────────────────────────────────────────────
function buildStepsCitas(skin) {
  const g = skin.negocio_name;
  const client = skin.cliente_name;
  const clientFirst = client.split(' ')[0];
  const cats = skin.categorias;
  const servs = skin.productos_sample;
  // Categoría y servicio DEMO coherente (configurable desde skin)
  const catDemoKey = skin.cat_demo || cats[0].key;
  const catDemo = cats.find(c => c.key === catDemoKey) || cats[0];
  const servsCat = servs.filter(x => x.cat === catDemo.key);
  const servA = servs.find(x => x.id === skin.serv_demo_id) || servsCat[0] || servs[0];
  const slotsDia = skin.slots_demo || ['10:30', '11:30', '13:00', '16:30', '17:30'];
  const slotElegido = skin.slot_elegido || '11:30';
  const peluquera = skin.peluquera_demo || 'Laura';
  const dia = skin.dia_demo || 'Sábado';

  const MENU_CLIENTE = [
    { text: '📅 Reservar cita' },
    { text: '💰 Precios + servicios' },
    { text: '🖼️ Galería trabajos' },
    { text: '📝 Mi próxima cita' },
    { text: '🔄 Repetir última' },
    { text: '❓ Preguntar' },
    { text: '📍 Dónde estamos' },
  ];
  const MENU_ADMIN = [
    { text: '📅 Agenda hoy' },
    { text: '📝 Lista de espera' },
    { text: '👥 Clientes' },
    { text: '📊 Analítica' },
    { text: '⭐ Reseñas' },
    { text: '⚙️ Más' },
  ];

  return [
    // ═════════════════════════════════════════════════════════
    // 1. CLIENTE RESERVA CITA (botón-first)
    // ═════════════════════════════════════════════════════════
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'date', payload: '💬 CLIENTE RESERVANDO' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `👋 ¡Hola <strong>${clientFirst}</strong>! Bienvenida de nuevo a <strong>${g}</strong>.<br><em>Tu última cita fue el 15 sept — balayage con ${peluquera} 💛</em><br><br>¿Qué necesitas?`,
      time: '17:30'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: MENU_CLIENTE },

    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '📅 Reservar cita', time: '17:30', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '¿Qué tipo de servicio?', time: '17:30'
    }},
    { chat: 'patient', action: 'list-message', payload: {
      btnText: 'Ver categorías',
      sheetTitle: 'Servicios',
      sections: [{ header: 'Elige una', items: cats.map(c => ({ text: c.label, sub: c.sub })) }]
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: catDemo.label, time: '17:30', read: true
    }},
    { chat: 'patient', action: 'typing' },
    (function(){
      const sc = servsCat;
      const priceLabel = x => (x.variantes_precio && x.variantes_precio.length > 1) ? `desde ${x.variantes_precio[0].precio_label}` : x.precio;
      return { chat: 'patient', action: 'list-message', payload: {
        btnText: `Ver ${catDemo.label.replace(/^[^\s]+ /,'').toLowerCase()}`,
        sheetTitle: catDemo.label,
        sections: [{ header: 'Toca el que quieras', items: sc.map(x => ({ text: `${x.img} ${x.nombre}`, sub: priceLabel(x) })) }]
      }};
    })(),
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: `${servA.img} ${servA.nombre}`, time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: (servA.img_url ? `<img src="${servA.img_url}" class="chat-img" alt="${servA.nombre}" loading="lazy"><br>` : '') + `${servA.img} <strong>${servA.nombre}</strong><br>${servA.precio}<br><em>${servA.variantes}</em>`,
      time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '✅ Elegir este' },
      { text: '⬅ Ver otros' },
      { text: '⬅ Menú' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '✅ Elegir este', time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '¿Qué duración?', time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: (servA.variantes_precio || [{opcion: servA.nombre, precio_label: servA.precio}]).slice(0, 4).map(v => ({ text: `${v.opcion} · ${v.precio_label}` })) },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: `${servA.variantes_precio[1].opcion} · ${servA.variantes_precio[1].precio_label}`, time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '¿Qué día te viene bien?', time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: 'Mañana' },
      { text: dia },
      { text: 'Próxima semana' },
      { text: '📅 Elegir fecha' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: dia, time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: `Estos son los huecos del ${dia.toLowerCase()}:`, time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: slotsDia.slice(0, 4).map(h => ({ text: `🕐 ${h}` })) },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: `🕐 ${slotElegido}`, time: '17:32', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '¿Con qué peluquera prefieres?', time: '17:32'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: `${peluquera}` },
      { text: 'Nuria' },
      { text: 'Me es igual' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: peluquera, time: '17:32', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `📋 <strong>Confirma tu cita</strong><br><br>${servA.img} ${servA.nombre}<br>Duración: ${servA.variantes_precio[1].opcion}<br>📅 ${dia} · 🕐 ${slotElegido}<br>✂️ Con ${peluquera}<br>👤 ${client} ✓ <em>(datos ya guardados)</em><br><br>──────────<br>Precio: <strong>${servA.variantes_precio[1].precio_label}</strong>`,
      time: '17:33'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '✅ Confirmar' },
      { text: '✏️ Editar' },
      { text: '❌ Cancelar' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '✅ Confirmar', time: '17:33', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `✅ <strong>Cita reservada</strong><br><br>Te mando recordatorio 24h antes para confirmar. Si no puedes venir, avísame aquí mismo y libero el hueco. Gracias ${clientFirst} 💛`,
      time: '17:33'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [{ text: '⬅ Menú' }] },

    // Marta toca "⬅ Menú" y vuelve al menú principal
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '⬅ Menú', time: '17:34', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: `¿Algo más, ${clientFirst}?`, time: '17:34'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: MENU_CLIENTE },

    // ═════════════════════════════════════════════════════════
    // 2. VENDEDOR RECIBE LA CITA
    // ═════════════════════════════════════════════════════════
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'date', payload: '🔔 NUEVA CITA EN AGENDA' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `🔔 <strong>Nueva cita</strong><br><br>${servA.img} ${servA.nombre}<br>📅 ${dia} · 🕐 ${slotElegido} (${servA.variantes_precio[1].opcion})<br>✂️ Contigo (${peluquera})<br><br>👤 <strong>${client}</strong> · 📱 666 123 456<br>⭐ Cliente habitual · 7 visitas · última 15 sept<br>📝 <em>Prefiere balayage caliente · lavado con mascarilla hidratante</em><br><br>Precio: <strong>${servA.variantes_precio[1].precio_label}</strong>`,
      time: '17:33'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✅ Confirmar' },
      { text: '📅 Cambiar hora' },
      { text: '📞 Llamar' },
      { text: '🚫 Rechazar' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '✅ Confirmar', time: '17:33', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `✓ Cita en agenda. ${clientFirst} ha recibido la confirmación.<br><br>⏰ Recordatorio automático programado para el ${dia.toLowerCase()} a las ${(parseInt(slotElegido)-24+'').padStart(2,'0') === 'NaN' ? '10:00' : '10:00'} del día antes.`,
      time: '17:34'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [{ text: '⬅ Menú' }] },

    // ═════════════════════════════════════════════════════════
    // 3. RECORDATORIO 24H ANTES (cliente recibe)
    // ═════════════════════════════════════════════════════════
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'date', payload: '📤 24H ANTES · RECORDATORIO' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `Hola ${clientFirst} 👋<br><br>Recordatorio: mañana <strong>${dia.toLowerCase()}</strong> a las <strong>${slotElegido}</strong> tienes ${servA.nombre.toLowerCase()} con ${peluquera}.<br><br>¿Confirmas?`,
      time: '10:00'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '✅ Confirmo' },
      { text: '📅 Cambiar hora' },
      { text: '❌ No podré' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '✅ Confirmo', time: '10:01', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: `Perfecto, te esperamos ${clientFirst} 💛`, time: '10:01'
    }},

    // ═════════════════════════════════════════════════════════
    // 4. VENDEDOR — MENÚ RAÍZ (gestión diaria)
    // ═════════════════════════════════════════════════════════
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'date', payload: '📅 GESTIÓN DIARIA' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '¿Qué quieres hacer?', time: '09:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: MENU_ADMIN },

    // ─── 4a. AGENDA HOY ───
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📅 Agenda hoy', time: '09:00', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>📅 Hoy ${dia.toLowerCase()}</strong><br><br>🕐 10:30 — Carmen G. · Mechas balayage<br>🕐 ${slotElegido} — ${client} · ${servA.nombre}<br>🕐 13:00 — Nuria L. · Color global<br>⚠️ 16:30 — <em>HUECO LIBRE</em><br>🕐 17:30 — Patricia M. · Corte caballero<br>🕐 19:00 — Beatriz R. · Botox capilar<br><br>Facturación prevista: <strong>187€</strong>`,
      time: '09:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '⬅ Menú' },
    ]},

    // ═════════════════════════════════════════════════════════
    // 6. ANALÍTICA
    // ═════════════════════════════════════════════════════════
    { chat: 'admin', action: 'reply-buttons', payload: [{ text: '📊 Analítica' }, { text: '⬅ Menú' }] },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📊 Analítica', time: '09:10', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '¿Qué periodo?', time: '09:10'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: 'Hoy' },
      { text: 'Esta semana' },
      { text: 'Este mes' },
      { text: '🏆 Top servicios' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: 'Esta semana', time: '09:10', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>📊 Esta semana</strong><br><br>📅 42 citas atendidas<br>💰 1.280€ facturado<br>🚫 2 no presentados<br>🎉 3 huecos rellenados<br>🏆 Top: Corte+lavado (14 citas)<br>⭐ 4 reseñas nuevas · 5★ todas<br>👥 2 clientes nuevas`,
      time: '09:11'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [{ text: '⬅ Menú' }] },

    // ═════════════════════════════════════════════════════════
    // 7. POST-SERVICIO: RESEÑA AUTOMÁTICA + REFERIDO
    //    (sin interacción admin: todo automático)
    // ═════════════════════════════════════════════════════════

    // ─── Cliente recibe push reseña 24h después ───
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'date', payload: '📤 24H DESPUÉS · RESEÑA' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `Hola ${clientFirst} 👋 Ayer te atendimos.<br><br>${skin.cta_resena_text}`,
      time: '10:00'
    }},
    { chat: 'patient', action: 'url-button', payload: '⭐ Dejar reseña en Google' },

    // ─── Compartir / referido ───
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `🙌 ¡Gracias ${clientFirst}! Reseña recibida ⭐⭐⭐⭐⭐<br><br>Si conoces a alguien a quien le gustaría venir, ¿nos recomiendas?`,
      time: '10:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '📣 Compartir con amig@' },
      { text: '⬅ Menú' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '📣 Compartir con amig@', time: '10:02', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `📩 <strong>Mensaje listo para reenviar</strong><br><br><em>"Te recomiendo ${g.toLowerCase()}. Puedes reservar cita por WhatsApp aquí: wa.me/346XXXXXXX"</em>`,
      time: '10:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '↗️ Reenviar ahora' },
      { text: '⬅ Menú' },
    ]},

    // ═════════════════════════════════════════════════════════
    // 8. MAPA DE CAPACIDADES (resumen final — todo lo que gestiona)
    // ═════════════════════════════════════════════════════════
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'date', payload: '🎯 TODO LO QUE GESTIONA' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>Lo que acabas de ver es un ejemplo.</strong><br>Esto es todo lo que tu asistente puede gestionar por ti:<br><br><strong>🗓️ AGENDA</strong><br>📅 Reservas 24/7<br>⏰ Recordatorios 24h antes<br>🔄 Mover y cancelar citas<br>📝 Lista de espera (solo quien lo pide)<br>🏖️ Vacaciones y horarios especiales<br><br><strong>👤 CLIENTES</strong><br>📋 Ficha completa (color, alergias, notas)<br>📸 Fotos antes/después por cliente<br>🎂 Felicitación cumpleaños con oferta<br>💤 Reactivar clientes que no vuelven<br>🎁 Puntos de fidelidad (10ª cita gratis)<br><br><strong>📈 CRECIMIENTO</strong><br>🎨 Catálogo + precios siempre al día<br>🖼️ Galería pública de trabajos<br>⭐ Reseñas Google automáticas<br>🔁 Rebooking automático ("toca retoque")<br>📣 Novedades solo a clientes suscritas<br>📊 Estadísticas día / semana / mes<br><br>Todo por el WhatsApp que ya usas. Sin apps extra.`,
      time: '13:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✅ Me interesa, cuéntame más' },
      { text: '⬅ Volver al inicio' },
    ]},
  ];
}

// ─────────────────────────────────────────────────────────────
// FLOW PRODUCTO (panadería, charcutería, zapatería, floristería, boutique)
// ─────────────────────────────────────────────────────────────
function buildStepsProducto(skin) {
  const g = skin.negocio_name;
  const client = skin.cliente_name;
  const clientFirst = client.split(' ')[0];
  const cats = skin.categorias;
  const p = skin.productos_sample;
  const nov = skin.novedad_sample;
  const prodA = p[0];
  const prodHogaza = p[2] || p[1];

  // Labels configurables por skin (defaults = producto/encargo)
  const L = Object.assign({
    accion_cliente:   '📦 Hacer encargo',
    pregunta_cat:     '¿De qué categoría?',
    pregunta_variante:'¿Para cuántas personas?',
    pregunta_fecha:   '¿Para cuándo la necesitas?',
    opciones_fecha:   ['Mañana', 'Fin de semana', '📅 Otra fecha'],
    pregunta_entrega: '¿Dónde la quieres?',
    skip_entrega:     false,
    pregunta_pref:    '¿Qué sabor prefieres?',
    opciones_pref:    ['Chocolate', 'Fruta', 'Mix', '✍️ Lo escribo'],
    label_pref_libre: 'Chocolate con fresas · texto "Feliz Cumple Luis"',
    titulo_confirma:  'Confirma tu encargo',
    linea_resumen:    '📅 Sábado · 🛵 Envío a domicilio',
    nota_pref:        'Chocolate con fresas, "Feliz Cumple Luis"',
    linea_entrega:    'Envío a domicilio · +3€',
    pretotal_variante:'Tarta 12 personas · <strong>52€</strong><br>Envío a domicilio · <strong>3€</strong>',
    total_label:      'TOTAL: 55€',
    confirmacion_cli: 'Encargo recibido',
    confirmacion_cli_sub: 'Te avisamos aquí mismo cuando esté listo',
    aviso_vendedor:   'Nuevo encargo · 55€',
    aviso_vendedor_detalle: `${prodA.img} ${prodA.nombre} — 12 personas · 52€<br>📅 Sábado · 🛵 Envío a domicilio · +3€<br>📝 Chocolate con fresas, "Feliz Cumple Luis"`,
    emoji_entrega:    '🛵',
    variante_elegida_label: '12 personas · 52€',
  }, skin.labels || {});

  // Menús raíz reutilizables
  const MENU_CLIENTE = [
    { text: '🛍️ Ver productos' },
    { text: L.accion_cliente },
    { text: '🕐 Horario' },
    { text: '📍 Dónde estamos' },
    { text: '❓ Preguntar' },
    { text: '👤 Mis pedidos' },
  ];
  const MENU_ADMIN = [
    { text: '📦 Pedidos' },
    { text: '📣 Novedad' },
    { text: '🚫 Stock' },
    { text: '⭐ Reseñas' },
    { text: '📊 Analítica' },
    { text: '⚙️ Más' },
  ];

  return [
    // ═════════════════════════════════════════════════════════
    // 1. CLIENTE HACE ENCARGO (botón-first con 2 momentos texto)
    // ═════════════════════════════════════════════════════════
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'date', payload: '💬 CLIENTE PIDIENDO' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `👋 ¡Hola <strong>${clientFirst}</strong>! Bienvenida de nuevo a <strong>${g}</strong>.<br><em>Tu última cita fue el 15 sept — balayage con ${peluquera} 💛</em><br><br>¿Qué necesitas?`,
      time: '17:30'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: MENU_CLIENTE },

    // Cliente elige "Hacer encargo"
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: L.accion_cliente, time: '17:30', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: L.pregunta_cat, time: '17:30'
    }},
    { chat: 'patient', action: 'list-message', payload: {
      btnText: 'Ver categorías',
      sheetTitle: 'Categorías',
      sections: [{ header: 'Elige una', items: cats.map(c => ({ text: c.label, sub: c.sub })) }]
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: cats[2] ? cats[2].label : cats[0].label, time: '17:30', read: true
    }},
    { chat: 'patient', action: 'typing' },
    (function(){
      // Productos de la categoría elegida (tartas por defecto)
      const catKey = cats[2] ? cats[2].key : cats[0].key;
      const prodsCat = p.filter(x => x.cat === catKey);
      const label = cats[2] ? cats[2].label : cats[0].label;
      const priceLabel = x => (x.variantes_precio && x.variantes_precio.length > 1) ? `desde ${x.variantes_precio[0].precio_label}` : x.precio;
      const listado = prodsCat.map(x => `${x.img} <strong>${x.nombre}</strong> · ${priceLabel(x)}`).join('<br>');
      return { chat: 'patient', action: 'msg', payload: {
        dir: 'in',
        text: `<strong>${label}</strong><br><br>${listado}<br><br>Toca el que quieras encargar:`,
        time: '17:31'
      }};
    })(),
    (function(){
      const catKey = cats[2] ? cats[2].key : cats[0].key;
      const prodsCat = p.filter(x => x.cat === catKey);
      const priceLabel = x => (x.variantes_precio && x.variantes_precio.length > 1) ? `desde ${x.variantes_precio[0].precio_label}` : x.precio;
      return { chat: 'patient', action: 'list-message', payload: {
        btnText: 'Elegir producto',
        sheetTitle: 'Productos',
        sections: [{
          header: 'Toca para encargar',
          items: prodsCat.map(x => ({ text: `${x.img} ${x.nombre}`, sub: priceLabel(x) }))
        }]
      }};
    })(),
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: `${prodA.img} ${prodA.nombre}`, time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `${prodA.img} <strong>${prodA.nombre}</strong><br>${prodA.precio}<br><em>${prodA.variantes}</em>`,
      time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '✅ La quiero' },
      { text: '⬅ Volver a la lista' },
      { text: '⬅ Menú' },
    ]},

    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '✅ La quiero', time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: L.pregunta_variante, time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: (prodA.variantes_precio || [{opcion:'estándar',precio_label:prodA.precio}]).slice(0,4).map(v => ({ text: `${v.opcion} · ${v.precio_label}` })) },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: L.variante_elegida_label, time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: L.pregunta_fecha, time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [...L.opciones_fecha.map(f => ({ text: f })), { text: '⬅ Volver' }] },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: L.opciones_fecha[1] || L.opciones_fecha[0], time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: L.pregunta_entrega, time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: (skin.entregas || [{opcion:'🏪 Recoger en tienda',precio_label:'gratis'}]).map(e => ({ text: `${e.opcion} · ${e.precio_label}` })) },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: (skin.entregas && skin.entregas[1]) ? `${skin.entregas[1].opcion} · ${skin.entregas[1].precio_label}` : L.linea_entrega, time: '17:31', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: L.pregunta_pref, time: '17:31'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: L.opciones_pref.map(o => ({ text: o })) },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: L.opciones_pref[L.opciones_pref.length-1], time: '17:32', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '✍️ Cuéntame cómo la quieres', time: '17:32'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: L.label_pref_libre, time: '17:32', read: true, mark: 'free'
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: '✓ Anotado. ¿Me dices tu nombre?', time: '17:32'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: clientFirst + ' ' + client.split(' ')[1], time: '17:33', read: true, mark: 'free'
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in', text: `Gracias ${clientFirst}. ¿Y tu móvil para avisarte?`, time: '17:33'
    }},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '666 123 456', time: '17:33', read: true, mark: 'free'
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `📋 <strong>${L.titulo_confirma}</strong><br><br>${prodA.img} ${prodA.nombre} — ${L.variante_elegida_label}<br>${L.linea_resumen}<br>📝 ${L.nota_pref}<br>👤 ${client} · 📱 666 123 456<br><br>──────────<br>${L.pretotal_variante}<br><strong>${L.total_label}</strong>`,
      time: '17:33'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '✅ Confirmar' },
      { text: '✏️ Editar' },
      { text: '❌ Cancelar' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '✅ Confirmar', time: '17:33', read: true
    }},
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `✅ <strong>${L.confirmacion_cli}</strong><br><br>${L.confirmacion_cli_sub}. Gracias ${clientFirst} 💛`,
      time: '17:33'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [{ text: '⬅ Menú principal' }] },

    // ═════════════════════════════════════════════════════════
    // 2. VENDEDOR RECIBE EL ENCARGO
    // ═════════════════════════════════════════════════════════
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'date', payload: '🔔 LO VE EL PANADERO' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `🔔 <strong>${L.aviso_vendedor}</strong><br><br>${L.aviso_vendedor_detalle}<br>👤 ${client} · 📱 666 123 456<br><br>Cliente ya ha visto el precio total y lo acepta ✓`,
      time: '17:33'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✅ Confirmar al cliente' },
      { text: '📅 Reprogramar' },
      { text: '📞 Llamar' },
      { text: '🚫 Rechazar' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '✅ Confirmar al cliente', time: '17:33', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `✓ Confirmado. ${clientFirst} ha recibido tu confirmación.`,
      time: '17:34'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [{ text: '⬅ Menú principal' }] },

    // ═════════════════════════════════════════════════════════
    // 3. VENDEDOR — MENÚ RAÍZ (gestión diaria)
    // ═════════════════════════════════════════════════════════
    { chat: 'admin', action: 'date', payload: '📦 GESTIÓN DIARIA' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '¿Qué quieres hacer?', time: '09:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: MENU_ADMIN },

    // ─── 3a. STOCK: marcar agotado ───
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '🚫 Stock', time: '09:00', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '¿Qué quieres hacer con el stock?', time: '09:00'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '🚫 Marcar agotado' },
      { text: '✅ Reponer' },
      { text: '✏️ Editar precio' },
      { text: '⬅ Menú' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '🚫 Marcar agotado', time: '09:00', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '¿Qué producto?', time: '09:00'
    }},
    { chat: 'admin', action: 'list-message', payload: {
      btnText: 'Elegir producto',
      sheetTitle: 'Productos activos',
      sections: [{
        header: 'Toca el que se agotó',
        items: p.slice(0, 4).map(x => ({ text: x.nombre, sub: x.precio }))
      }]
    }},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: prodHogaza.nombre, time: '09:01', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `✓ <strong>${prodHogaza.nombre}</strong> marcada como agotada.<br><br>Visible en tu catálogo al instante — si un cliente la pide, te aviso.`,
      time: '09:01'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '🚫 Otro producto' },
      { text: '⬅ Menú principal' },
    ]},

    // ─── 3b. NOVEDAD: broadcast ───
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📣 Novedad', time: '09:05', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '¿Qué tipo de novedad?', time: '09:05'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '📷 Producto nuevo' },
      { text: '🎉 Oferta' },
      { text: '📅 Horario especial' },
      { text: '⬅ Menú' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📷 Producto nuevo', time: '09:05', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '📷 Envíame foto + un mensaje corto.', time: '09:05'
    }},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📎 [foto_roscones.jpg]', time: '09:06', read: true, mark: 'free'
    }},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: nov.titulo + '\n\n' + nov.cuerpo, time: '09:06', read: true, mark: 'free'
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: '¿Mandar a tus <strong>47 suscriptores</strong>?',
      time: '09:06'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: '✅ Enviar' },
      { text: '✏️ Editar' },
      { text: '❌ Cancelar' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '✅ Enviar', time: '09:06', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: '📤 <strong>Enviado a 47 clientes</strong>.<br>Te aviso aquí cuando respondan.',
      time: '09:06'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [{ text: '⬅ Menú principal' }] },

    // ─── 3c. Cliente recibe la novedad ───
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `📷 <strong>${nov.titulo}</strong><br><br>${nov.cuerpo}`,
      time: '09:06'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '✅ Resérvame uno' },
      { text: '👀 Ver más' },
      { text: '⬅ Menú' },
    ]},

    // ═════════════════════════════════════════════════════════
    // 4. ANALÍTICA DÍA + SEMANA
    // ═════════════════════════════════════════════════════════
    { chat: 'switch', payload: 'admin' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: '📊 Analítica', time: '09:10', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in', text: '¿Qué periodo?', time: '09:10'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: 'Hoy' },
      { text: 'Esta semana' },
      { text: 'Este mes' },
      { text: '🏆 Top productos' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: 'Hoy', time: '09:10', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>📊 Hoy</strong><br><br>📦 3 encargos<br>💰 142€ facturado<br>🎂 Más pedido: ${prodA.nombre}<br>⭐ 1 reseña nueva (5★)<br>👥 1 cliente nuevo`,
      time: '09:10'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: 'Esta semana' },
      { text: '⬅ Menú' },
    ]},
    { chat: 'admin', action: 'msg', payload: {
      dir: 'out', text: 'Esta semana', time: '09:11', read: true
    }},
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `<strong>📊 Esta semana</strong><br><br>📦 11 encargos<br>💰 420€ facturado<br>🏆 ${prodA.nombre} (5)<br>⭐ 3 reseñas nuevas (5★·5★·4★)<br>👥 2 clientes nuevos`,
      time: '09:11'
    }},
    { chat: 'admin', action: 'reply-buttons', payload: [
      { text: 'Este mes' },
      { text: '⬅ Menú principal' },
    ]},

    // ═════════════════════════════════════════════════════════
    // 5. ENTREGA + PUSH RESEÑA
    // ═════════════════════════════════════════════════════════
    { chat: 'admin', action: 'date', payload: '✅ RECOGIDO · PIDE RESEÑA' },
    { chat: 'admin', action: 'typing' },
    { chat: 'admin', action: 'msg', payload: {
      dir: 'in',
      text: `🔔 <strong>${clientFirst} ha pasado a recoger</strong><br><br>${prodA.img} ${prodA.nombre}<br><br>¿Marco entregado?`,
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
      text: `✓ Pedido cerrado.<br>⏳ Push reseña programado para mañana 12:00.`,
      time: '12:01'
    }},

    // ─── 5b. Cliente recibe push ───
    { chat: 'switch', payload: 'patient' },
    { chat: 'patient', action: 'date', payload: '📤 24H DESPUÉS · PIDE RESEÑA' },
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `Hola ${clientFirst} 👋 Ayer recogiste <strong>${prodA.nombre}</strong>.<br><br>${skin.cta_resena_text}`,
      time: '12:00'
    }},
    { chat: 'patient', action: 'url-button', payload: '⭐ Dejar reseña en Google' },

    // ─── 5c. Tras reseña: compartir ───
    { chat: 'patient', action: 'typing' },
    { chat: 'patient', action: 'msg', payload: {
      dir: 'in',
      text: `🙌 ¡Gracias ${clientFirst}! Reseña recibida ⭐⭐⭐⭐⭐<br><br>Si conoces a alguien a quien le gustaría, ¿nos recomiendas?`,
      time: '12:02'
    }},
    { chat: 'patient', action: 'reply-buttons', payload: [
      { text: '📣 Compartir con amig@' },
      { text: '⬅ Menú' },
    ]},
    { chat: 'patient', action: 'msg', payload: {
      dir: 'out', text: '📣 Compartir con amig@', time: '12:02', read: true
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
    if (s.payload.mark === 'free') div.classList.add('free-text');
    const meta = s.payload.read
      ? `<span class="meta">${s.payload.time} <span class="check">✓✓</span></span>`
      : `<span class="meta">${s.payload.time}</span>`;
    const freeIcon = s.payload.mark === 'free' ? '<span class="free-icon" title="texto libre">✍️</span> ' : '';
    div.innerHTML = freeIcon + s.payload.text.replace(/\n/g, '<br>') + meta;
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
