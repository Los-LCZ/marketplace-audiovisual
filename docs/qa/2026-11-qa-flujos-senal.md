# QA de flujos — Señal (noviembre 2026)

## Resumen

| | |
|---|---|
| Fecha | 31-oct-2026 23:02 → 1-nov-2026 ~01:30, y la sección G el 2-nov-2026 ~22:45 (hora de Chile) |
| Entorno | Producción: https://marketplace-audiovisual.vercel.app, con los datos demo cargados el 31-oct |
| Commit probado | `16efc61` (`main`) |
| Navegadores | Brave (escritorio, Windows), del tester, y el navegador integrado de Claude Desktop (Chromium), controlado por el QA lead |
| Dispositivos | Escritorio (~1900 px y ~980 px de ancho) y móvil emulado (375×812, más el modo responsive del tester) |
| Cuentas usadas | matias.perez, joaquin.herrera, diego.fuentes, camila.munoz, ana.rojas (todas `@senal-demo.test`) |

**Totales (39 casos):** ✅ 28 · ❌ 2 · ⚠️ 8 · ⏸️ 1 no ejecutado (B2).

**Errores encontrados:** 7. **Alta: 1** (E-05, redirección abierta en el login). Media: 2 (E-03, E-07). Baja: 4 (E-01, E-02, E-04, E-06).

**No ejecutado:** B2 (registro con un correo propio; es opcional y el tester decidió no hacerlo).

Leyenda: ✅ pasa · ❌ falla · ⚠️ funciona con problemas · ⏸️ no ejecutado · [M] probado también en móvil.

## A. Visitante sin sesión

