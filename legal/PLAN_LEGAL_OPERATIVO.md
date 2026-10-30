# 📋 Plan Legal Operativo · Dyael Asistente (bot WhatsApp pymes)

**Autor:** Marc · **Última actualización:** 2026-10-31
**Contexto:** validación de bot WhatsApp para peluquerías (y otros verticales de servicio con cita)
**Restricción personal clave:** Marc tiene contrato tecnólogo UJI con **Ley 53/1984 activa hasta 31/12/2026**. No puede facturar ni ejercer actividad lucrativa privada hasta esa fecha salvo autorización expresa.

---

## 🎯 ÍNDICE

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Fase 0 — Validación beta sin facturar (ahora → enero 2027)](#2-fase-0--validación-beta-sin-facturar-ahora--enero-2027)
3. [Fase 1 — Primera venta real (desde enero 2027)](#3-fase-1--primera-venta-real-desde-enero-2027)
4. [Fase 2 — Escalado (10+ clientes)](#4-fase-2--escalado-10-clientes)
5. [Riesgos legales técnicos (WhatsApp, GDPR, Meta)](#5-riesgos-legales-técnicos)
6. [Flujos permitidos vs prohibidos](#6-flujos-permitidos-vs-prohibidos)
7. [Documentos legales mínimos (checklist)](#7-documentos-legales-mínimos-checklist)
8. [Templates incluidos en este pack](#8-templates-incluidos-en-este-pack)
9. [Opciones de facturación durante UJI](#9-opciones-de-facturación-durante-uji)
10. [Decisiones pendientes](#10-decisiones-pendientes)

---

## 1. Resumen ejecutivo

**Qué puedes hacer AHORA (hasta 31/12/2026):**
- Validar producto con beta gratis
- Hacer outreach B2B (interés legítimo)
- Dar demos sin contrato
- Recoger leads interesados
- Montar infraestructura técnica
- Preparar documentación legal lista para activar en enero

**Qué NO puedes hacer AHORA:**
- Facturar bajo tu nombre
- Firmar contratos de servicio como persona física/jurídica tuya
- Cobrar (ni en efectivo, ni tarjeta, ni Bizum)
- Montar SL a tu nombre sin autorización UJI

**Qué pasa el 1 de enero 2027:**
- Fin incompatibilidad UJI
- Alta en Smart Ibérica (cooperativa) o autónomo RETA
- Activación legal completa + facturación

---

## 2. Fase 0 — Validación beta sin facturar (AHORA → enero 2027)

### 2.1 Qué comunicar a los peluqueros

Al cerrar un cliente beta, SIEMPRE dejar claro desde el inicio:

> *"Estamos en fase beta. Los primeros 10-20 clientes probáis gratis sin compromiso. En enero/febrero pasamos a modelo de pago (19€/mes). Vosotros tendréis descuento de bienvenida permanente del 50% por ser early adopters. Si no queréis seguir, lo desactivamos y ya."*

**Por qué es importante decirlo así:**
- Evita publicidad engañosa (no "gratis para siempre")
- Fija expectativa de precio futuro (crea anchor)
- Da argumento de urgencia ("solo los primeros")
- Les hace sentir especiales (early adopters)

### 2.2 Qué documentos tener en Fase 0

**Mínimos (NO formales pero demostrables):**

- [ ] **Lista de contactos** (Excel/Sheets): nombre pelu, teléfono, email, fecha contacto, estado, respuesta
- [ ] **Acuerdo beta por escrito simple** (WhatsApp sirve) con cada peluquería:
  - Qué prueban
  - Período gratis acordado
  - Precio futuro
  - Que les llamarás antes de empezar a cobrar
  - Que pueden salir sin coste
- [ ] **Política de privacidad simple** (incluso en PDF) explicando qué datos guardas y cómo
- [ ] **Backup de todas las conversaciones comerciales** (WhatsApp, email)

**NO necesitas aún:**
- Alta autónomo
- Factura
- Contrato formal firmado notarialmente
- RGPD completo con delegado de protección datos

### 2.3 Qué infraestructura técnica montar en Fase 0

- [ ] MVP del bot (Baileys o similar) con 5 clientes beta máximo
- [ ] Panel admin básico para gestionar cada cliente
- [ ] Backup diario de datos
- [ ] Sistema de logs de seguridad (quién accede, cuándo)
- [ ] Separación lógica de datos entre clientes (ni compartir ni cruzar)
- [ ] Preparar migración futura a WhatsApp Business API oficial

### 2.4 Outreach legal durante Fase 0

**Permitido (base legal interés legítimo RGPD 6.1.f):**
- Mensaje WhatsApp B2B al número comercial de la peluquería
- Email B2B al email comercial (info@, hola@)
- Instagram DM a cuenta comercial
- LinkedIn mensaje directo

**Condiciones a cumplir:**
- [ ] Fuente de datos pública (Google Maps, directorio, web pelu)
- [ ] Mensaje personalizado (no plantilla copy-paste masivo)
- [ ] Opt-out visible en cada mensaje: *"si no te interesa, ignóralo o dime STOP"*
- [ ] Volumen: máx 20-30 mensajes/día por número personal (evitar ban WA)
- [ ] NO contactar números particulares (solo comerciales)
- [ ] NO comprar bases de datos (ilegal según LOPDGDD)

### 2.5 Plantilla outreach legal validada

**Primer contacto (paso 1):**

> Hola! He visto que **[NOMBRE PELUQUERÍA]** gestionáis citas/reservas por WhatsApp.
>
> Estoy en fase beta de un asistente que automatiza esto para peluquerías pequeñas: recordatorios 24h, fichas de cliente, reseñas Google. Mientras valido producto, los primeros clientes lo prueban gratis.
>
> ¿Tenéis 2 min para una pregunta rápida? No vengo a venderos nada hoy.
>
> *Si no te interesa, ignora este mensaje — no te vuelvo a escribir.*
>
> Marc

**Si responden positivo (paso 2):**

> Genial, te paso una demo de 1 min: [LINK vídeo]
>
> Lo que me interesaría saber: ¿esto resolvería un problema real de tu día a día o es ruido?

**Si siguen interesados (paso 3):**

> ¿Hacemos una call rápida de 10 min esta semana? Te enseño en vivo cómo funcionaría con TUS servicios y precios.
>
> Si te encaja, podrías entrar en la beta (primer mes gratis sin compromiso).

---

## 3. Fase 1 — Primera venta real (desde enero 2027)

### 3.1 Alta administrativa

**Elegir una vía antes del 1 de enero 2027:**

| Vía | Pros | Contras | Mi recomendación |
|---|---|---|---|
| **Smart Ibérica / Factoo** (cooperativa de facturación) | Alta inmediata, legal, ellos facturan por ti, retienen IRPF/IVA | 7-8% comisión sobre facturado, no eres "empresa" | ✅ **Mejor para primeros 6 meses** |
| **Autónomo RETA** | Más barato (0€ hasta ~85€/mes primer año tarifa plana) | Cuota mensual fija aunque no factures, trámites | OK si tienes >1k€ facturado/mes |
| **SL (Sociedad Limitada)** | Protección patrimonial, imagen pro | 3000€ capital + gestoría ~100€/mes + modelo IS | Solo si vas en serio con equipo |

### 3.2 Documentos legales obligatorios

Para empezar a facturar necesitas (templates adjuntos en pack):

- [ ] **Términos y Condiciones de Uso del Servicio** (ToS)
- [ ] **Política de Privacidad** (RGPD obligatorio)
- [ ] **Aviso Legal** (identificación del responsable)
- [ ] **Política de Cookies** (si tienes web)
- [ ] **DPA — Contrato de Encargo del Tratamiento** firmado con cada cliente peluquería
- [ ] **Registro de actividades de tratamiento** (RGPD art. 30)
- [ ] **Modelo de factura** (número correlativo, datos fiscales, IVA)

### 3.3 Obligaciones fiscales recurrentes

- IVA trimestral (modelo 303) — si eres autónomo
- IRPF trimestral (modelo 130) — si eres autónomo
- Resumen anual IVA (modelo 390)
- Resumen anual rendimientos (modelo 190)
- Declaración de operaciones con terceros (modelo 347) si clientes >3005€/año

Si vas vía Smart Ibérica, esto lo hacen ellos por ti.

---

## 4. Fase 2 — Escalado (10+ clientes)

### 4.1 Infraestructura pro

- [ ] **Migración WhatsApp Business API oficial** (abandona Baileys)
  - Verificación empresa en Meta Business Manager
  - BSP: Twilio, 360dialog, MessageBird o Vonage
  - Plantillas de mensaje a aprobar por Meta
- [ ] **Backups automatizados** externos (fuera de servidor principal)
- [ ] **Monitorización** de uptime, errores
- [ ] **Soporte** vía email + WhatsApp canal propio
- [ ] **Documentación cliente** (video tutoriales, FAQ)

### 4.2 Documentos extra

- [ ] **Seguro de Responsabilidad Civil Profesional** (~200-400€/año) — cubre si pierdes datos cliente
- [ ] **Nombre comercial registrado en OEPM** (~130€) — proteges "Dyael" o lo que uses
- [ ] **Marca registrada** (~750€ + tasas) — si vale la pena
- [ ] **Términos actualizados** reflejando nueva infraestructura
- [ ] **DPA con BSP** (Twilio es sub-encargado de tratamiento)

### 4.3 Compliance avanzado

- [ ] **AI Act europeo** compliance si usas LLM en el bot
  - Disclosure "estás hablando con un asistente automatizado"
  - No perfiling automático de usuarios
  - Transparencia sobre funcionamiento
- [ ] **Protocolo de brecha de seguridad** (RGPD art. 33)
- [ ] **Delegado de Protección de Datos (DPO)** — opcional, obligatorio si >250 empleados o datos sensibles masivos

---

## 5. Riesgos legales técnicos

### 5.1 WhatsApp / Meta

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Baileys baneo número cliente | Media (con volumen) | Alta (cliente pierde WA) | Migrar a API oficial antes de 10 clientes |
| Meta demanda por bulk messaging | Baja (solo si grande) | Catastrófica (cierre operación) | API oficial + plantillas aprobadas |
| Meta integra reservas nativas en WA | Alta (1-3 años) | Catastrófica | Ventana competitiva corta, actuar rápido |
| Cambio ToS WA | Alta | Media | Monitor cambios ToS trimestralmente |

### 5.2 GDPR / LOPDGDD

| Riesgo | Mitigación |
|---|---|
| Multa por falta de DPA | Firmar DPA con cada cliente ANTES de empezar servicio |
| Brecha de seguridad | Encriptación datos reposo + tránsito, backups separados, acceso restringido |
| Datos clientas sin consent | DPA deja claro que la pelu es "responsable" y tú "encargado" |
| Transferencia datos fuera UE | Elegir providers con servidores UE (AWS Frankfurt, GCP europe-west, OVH) |

### 5.3 Publicidad / Marketing

| Riesgo | Mitigación |
|---|---|
| Publicidad engañosa | Cumplir ofertas al literal · Letra pequeña legible |
| Uso marca WhatsApp | Disclaimer visible "no afiliado a Meta/WhatsApp" |
| Comparativa Booksy/Treatwell | Solo datos públicos verificables (precios, features públicas) |
| Testimoniales inventados | NUNCA. Usar testimonios reales con consentimiento firmado |

### 5.4 Spam / LSSI

| Riesgo | Mitigación |
|---|---|
| Multa por spam LOPDGDD (hasta 600k€) | Volumen bajo, personalizado, opt-out, B2B |
| Email spam | Interés legítimo + lista pública + unsubscribe en cada email |
| WhatsApp masivo detectado | Nunca >30/día por número, nunca mismo texto literal |

---

## 6. Flujos permitidos vs prohibidos

### ✅ PERMITIDO (con condiciones)

- Cold outreach WhatsApp B2B — con interés legítimo + opt-out + max 30/día
- Email marketing B2B a emails corporativos públicos
- Instagram DM a cuentas comerciales
- Facebook / Instagram Ads targeting peluquerías
- Beta gratis sin facturar
- Guardar datos clientas de pelus — con DPA firmado + consent de la pelu
- Comparativa con Booksy — con datos públicos verificables
- Dar demos sin contrato formal
- Mostrar interfaz tipo WhatsApp en demo — con disclaimer

### ❌ PROHIBIDO (te hunde si te pillan)

- Spam masivo con plantilla copiada (>30 msg idénticos/día)
- Comprar bases de datos de contactos
- Scraping de datos personales de clientas finales
- Hacerse pasar por "oficial de WhatsApp"
- Facturar sin estructura legal (durante UJI o sin alta)
- Guardar datos sin DPA
- Compartir datos entre clientes peluquerías
- Testimonios inventados
- Baileys en producción a escala (>10 clientes activos)
- Procesar pagos sin cumplir PCI DSS (usar Stripe/Mollie que absorben)
- Enviar mensajes a particulares (no comerciales)
- Prometer cosas que no cumples ("sin permanencia" si tienes permanencia)

---

## 7. Documentos legales mínimos (checklist)

### Antes del 1 enero 2027 (preparación)

- [ ] Decisión de estructura: Smart Ibérica vs Autónomo vs SL
- [ ] Reservar nombre comercial "Dyael Asistente" (o similar) — verificar en OEPM
- [ ] Templates ToS / Privacidad / DPA adaptados (incluidos en este pack)
- [ ] Comunicación beta clara a los early adopters
- [ ] Infraestructura técnica mínima (Baileys OK, pero planificar migración)
- [ ] Lista de contactos / leads (Excel)
- [ ] Acuerdo beta simple (WhatsApp sirve de prueba)

### Enero 2027 (activación)

- [ ] Alta Smart Ibérica o RETA
- [ ] Verificar empresa en Meta Business (si eliges API oficial)
- [ ] Publicar ToS / Privacy / Aviso Legal en web o landing
- [ ] Firmar DPA con cada cliente que entre en pago
- [ ] Primera factura ✅
- [ ] Modelo correcto fiscal según estructura

### A medio plazo (3-6 meses)

- [ ] Seguro RC Profesional
- [ ] Registro de actividades de tratamiento RGPD
- [ ] Nombre comercial OEPM
- [ ] Migración WA Business API oficial
- [ ] Si usas IA: compliance AI Act

---

## 8. Templates incluidos en este pack

Archivos .md en esta carpeta (`pilotolocal_legal/`):

1. `TEMPLATE_TOS.md` — Términos y Condiciones de Uso
2. `TEMPLATE_POLITICA_PRIVACIDAD.md` — Política de Privacidad RGPD
3. `TEMPLATE_DPA.md` — Contrato Encargo Tratamiento con pelu
4. `TEMPLATE_AVISO_LEGAL.md` — Aviso Legal
5. `TEMPLATE_ACUERDO_BETA.md` — Acuerdo informal beta (WhatsApp o email)
6. `TEMPLATE_PLANTILLA_OUTREACH.md` — Plantillas mensaje WhatsApp B2B
7. `TEMPLATE_DISCLAIMER_PUBLICIDAD.md` — Disclaimers para redes/anuncios

**IMPORTANTE**: estos templates son punto de partida. Antes de usar en producción con clientes de pago, **validar con abogado** (300-500€ consulta especializada tech/startup).

---

## 9. Opciones de facturación durante UJI (si surgiera urgencia)

Si antes de enero 2027 hay un cliente que QUIERE pagar YA:

| Opción | Cómo | Riesgos |
|---|---|---|
| **Esperar enero 2027** | Decirle "en enero empezamos a facturar, tú ya tienes el servicio gratis" | Ninguno |
| **Factura vía familiar (padre/madre)** autónomo o SL | Ellos facturan, tú operas | Fiscal (dinero no tuyo) + implica confianza total |
| **Smart Ibérica con autorización UJI** | Pedir permiso compatibilidad art. 14 Ley 53/1984 | UJI puede denegar |
| **Donar al cliente / sin cobrar** | Beta permanente para él | Pierdes ingresos |

**Mi recomendación**: espera enero. Es solo 2 meses. Si cierras en noviembre/diciembre, se queda en beta hasta enero y empieza pago entonces.

---

## 10. Decisiones pendientes

Marc tiene que decidir (y documentar aquí la decisión):

- [ ] **Nombre comercial definitivo**: ¿"Dyael Asistente"? ¿"TuAsistente"? ¿Otro?
- [ ] **Precio inicial**: 19€/mes · 29€/mes · freemium + 29€/mes?
- [ ] **Oferta inicial**: primer mes gratis · 50% descuento 3 meses · beta permanente?
- [ ] **Verticales a validar en paralelo**: solo peluquería · peluquería + fisio · ampliar más?
- [ ] **Estructura futura**: autónomo · cooperativa Smart · SL?
- [ ] **Enfoque infra técnica**: Baileys bajo riesgo · API oficial desde día 1?
- [ ] **Dominio web**: dyael.app · dyael-asistente.com · tuasistente.es?
- [ ] **Hostaje datos**: AWS Frankfurt · OVH · Hetzner (todos UE, cumplen GDPR)

---

## 📞 Contactos útiles para arrancar

- **Smart Ibérica**: smart-iberica.com — cooperativa facturación
- **Factoo**: factoo.es — alternativa cooperativa
- **Agencia Española Protección Datos (AEPD)**: aepd.es — consultas RGPD gratis
- **ENISA**: enisa.es — financiación startups (préstamos participativos)
- **OEPM** (Oficina de Patentes y Marcas): oepm.es — registro marcas
- **Twilio / 360dialog / MessageBird**: WhatsApp Business API providers

---

*Documento vivo. Actualizar según evolucione producto y legislación.*