| ID | Pasos | Esperado | Obtenido | Estado | Evidencia | Notas |
|---|---|---|---|---|---|---|
| A1 Portada [M] | Abrir `/` sin sesión en escritorio y móvil; cambiar de mundo; abrir una ficha desde la consola | Carga rápido, destacados, cambio de mundo, sin desbordes en móvil | Carga inmediata. Mundo Música: consola con 6 canales (Bellavista, Ensayo Irarrázaval, Ñuble, Control Room Matta, Bunker Macul, Barrio Italia), ordenados por rating. Mundo Audiovisual: visor con Set Ciclorama Recoleta primero. **Destacados:** Audiovisual → Set Ciclorama Recoleta (5,0) y Estudio Luz Norte (4,0); Música → Estudio Ñuble (4,5), como en el seed. "Abrir ficha" lleva a la ficha correcta. Si se cambia de mundo **estando en una ficha**, la ficha no cambia (solo el tema). | ⚠️ | Capturas de la portada (escritorio y móvil, ambos mundos), de los destacados y de la ficha de Cabina Bellavista | Al hacer scroll, el titular se ve nítido a través del encabezado fijo (E-01). En móvil, la línea "Tratamiento Acús…" de la consola se corta sin puntos suspensivos. Sin fotos, el visor se ve casi negro. |
| A2a Filtros | /explorar: tipo *Sala de ensayo*; comuna *Providencia*; precio; equipamiento | Cada filtro reduce bien los resultados y aparece como chip | Sala de ensayo → **3** (Irarrázaval, Bunker Macul, Barrio Italia). Providencia → **4** (Cabina Bellavista, Barrio Italia, Luz Norte y el espacio no demo "test"). Precio mínimo $20.000 → **8**, todos ≥ $20.000. Más *Consola Análoga* → **1** (Ñuble). Chips y "Limpiar todo" correctos. | ✅ | Capturas | |
| A2b Búsqueda por texto | Buscar `ñuble`, `providencia`, `50%_(x)` | Coincide sin distinguir mayúsculas; caracteres raros sin error | `ñuble` → **1** (Ñuble). `providencia` → **4**. `50%_(x)` → **0**, sin error. | ✅ | Capturas | El estado vacío sugiere "Quita algún equipamiento…", aunque solo se buscó texto. No se probó `nunoa` sin ñ. |
| A2c Comuna con comodín | Abrir `/explorar?commune=%25` | 0 resultados | **13** resultados y un chip "%" | ❌ | Captura con la URL | E-02 |
| A2d Orden | Mundo Música, sin filtros: Más recientes, Precio ↑, Precio ↓, Mejor valorados | Cada orden aplica sobre el catálogo completo | **Más recientes:** primero los 6 de Música y después Audiovisual ("· primero Música"). **Precio ↑:** Irarrázaval $8.000 → … → Galpón $60.000. **Precio ↓:** Galpón $60.000, Viñedo $50.000, test $50.000, Ciclorama $45.000… **Mejor valorados:** los de 5,0 (Bellavista, Irarrázaval, Ciclorama), Ñuble 4,5, Luz Norte y test 4,0, Azotea 3,0 y al final los 6 "Nuevo". | ✅ | Capturas de los 4 órdenes | La etiqueta "Más recientes" no describe el orden real (agrupa por mundo). |
| A2e Orden + filtro | Precio ↓ y después *Estudio de grabación* | Se mantiene el orden y la URL lo guarda | Matta $35.000 → Ñuble $25.000 → Bellavista $15.000; URL `?sort=precio-desc&category=recording_studio` | ✅ | Captura con la URL | |
| A2f Paginación | `/explorar?page=2` con 13 espacios (página de 24) | Estado vacío o volver a la página 1 | **"Algo salió mal · No pudimos cargar esta sección"** | ❌ | Captura | E-03. No se puede probar que el orden se mantenga entre páginas porque no hay más de 24 espacios (ver *Hallazgos de revisión de código*). |
| A3 Filtro por fecha | `/explorar?fecha=2026-11-03`; abrir Ñuble; otros días; fechas inválidas | Ñuble aparece el 3-nov; la ficha preselecciona el día y marca lo ocupado; las solicitudes no bloquean | 3-nov → **13**, incluido Ñuble, con chip "Mar 3 nov". La ficha abre en el **3**: 10–13 h libres, 14:00 "no caben 2 h", **15–17 h ocupado**, 18–21 h libres. Irarrázaval el 2-nov: 20–21 h **libres** (la solicitud de Joaquín no bloquea). Otras fechas futuras → 13; fecha pasada → 0. **`?fecha=2026-02-30` / `2026-13-01` → HTTP 500.** | ⚠️ | Lectura de la página y estado HTTP | E-04. Con los datos demo ningún día queda lleno, así que el filtro no excluye nada. /explorar no tiene selector de fecha. |
| A4 Ficha de espacio [M] | Ñuble e Irarrázaval, escritorio y 375 px | Fotos o placeholder, equipamiento, reglas, horario, reseñas, rating y enlace al anfitrión | Placeholder "Sin fotos"; precio, mínimo, horario, m², capacidad, comuna; infraestructura; equipamiento por grupos; "Antes de reservar". Reseñas 4,5 (2) = 4★ + 5★ ✔. Enlace a `/u/` de Ana ✔. En las salas de Diego: "Diego pide nota 4,0 como cliente para reservar directo…" ✔. Móvil sin scroll horizontal; "Elegir horario" abre una hoja modal. IDs inexistentes → 404. | ✅ | DOM y capturas en móvil | No se puede probar la paginación de reseñas (máx. 3 por espacio; páginas de 20). |
| A5 Perfil público de Ana | `/u/de000000-…0001` sin sesión | Espacios, estadísticas como anfitriona, distribución de estrellas, etiquetas, insignia de verificada, nunca el teléfono | "Identidad verificada", titular, bio y etiquetas. Como anfitriona: 3 reseñas, 4,7 (2×5★, 1×4★); etiquetas de reseñas; sus 3 espacios. **Sin teléfono** ni en la página ni en el HTML/payload RSC. | ✅ | Página y búsqueda en el HTML | Por código, `profiles` solo se puede leer como dueño, contraparte o admin; el perfil usa `public_profiles`. |
| A6 Rutas protegidas (parte 1) | Sin sesión: /descubrir, /perfil, /perfil/x, /mis-reservas, /dashboard, /espacios/nuevo, /espacios/[id]/editar | Redirigen a /login con `next` | Las 7 → `/login?next=<ruta>` | ✅ | `fetch` siguiendo redirecciones | `next` guarda solo el `pathname` (pierde los parámetros de búsqueda): `src/utils/supabase/middleware.ts:43`. |
| A6 Rutas protegidas (parte 2) | Sin sesión, /mis-reservas → login como joaquin.herrera | Volver a /mis-reservas | Quedó en `/mis-reservas` ("Hola, Joaquín") | ✅ | URL en el navegador | |

## B. Cuenta

| ID | Pasos | Esperado | Obtenido | Estado | Evidencia | Notas |
|---|---|---|---|---|---|---|
| B1 Login y logout | matias.perez desde `/login?next=/%5Cexample.com`: contraseña incorrecta, luego la correcta; después, logout | Login correcto, mensaje claro con contraseña incorrecta, logout | Con contraseña incorrecta, el mensaje indica que es incorrecta (según el tester). Con la correcta, **terminó en example.com** (E-05). Logout desde el menú de usuario → "Cerrar sesión" → `/login`. | ⚠️ | Relato del tester; URL y encabezado | Login y logout funcionan; ⚠️ por E-05. |
| B2 Registro | — | — | No ejecutado | ⏸️ | — | Opcional; requiere un correo propio. |
| B3 /perfil | matias.perez: etiquetas hasta 12, cambiar el titular, guardar, revisar /u/ y restaurar | Cambios visibles en /u/; máx. 12 etiquetas; sin auto-verificarse | Enter agrega la etiqueta sin enviar el formulario. Llega a "Etiquetas (12/12)" y la 13.ª se descarta sin aviso. Toast "Perfil actualizado"; /u/ muestra el titular y las etiquetas nuevas. Restaurado después. No hay campo de verificación ni de rol. | ✅ | DOM antes y después | La nota mínima del anfitrión está en /dashboard (`MinRatingForm`). En el servidor se valida máx. 12 etiquetas y `protect_profile_role` impide cambiar `verified`/`role`. |

## C. Reserva directa (matias.perez)

| ID | Pasos | Esperado | Obtenido | Estado | Evidencia | Notas |
|---|---|---|---|---|---|---|
| C1 Reserva directa | Cabina Bellavista, 4-nov de 12:00 a 14:00 | "Reserva confirmada"; total 2 × $15.000 + 10% = $33.000 | Resumen "$15.000 × 2 h $30.000 · Tarifa de servicio $3.000 · Total $33.000". Resultado: **"Sesión reservada"**; en /mis-reservas, **Confirmada**, $33.000. | ✅ | Captura y DOM | El texto es "Sesión reservada" en vez de "Reserva confirmada". |
| C2 Errores esperados | Ficha de Ñuble el 3-nov: inicio 13:00, intentar alargar; bloques fuera de horario o sobre la reserva de Camila | Mensaje claro en cada caso | La UI **impide** los tres casos antes de enviar: 15–17 h "ocupado", 14:00 y 22:00 "no caben 2 h", no hay bloques fuera de 10–23 h; con inicio a las 13:00, "Agregar una hora" y "Quitar una hora" quedan deshabilitados. | ✅ | Etiquetas accesibles del widget | Los mensajes de error del servidor no se pueden provocar desde la UI. |
| C3 /mis-reservas y cancelar | Cancelar la reserva de C1 y revisar la ficha | Aparece con su estado; cancelar libera el horario | Diálogo "¿Cancelar esta reserva?" → toast "Reserva cancelada" → Historial: **Cancelada**. En la ficha del 4-nov, 12–14 h vuelven a estar **disponibles**. | ✅ | DOM antes y después | |

## D. Solicitudes

| ID | Pasos | Esperado | Obtenido | Estado | Evidencia | Notas |
|---|---|---|---|---|---|---|
| D1 Solicitud | joaquin.herrera (sin reseñas): Irarrázaval, 4-nov de 18:00 a 20:00 | "Solicitud enviada", estado Solicitada | Aviso "El anfitrión pide nota 4,0 como cliente: tu reserva irá como solicitud" y botón **"Enviar solicitud"**. Resultado: **"Solicitud enviada"** ("…el horario sigue abierto para otros"). | ✅ | DOM | Las 14–16 h aparecen ocupadas por la reserva de Matías (D4) ✔. |
| D2 Panel de Diego | diego.fuentes: ver solicitudes; **rechazar** la del 2-nov y **aceptar** la del 4-nov | Muestra nombre, nota y cantidad de reseñas; las decisiones se aplican | "Solicitudes por revisar: 2"; tarjetas con "Joaquín Herrera · — · Sin calificaciones como cliente", mensaje, fecha y monto. Rechazar → **Rechazada** en Historial. Aceptar → **Confirmada** en Próximas. Ingresos del mes $16.000 → $32.000; ocupación 2 h → 4 h. | ⚠️ | DOM | Si la solicitud tiene proyecto, la tarjeta **no dice en qué sala es**. La cantidad de reseñas no aparece como número. |
| D3 Estados para el cliente | joaquin.herrera en /mis-reservas | Confirmada y Rechazada | 4-nov 18–20 h **Confirmada**; 2-nov 20–22 h **Rechazada** | ✅ | DOM | |
| D4 Cliente que cumple la nota | matias.perez (4,8): Irarrázaval, 4-nov de 14:00 a 16:00 | Confirmada directo | "Reserva directa: el anfitrión pide nota 4,0 y tú tienes 4,8" → "Sesión reservada", **Confirmada**, $17.600 | ✅ | DOM | Punto doble en "04:00 p. m..". |
| D5 KPI de respuesta | Panel de Diego antes y después de D2 | Refleja las decisiones (mediana y tasa) | "Sin datos" → **"2 h · Respondes el 100% a tiempo"** | ✅ | DOM | Cuadra con `get_host_response_stats`. Se muestra en horas. La RPC está concedida a `anon` para cualquier `p_host_id`; restringirla si el KPI no debe ser público. |

## E. Descubrir

| ID | Pasos | Esperado | Obtenido | Estado | Evidencia | Notas |
|---|---|---|---|---|---|---|
| E1 Mazo [M] | camila.munoz, Música: Solo a Ñuble, Mute a Bellavista, recargar | No aparecen espacios propios ni ya marcados; me gusta y descarte funcionan | Me gusta → aviso de match **"¡En sincronía!"** y Ñuble en "Tus me gusta". Mute → siguiente tarjeta. Al recargar, no vuelven ni Ñuble ni Bellavista. Tarjeta de Diego: "Reserva directa: pide 4,0 y tienes 4,3". | ⚠️ | DOM | En móvil 375×812, los botones del mazo quedan bajo la barra inferior (E-06). |
| E2 Indicador de match | joaquin.herrera, Música | Los espacios de Diego indican que no cumple la nota mínima | Irarrázaval: **"Pide nota 4,0 como cliente: irá como solicitud"**; los de Ana: "Reserva directa…" | ✅ | Texto de las tarjetas | |
| E3 Volver a ver todo | Vaciar el mazo de Música → "Volver a ver todo" | Recupera los descartados del mundo activo y mantiene los me gusta | "Revisaste todo Música" → toast **"5 espacios vuelven al mazo"**; Ñuble no vuelve (sigue en me gusta) | ✅ | DOM | |
| E4 Lista de me gusta [M] | Panel "Tus me gusta" y "Ver todo" | Lista los me gusta | El panel muestra Ñuble. "Ver todo" abre /mis-reservas en **Próximas**; los me gusta están en la pestaña **Matches**. En móvil se ve bajo el mazo, sin desborde. | ⚠️ | DOM, 375 px | "Ver todo" debería abrir Matches. |

## F. Anfitrión (ana.rojas)

| ID | Pasos | Esperado | Obtenido | Estado | Evidencia | Notas |
|---|---|---|---|---|---|---|
| F1 Crear espacio | /espacios/nuevo: "QA Sala Prueba (demo)" con horario, aforo, m², reglas, equipamiento y amenities. Inválidos: precio vacío + cierre antes de apertura; mínimo 4 h en horario de 2 h | Validaciones claras; se crea al corregir | **"Ingresa un precio en CLP (entero)"**, **"Debe ser posterior a la apertura"**, **"El mínimo de horas no cabe en el horario"**. Los datos se conservan. Al corregir (12–22 h, mín. 2 h), se crea como borrador y muestra todos los datos en la ficha. | ✅ | DOM | Espacio `a89dc267-8976-4018-9b05-618becd54523`. |
| F2 Editar y fotos | Subir jpg, png y webp; probar un archivo de 6 MB y un .gif; reordenar; cambiar la portada; borrar una; precio $9.500 | Suben las válidas y se rechazan las inválidas; el orden y la portada se guardan y se ven en /explorar | Suben 3/3. **"grande.jpg: supera los 5 MB"**, **"anim.gif: formato no permitido"**. Reordenar y portada → webp, png, jpg; borrar (con confirmación) → 2 fotos. En /explorar sin sesión: **$9.500** y portada **webp**. | ✅ | DOM, `fetch` sin cookies | Con 2 archivos inválidos a la vez solo se muestra el último error. |
| F3 Borrador / publicado / archivado | Cambiar el estado del espacio QA | Borrador y archivado no aparecen en /explorar ni en el perfil | Borrador y archivado: 0 en /explorar, no está en /u/, 404 para visitantes. Publicado: visible en los tres lugares. | ✅ | `fetch` con y sin sesión | El selector del panel no muestra toast. El espacio QA quedó archivado. |
| F4 Seguridad | Con matias.perez (cliente) y diego.fuentes (anfitrión): `/espacios/<Ñuble de Ana>/editar` | No debe dejar editar | Ambos → **404**. `/espacios/nuevo` con un cliente → "Solo los anfitriones pueden publicar espacios". Diego sí puede editar su propia sala. | ✅ | `fetch` con cada sesión | El backend también lo impide (RLS `spaces_update_own` y Storage por `auth.uid()`). |

## G. Calificación a ciegas

| ID | Pasos | Esperado | Obtenido | Estado | Evidencia | Notas |
|---|---|---|---|---|---|---|
| G1 (parte 1) | matias.perez reserva Cabina Bellavista el 1-nov de 09:00 a 10:00 | Confirmada; $15.000 + 10% = $16.500 | **Confirmada**, $16.500 | ✅ | Captura de /mis-reservas | A las 23:02 la próxima hora en punto (00:00) quedaba fuera del horario (9–23 h), así que se reservó la primera hora del día siguiente. |
| G1 (parte 2) | ana.rojas en /dashboard ~01:00 del 1-nov | "Completar" no disponible antes de que termine | Solo aparece "Cancelar reserva"; "0 por completar" | ✅ | DOM | Ingresos del mes de Ana: $90.000 (sin contar la cancelada) ✔. |
| G1 (parte 3) | 2-nov 22:45: antes de completar, revisar como Matías si todavía puede cancelar la reserva terminada; luego Ana la marca como Completada | Pasa a Completada; no se puede cancelar una reserva terminada | Matías: la reserva aparece en Historial como "Confirmada" con "Podrás calificarla cuando el anfitrión la marque como completada", **sin "Cancelar"**. Ana: sección "Por completar" con **"Marcar completada"** (sin "Cancelar") → diálogo "¿Marcar la sesión como completada? Ambos podrán calificarse a ciegas…" → toast **"Sesión completada"**; pasa a "Califica a tus clientes". | ✅ | DOM | La interfaz no ofrece cancelar una reserva terminada; el backend no se probó para no perder la reserva (ver *Hallazgos de revisión de código*). |
| G2 Calificación a ciegas | Matías califica Cabina Bellavista (4★, "Gran acústica" y "Anfitrión atento", comentario); luego Ana revisa su panel | Ana no ve la reseña, solo que ya calificó | Matías: formulario con estrellas etiquetadas ("4 estrellas, Muy buena"), etiquetas y comentario (máx. 2000). Después: "Ana aún no califica. Verás su reseña cuando la envíe o el **lun, 16 nov 2026**" (14 días). Ficha pública: sigue en **5,0 (1)**. Ana: **"Matías ya te calificó. Lo verás cuando envíes tu calificación."**; el comentario no aparece ni en la página ni en el HTML. | ✅ | DOM y HTML | Por código, RLS `reviews_select_visible` / `client_reviews_select_visible` ocultan la reseña hasta que se revele. Al enviar no aparece toast de confirmación. |
| G3 Revelación | Ana califica a Matías (5★, "Puntual", comentario) | Ambos ven las dos reseñas; el rating del espacio se actualiza; la reseña ya no es editable | El panel de Ana muestra "Tu calificación" y **"Matías calificó tu espacio"** (4★, sus etiquetas y comentario). Cabina Bellavista **5,0 (1) → 4,5 (2)**, con la reseña visible en la ficha pública. Ana como anfitriona **4,7 (3) → 4,5 (4)**. Matías como cliente: 5 reseñas, 4,8, con la reseña de Ana en su perfil. No hay opción de editar ni borrar. | ✅ | DOM; `fetch` sin sesión a la ficha y a los perfiles | No se volvió a iniciar sesión como Matías: la revelación se verificó en la ficha y los perfiles públicos. Por código, editar o borrar solo se permite mientras la reseña está oculta (`reviews_update_author_while_hidden`). |

## H. Generales

| ID | Pasos | Esperado | Obtenido | Estado | Evidencia | Notas |
|---|---|---|---|---|---|---|
| H1 Consola | Con sesión: /, /explorar, /descubrir, /mis-reservas, ficha y /dashboard | Sin errores | Sin errores nuevos. Los únicos (500, 404, React #441) vinieron de las URLs inválidas probadas a propósito (E-03, E-04 e IDs inexistentes). | ✅ | Consola del navegador integrado | |
| H2 Idioma, CLP y hora de Chile | Revisión transversal | Español, CLP y hora de Chile | Todo en español; montos en CLP con punto de miles; las fichas indican "hora de Chile". | ⚠️ | Capturas y DOM | **Formato de hora inconsistente:** /mis-reservas, el panel y los toasts usan 12 h ("02:00 p. m."); la ficha y el widget usan 24 h. Punto doble "p. m..". |
| H3 Rendimiento y accesibilidad | Tiempo del HTML (2 mediciones por página); teclado en la hoja de reserva y en el diálogo de cancelar | Páginas ágiles; foco y teclado correctos en diálogos | HTML en 0,5–1,3 s; /explorar con `?fecha=` es lo más lento (1,5–1,7 s). En los diálogos, Escape cierra, pero **Tab saca el foco del diálogo** y al cerrar el foco no vuelve al botón. | ⚠️ | `performance.now()`, teclado | E-07. `get_available_space_ids` hace un bucle plpgsql por espacio. |

## Errores encontrados

### E-05 · **Alta** (seguridad) · Frontend (server action y route handler) · Redirección abierta en el login
- **Reproducir:** abrir `/login?next=/%5Cexample.com` e iniciar sesión con cualquier cuenta.
- **Esperado:** volver a una ruta interna (o a `/`).
- **Obtenido:** el navegador termina en **https://example.com** (confirmado el 1-nov con matias.perez).
- **Hipótesis de causa:** `safeNext` (`src/app/auth/actions.ts:12-13`) solo exige que `next` empiece con `/` y no con `//`; `src/app/auth/callback/route.ts:9` hace lo mismo con el enlace de confirmación de correo. Los navegadores normalizan `/\example.com` a `//example.com` (URL relativa al protocolo), es decir, un dominio externo. Un atacante puede mandar un enlace real de Señal que, después de un login legítimo, lleve a un sitio de phishing.
- **Arreglo sugerido:** resolver con `const url = new URL(next, origin)` y aceptar solo si `url.origin === origin` (usar `url.pathname + url.search`); de lo contrario, `/`. Aplicarlo en los dos lugares.

### E-03 · Media · Backend (capa de consultas) · /explorar con una página fuera de rango muestra "Algo salió mal"
- **Reproducir:** `/explorar?page=2` (hoy hay 13 resultados y las páginas son de 24). También pasa con enlaces guardados a una página que deja de existir.
- **Esperado:** estado vacío con un enlace a la página 1, o redirigir a la última página válida.
- **Obtenido:** error boundary global (`src/app/error.tsx`).
- **Hipótesis de causa:** `listPublishedSpaces` pide `.range(24, 47)` con `count: "exact"` (`src/lib/queries/spaces.ts:141`). Si el offset supera el total, PostgREST responde 416 (`PGRST103`) y el código lanza `throw new Error("Error al listar espacios…")` (`:144`). Al cambiar los filtros no pasa porque `explore-controls.tsx:30` borra `page`.
- **Arreglo sugerido:** tratar `PGRST103` como lista vacía, o en `src/app/explorar/page.tsx` redirigir a `Math.ceil(total / PAGE_SIZE)` cuando `page` lo supera.

### E-07 · Media (accesibilidad) · Frontend · Los diálogos no atrapan el foco ni lo devuelven al cerrar
- **Reproducir:** en /dashboard o /mis-reservas, enfocar "Cancelar reserva" con el teclado → Enter → Tab ×5. Lo mismo con la hoja de reserva en móvil ("Elegir horario").
- **Esperado:** con `aria-modal="true"`, Tab recorre solo el diálogo; Escape cierra y el foco vuelve al botón que lo abrió.
- **Obtenido:** Tab sale del diálogo hacia "Explorar" en la barra superior con el diálogo abierto; al cerrar, el foco se queda en la barra.
- **Hipótesis de causa:** los componentes de diálogo y hoja (`.dialog` / `.sheet`, estilos en `src/styles/senal/controls.css:77-79`) declaran `role="dialog"` y `aria-modal`, pero no implementan la trampa de foco ni guardan el elemento que los abrió.
- **Arreglo sugerido:** `<dialog>` nativo con `showModal()` (trampa de foco e `inert` del fondo incluidos), o una trampa de foco más la restauración del `document.activeElement` previo al cerrar.

### E-01 · Baja · Frontend · El encabezado fijo deja ver nítido el contenido al hacer scroll
- **Reproducir:** portada, bajar ~100 px (escritorio o móvil).
- **Esperado:** el contenido bajo `.topbar` queda tapado o difuminado.
- **Obtenido:** el kicker y el titular "Súbele el…" se leen nítidos detrás del logo y del menú.
- **Hipótesis de causa:** `.topbar` (`src/styles/senal/chrome.css:4-12`) usa un fondo al 78% más `backdrop-filter: blur(14px)`, pero en las capturas no se ve el difuminado (posible contexto que lo anula, por ejemplo la View Transition del cambio de mundo). Con un 22% de transparencia, el titular de 120 px se sigue leyendo.
- **Arreglo sugerido:** subir la opacidad del fondo al 92–95% (como `.mbar`) y verificar que el `backdrop-filter` esté activo.

### E-02 · Baja · Backend (capa de consultas) · El filtro de comuna interpreta `%` y `_` como comodines
- **Reproducir:** `/explorar?commune=%25`.
- **Esperado:** 0 resultados.
- **Obtenido:** los 13 espacios, con el chip "%".
- **Hipótesis de causa:** `query.ilike("commune", filters.commune)` (y lo mismo con `city`) sin escapar los comodines (`src/lib/queries/spaces.ts:122-123`); `buildSearchFilter` sí los escapa (`:79`).
- **Arreglo sugerido:** escapar `\`, `%` y `_` antes del `ilike` (reutilizar el escape de `buildSearchFilter`). Solo muestra resultados de más; no expone datos.

### E-04 · Baja · Frontend (parseo de parámetros) · Una fecha inexistente con formato válido rompe /explorar
- **Reproducir:** `/explorar?fecha=2026-02-30` o `?fecha=2026-13-01`.
- **Esperado:** ignorar la fecha o mostrar un aviso.
- **Obtenido:** HTTP 500, "Algo salió mal".
- **Hipótesis de causa:** `parseDateParam` (`src/lib/search-params.ts:66-69`) solo valida `/^\d{4}-\d{2}-\d{2}$/`; la RPC `get_available_space_ids(p_date date)` falla al convertirla y `listPublishedSpaces` lanza la excepción.
- **Arreglo sugerido:** construir la fecha y comprobar que año, mes y día coincidan; si no, devolver `undefined`.

### E-06 · Baja · Frontend · En móvil, los botones del mazo de Descubrir quedan bajo la barra inferior
- **Reproducir:** /descubrir con sesión, viewport 375×812.
- **Esperado:** Mute / Reservar ya / Solo visibles y pulsables sin scroll.
- **Obtenido:** los botones están en y = 724–790 y `.tabbar` empieza en y = 750; `elementFromPoint` en el centro de "Solo" devuelve la barra (el toque va a la navegación).
- **Hipótesis de causa:** el alto del mazo no descuenta la barra inferior (`src/styles/senal/chrome.css:34`); el `padding-bottom: 68px` de `body` no lo corrige.
- **Arreglo sugerido:** alto de la tarjeta con `calc(100svh - topbar - tabbar - botones)` o `.deck-btns` fijos sobre la barra en móvil.

## Hallazgos de revisión de código (no verificados en la prueba)

- **Un cliente puede cancelar una reserva ya empezada o terminada:** la rama del cliente en `guard_booking_update` (`supabase/migrations/20261031160100_booking_requests.sql`) acepta `cancelled` desde `confirmed` sin comparar con `start_time`, aunque la UI dice "Puedes cancelar antes del inicio". Después de la sesión, y antes de que el anfitrión la complete, el cliente podría cancelarla (y evitar la calificación). En G1 se comprobó que **la interfaz no ofrece cancelar** una reserva terminada (ni al cliente ni a la anfitriona), así que hoy solo sería explotable llamando directo a la API de Supabase. No se probó en el backend para no perder la reserva de G. Si se confirma, sería de severidad **media** (backend).
- **El orden por mundo se aplica solo dentro de cada página:** con el orden por defecto, `src/app/explorar/page.tsx:43-48` reordena la página actual con el mundo activo primero. Con más de 24 resultados, la página 2 vuelve a empezar con el mundo activo. No se puede reproducir con 13 espacios.
- **KPI de respuesta público:** `get_host_response_stats` tiene `grant execute … to anon` y acepta cualquier `p_host_id`.

## Mejoras futuras

**UX y textos**
- Unificar la hora en 24 h (Chile) en /mis-reservas, el panel, los toasts y la confirmación; corregir el punto doble "p. m..".
- Panel del anfitrión: mostrar siempre **el espacio** en la tarjeta de solicitud (hoy, si hay proyecto, no se sabe qué sala es) y la cantidad de reseñas del cliente como número.
- Orden por defecto: renombrar "Más recientes" a "Recomendados" (agrupa por mundo) u ofrecer un "Más recientes" real.
- Estado vacío de /explorar: adaptar el mensaje a los filtros activos (hoy siempre habla de equipamiento y precio).
- /explorar: agregar un selector de fecha (hoy solo se elige desde la portada).
- Descubrir: "Ver todo" de "Tus me gusta" debería abrir `/mis-reservas` en la pestaña Matches; el aviso de match dice "Tu nota cumple lo que pide Ana" aunque Ana no exige nota.
- Selector de mundo en una ficha: no tiene efecto visible (`WorldSwitch` solo hace `router.refresh()`). Evaluar llevar a la portada o a /explorar del mundo elegido.
- Clientes: no hay forma de convertirse en anfitrión, aunque la portada y el perfil muestran "Publicar mi espacio".
- /perfil: avisar "Máximo 12 etiquetas" en lugar de descartar la 13.ª sin aviso.
- Panel: confirmar con un toast el cambio de estado de un espacio y advertir si tiene reservas futuras al pasarlo a Borrador o Archivado.
- Tarjetas del catálogo: la barra segmentada de colores no tiene leyenda.
- Sin fotos, el visor de la portada (Audiovisual) se ve negro; usar un placeholder con la categoría.
- Mensaje de reserva directa: "Sesión reservada" frente a "Reserva confirmada" del README; alinear la redacción.
- Calificaciones: al enviar no hay toast de confirmación (el formulario simplemente desaparece). Las etiquetas del formulario ("Gran acústica", "Anfitrión atento") no coinciden con las del seed ("acústica", "puntual"), lo que separa las estadísticas de etiquetas del perfil; usar un vocabulario único. La base permite editar la reseña mientras está oculta, pero la UI no ofrece esa opción.

**Accesibilidad**
- Editor de fotos: `alt` descriptivo en lugar de "Foto 1"; "Usar de portada" debería decir de qué foto es; listar todos los archivos rechazados, no solo el último.
- Ver E-07 (trampa de foco y retorno del foco en los diálogos).

**Rendimiento**
- `get_available_space_ids` recorre los espacios en un bucle plpgsql; resolverlo con una consulta en conjunto antes de que crezca el catálogo.
- Las miniaturas del editor de fotos piden `w=3840`; definir `sizes` en `next/image`.

**Datos**
- En producción hay un espacio **no demo** "test" publicado (comuna "providencia" en minúscula, anfitrión "tomatito"). Archivarlo y normalizar la comuna al guardar.

## Datos modificados durante la prueba (para el reset)

- Reseñas de prueba de G2/G3 (reveladas): Matías → Cabina Bellavista 4★ y Ana → Matías 5★ (comentarios que empiezan con "QA:"). Bajan el rating de Bellavista a 4,5 y el de Ana a 4,5.
- Reservas: Matías en Cabina Bellavista el 1-nov 9–10 h (Completada, G1) y en Irarrázaval el 4-nov 14–16 h (Confirmada); Bellavista el 4-nov 12–14 h (Cancelada); Joaquín en Irarrázaval el 4-nov 18–20 h (Confirmada) y el 2-nov 20–22 h (Rechazada).
- Me gusta y descartes de Camila en el mundo Música.
- Espacio "QA Sala Prueba (demo)" de Ana (`a89dc267-…`, archivado) con 2 fotos en Storage.
- El perfil de Matías se editó y se restauró.

`unseed_demo.sql` borra los usuarios y reservas demo (y con ellos los espacios), pero **no borra los archivos de Storage**: hay que eliminar a mano `space-images/de000000-0000-4000-8000-000000000001/a89dc267-8976-4018-9b05-618becd54523/`.
