/* ==========================================
   SPRITE SHOP — Lógica principal
   Flujo: Tienda → Carrito → Checkout → Confirmación
   ========================================== */

// ---- Estado global de la aplicación ----
const estado = {
  sprites: [],       // catálogo completo cargado desde sprites.json
  carrito: [],       // ítems en el carrito: { sprite, cantidad }
  filtroRareza: "Todos",
  filtroBusqueda: "",
};

// ---- Colores de rareza para el drop-shadow de las imágenes ----
const COLORES_RAREZA = {
  Rare:      "#4dabf7",
  Epic:      "#b197fc",
  Legendary: "#ffa94d",
  Mythic:    "#ff6b9d",
};

/* ==========================================
   1. INICIALIZACIÓN
   ========================================== */

/**
 * Punto de entrada: carga los datos y arranca la app.
 */
async function inicializar() {
  try {
    const respuesta = await fetch("data/sprites.json");
    if (!respuesta.ok) throw new Error("No se pudo cargar sprites.json");

    estado.sprites = await respuesta.json();
    renderizarCatalogo();
    registrarEventos();
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Error al cargar",
      text: "No se pudieron obtener los datos de los Espíritus. Recargá la página.",
      background: "#111827",
      color: "#f0f4ff",
      confirmButtonColor: "#00d4ff",
    });
  }
}

/* ==========================================
   2. RENDERIZADO DEL CATÁLOGO
   ========================================== */

/**
 * Filtra el catálogo según rareza y texto de búsqueda,
 * luego dibuja las tarjetas en el DOM.
 */
function renderizarCatalogo() {
  const catalogo    = document.getElementById("catalogo");
  const estadoVacio = document.getElementById("estadoVacio");

  // Aplicar filtros con métodos funcionales de arrays
  const visibles = estado.sprites
    .filter(sprite =>
      estado.filtroRareza === "Todos" || sprite.rareza === estado.filtroRareza
    )
    .filter(sprite =>
      sprite.nombre.toLowerCase().includes(estado.filtroBusqueda.toLowerCase())
    );

  if (visibles.length === 0) {
    catalogo.innerHTML = "";
    estadoVacio.classList.remove("oculto");
    return;
  }

  estadoVacio.classList.add("oculto");

  // Generar el HTML de cada tarjeta con map()
  catalogo.innerHTML = visibles
    .map(sprite => crearTarjetaHTML(sprite))
    .join("");
}

/**
 * Construye el HTML de una tarjeta de Espíritu.
 * @param {Object} sprite - Datos del espíritu
 * @returns {string} HTML de la tarjeta
 */
function crearTarjetaHTML(sprite) {
  const rarezaClass  = `rareza-${sprite.rareza.toLowerCase()}`;
  const bandaClass   = `banda-${sprite.rareza.toLowerCase()}`;
  const colorSombra  = COLORES_RAREZA[sprite.rareza] || "#fff";
  const stockBajo    = sprite.stock <= 3;
  const sinStock     = sprite.stock === 0;

  return `
    <article class="sprite-card">
      <div class="sprite-card__rareza-banda ${bandaClass}"></div>

      <div class="sprite-card__img-wrap">
        <img
          class="sprite-card__img"
          src="${sprite.imagen}"
          alt="${sprite.nombre}"
          style="color: ${colorSombra}"
          onerror="this.src='https://placehold.co/120x120/0d1a2e/00d4ff?text=⚡'"
        />
      </div>

      <div class="sprite-card__body">
        <span class="sprite-card__rareza ${rarezaClass}">${sprite.rareza}</span>
        <h2 class="sprite-card__nombre">${sprite.nombre}</h2>
        <p class="sprite-card__poder">${sprite.poder}</p>

        <div class="sprite-card__footer">
          <span class="sprite-card__precio">⚡ ${sprite.precio.toLocaleString()}</span>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
            <span class="sprite-card__stock ${stockBajo ? "bajo" : ""}">
              ${sinStock ? "Sin stock" : stockBajo ? `¡Solo ${sprite.stock} disponibles!` : `Stock: ${sprite.stock}`}
            </span>
            <button
              class="btn-agregar"
              data-id="${sprite.id}"
              ${sinStock ? "disabled" : ""}
            >
              + Agregar
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

/* ==========================================
   3. CARRITO
   ========================================== */

/**
 * Agrega un Espíritu al carrito o incrementa su cantidad.
 * @param {number} id - ID del sprite a agregar
 */
function agregarAlCarrito(id) {
  const sprite = estado.sprites.find(s => s.id === id);
  if (!sprite) return;

  const itemExistente = estado.carrito.find(item => item.sprite.id === id);

  if (itemExistente) {
    // Verificar que no se supere el stock disponible
    if (itemExistente.cantidad >= sprite.stock) {
      Swal.fire({
        icon: "warning",
        title: "Stock máximo",
        text: `Solo hay ${sprite.stock} unidades de ${sprite.nombre}.`,
        background: "#111827",
        color: "#f0f4ff",
        confirmButtonColor: "#00d4ff",
        timer: 2000,
        showConfirmButton: false,
      });
      return;
    }
    itemExistente.cantidad++;
  } else {
    estado.carrito.push({ sprite, cantidad: 1 });
  }

  actualizarCarritoUI();

  // Notificación no intrusiva con SweetAlert2 toast
  Swal.fire({
    toast: true,
    position: "bottom-end",
    icon: "success",
    title: `${sprite.nombre} agregado`,
    showConfirmButton: false,
    timer: 1800,
    background: "#111827",
    color: "#f0f4ff",
  });
}

/**
 * Cambia la cantidad de un ítem del carrito.
 * Si la cantidad llega a 0, elimina el ítem.
 * @param {number} id       - ID del sprite
 * @param {number} delta    - +1 o -1
 */
function cambiarCantidad(id, delta) {
  const index = estado.carrito.findIndex(item => item.sprite.id === id);
  if (index === -1) return;

  const item   = estado.carrito[index];
  const sprite = estado.sprites.find(s => s.id === id);

  // Verificar límite de stock al incrementar
  if (delta > 0 && item.cantidad >= sprite.stock) {
    Swal.fire({
      toast: true,
      position: "bottom-end",
      icon: "warning",
      title: "Stock máximo alcanzado",
      showConfirmButton: false,
      timer: 1800,
      background: "#111827",
      color: "#f0f4ff",
    });
    return;
  }

  item.cantidad += delta;

  if (item.cantidad <= 0) {
    estado.carrito.splice(index, 1);
  }

  actualizarCarritoUI();
}

/**
 * Elimina completamente un ítem del carrito con confirmación.
 * @param {number} id - ID del sprite a eliminar
 */
async function eliminarDelCarrito(id) {
  const item = estado.carrito.find(item => item.sprite.id === id);
  if (!item) return;

  const resultado = await Swal.fire({
    title: `¿Quitar ${item.sprite.nombre}?`,
    text: "Se eliminará este ítem del carrito.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, quitar",
    cancelButtonText: "Cancelar",
    background: "#111827",
    color: "#f0f4ff",
    confirmButtonColor: "#ff6b6b",
    cancelButtonColor: "#374151",
  });

  if (resultado.isConfirmed) {
    estado.carrito = estado.carrito.filter(item => item.sprite.id !== id);
    actualizarCarritoUI();
  }
}

/**
 * Calcula el total del carrito usando reduce().
 * @returns {number} Suma total en V-Bucks
 */
function calcularTotal() {
  return estado.carrito.reduce(
    (acum, item) => acum + item.sprite.precio * item.cantidad,
    0
  );
}

/**
 * Calcula la cantidad total de ítems en el carrito.
 * @returns {number}
 */
function calcularCantidadItems() {
  return estado.carrito.reduce((acum, item) => acum + item.cantidad, 0);
}

/**
 * Re-dibuja toda la UI del carrito (lista, total, badge del header).
 */
function actualizarCarritoUI() {
  const lista        = document.getElementById("carritoLista");
  const vacio        = document.getElementById("carritoVacio");
  const footer       = document.getElementById("carritoFooter");
  const totalEl      = document.getElementById("carritoTotal");
  const badge        = document.getElementById("cartBadge");

  badge.textContent = calcularCantidadItems();

  if (estado.carrito.length === 0) {
    lista.innerHTML = "";
    vacio.classList.remove("oculto");
    footer.classList.add("oculto");
    return;
  }

  vacio.classList.add("oculto");
  footer.classList.remove("oculto");

  // Renderizar cada ítem con map()
  lista.innerHTML = estado.carrito
    .map(item => crearItemCarritoHTML(item))
    .join("");

  totalEl.innerHTML = `⚡ ${calcularTotal().toLocaleString()} V-Bucks`;
}

/**
 * Construye el HTML de un ítem dentro del carrito.
 * @param {Object} item - { sprite, cantidad }
 * @returns {string}
 */
function crearItemCarritoHTML({ sprite, cantidad }) {
  return `
    <li class="carrito-item">
      <img
        class="carrito-item__img"
        src="${sprite.imagen}"
        alt="${sprite.nombre}"
        onerror="this.src='https://placehold.co/56x56/0d1a2e/00d4ff?text=⚡'"
      />
      <div class="carrito-item__info">
        <p class="carrito-item__nombre">${sprite.nombre}</p>
        <p class="carrito-item__precio">⚡ ${(sprite.precio * cantidad).toLocaleString()} V-Bucks</p>
        <div class="carrito-item__controles">
          <button class="ctrl-btn" data-accion="restar" data-id="${sprite.id}">−</button>
          <span class="ctrl-cantidad">${cantidad}</span>
          <button class="ctrl-btn" data-accion="sumar" data-id="${sprite.id}">+</button>
        </div>
      </div>
      <button class="carrito-item__eliminar" data-accion="eliminar" data-id="${sprite.id}" aria-label="Eliminar">🗑</button>
    </li>
  `;
}

/* ==========================================
   4. NAVEGACIÓN ENTRE VISTAS
   ========================================== */

/**
 * Muestra una vista y oculta las demás.
 * @param {string} idVista - ID del elemento a mostrar
 */
function mostrarVista(idVista) {
  const vistas = ["vistaTimda", "vistaCheckout", "vistaConfirmacion"];
  vistas.forEach(id => {
    const el = document.getElementById(id);
    if (id === idVista) {
      el.classList.remove("oculto");
    } else {
      el.classList.add("oculto");
    }
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Abre el drawer del carrito */
function abrirCarrito() {
  document.getElementById("vistaCarrito").classList.add("abierto");
}

/** Cierra el drawer del carrito */
function cerrarCarrito() {
  document.getElementById("vistaCarrito").classList.remove("abierto");
}

/* ==========================================
   5. CHECKOUT
   ========================================== */

/** Renderiza el resumen del pedido en la pantalla de checkout */
function renderizarResumenCheckout() {
  const lista    = document.getElementById("resumenLista");
  const totalEl  = document.getElementById("resumenTotal");

  lista.innerHTML = estado.carrito
    .map(({ sprite, cantidad }) => `
      <li class="resumen-item">
        <img
          class="resumen-item__img"
          src="${sprite.imagen}"
          alt="${sprite.nombre}"
          onerror="this.src='https://placehold.co/44x44/0d1a2e/00d4ff?text=⚡'"
        />
        <span class="resumen-item__nombre">${sprite.nombre}</span>
        <span class="resumen-item__qty">x${cantidad}</span>
        <span class="resumen-item__precio">⚡ ${(sprite.precio * cantidad).toLocaleString()}</span>
      </li>
    `)
    .join("");

  totalEl.innerHTML = `⚡ ${calcularTotal().toLocaleString()} Pavos`;
}

/**
 * Valida todos los campos del formulario de checkout.
 * Muestra mensajes de error debajo de cada campo inválido.
 * @returns {boolean} true si el formulario es válido
 */
function validarFormulario() {
  const campos = [
    {
      id: "inputNombre",
      errorId: "errorNombre",
      validar: v => v.trim().length >= 3,
      mensaje: "Ingresá tu nombre completo (mínimo 3 caracteres).",
    },
    {
      id: "inputEmail",
      errorId: "errorEmail",
      validar: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      mensaje: "Ingresá un email válido.",
    },
    {
      id: "inputDireccion",
      errorId: "errorDireccion",
      validar: v => v.trim().length >= 5,
      mensaje: "Ingresá una dirección válida.",
    },
    {
      id: "inputTarjeta",
      errorId: "errorTarjeta",
      validar: v => v.replace(/\s/g, "").length === 16 && /^\d+$/.test(v.replace(/\s/g, "")),
      mensaje: "Ingresá un número de tarjeta de 16 dígitos.",
    },
  ];

  let formularioValido = true;

  campos.forEach(({ id, errorId, validar, mensaje }) => {
    const input = document.getElementById(id);
    const error = document.getElementById(errorId);
    const valor = input.value;

    if (!validar(valor)) {
      input.classList.add("invalido");
      error.textContent = mensaje;
      formularioValido = false;
    } else {
      input.classList.remove("invalido");
      error.textContent = "";
    }
  });

  return formularioValido;
}

/* ==========================================
   6. CONFIRMACIÓN
   ========================================== */

/**
 * Procesa la compra: valida, genera orden y muestra confirmación.
 */
async function procesarCompra() {
  if (!validarFormulario()) return;

  const nombre = document.getElementById("inputNombre").value.trim();
  const email  = document.getElementById("inputEmail").value.trim();

  // Simulación de procesamiento con SweetAlert2
  await Swal.fire({
    title: "Procesando tu compra...",
    html: "<p style='color:#6b7a99'>Esto tardará un momento.</p>",
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
    allowOutsideClick: false,
    background: "#111827",
    color: "#f0f4ff",
    didOpen: () => Swal.showLoading(),
  });

  // Generar número de orden único
  const numeroOrden = `FN-${Date.now().toString(36).toUpperCase()}`;

  // Renderizar vista de confirmación
  document.getElementById("numeroOrden").textContent  = numeroOrden;
  document.getElementById("confirmNombre").textContent = nombre;
  document.getElementById("confirmEmail").textContent  = email;
  document.getElementById("confirmTotal").innerHTML   = `⚡ ${calcularTotal().toLocaleString()} V-Bucks`;

  const confirmItems = document.getElementById("confirmItems");
  confirmItems.innerHTML = estado.carrito
    .map(({ sprite, cantidad }) => `
      <div class="resumen-item">
        <img
          class="resumen-item__img"
          src="${sprite.imagen}"
          alt="${sprite.nombre}"
          onerror="this.src='https://placehold.co/44x44/0d1a2e/00d4ff?text=⚡'"
        />
        <span class="resumen-item__nombre">${sprite.nombre}</span>
        <span class="resumen-item__qty">x${cantidad}</span>
        <span class="resumen-item__precio">⚡ ${(sprite.precio * cantidad).toLocaleString()}</span>
      </div>
    `)
    .join("");

  mostrarVista("vistaConfirmacion");
}

/**
 * Reinicia la aplicación: vacía el carrito y vuelve a la tienda.
 */
function reiniciarApp() {
  estado.carrito        = [];
  estado.filtroRareza   = "Todos";
  estado.filtroBusqueda = "";

  document.getElementById("inputBusqueda").value = "";

  // Resetear botones de filtro
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.classList.toggle("activo", btn.dataset.rareza === "Todos");
  });

  // Limpiar formulario de checkout
  ["inputNombre","inputEmail","inputDireccion","inputTarjeta"].forEach(id => {
    document.getElementById(id).value = "";
  });

  actualizarCarritoUI();
  renderizarCatalogo();
  mostrarVista("vistaTimda");
}

/* ==========================================
   7. REGISTRO DE EVENTOS
   ========================================== */

function registrarEventos() {

  // --- Abrir / cerrar carrito ---
  document.getElementById("btnAbrirCarrito").addEventListener("click", abrirCarrito);
  document.getElementById("btnCerrarCarrito").addEventListener("click", cerrarCarrito);
  document.getElementById("carritoOverlay").addEventListener("click", cerrarCarrito);

  // --- Ir al checkout desde el carrito ---
  document.getElementById("btnIrCheckout").addEventListener("click", () => {
    if (estado.carrito.length === 0) return;
    cerrarCarrito();
    renderizarResumenCheckout();
    mostrarVista("vistaCheckout");
  });

  // --- Volver a la tienda desde el checkout ---
  document.getElementById("btnVolverTienda").addEventListener("click", () => {
    mostrarVista("vistaTimda");
  });

  // --- Confirmar compra ---
  document.getElementById("btnConfirmarCompra").addEventListener("click", procesarCompra);

  // --- Nueva compra desde la confirmación ---
  document.getElementById("btnNuevaCompra").addEventListener("click", reiniciarApp);

  // --- Seguir comprando desde carrito vacío ---
  document.getElementById("btnSeguirComprando").addEventListener("click", cerrarCarrito);

  // --- Buscador: filtra en tiempo real ---
  document.getElementById("inputBusqueda").addEventListener("input", e => {
    estado.filtroBusqueda = e.target.value;
    renderizarCatalogo();
  });

  // --- Filtros de rareza ---
  document.querySelectorAll(".filtro-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filtro-btn").forEach(b => b.classList.remove("activo"));
      btn.classList.add("activo");
      estado.filtroRareza = btn.dataset.rareza;
      renderizarCatalogo();
    });
  });

  // --- Limpiar filtros desde estado vacío ---
  document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
    estado.filtroRareza   = "Todos";
    estado.filtroBusqueda = "";
    document.getElementById("inputBusqueda").value = "";
    document.querySelectorAll(".filtro-btn").forEach(btn => {
      btn.classList.toggle("activo", btn.dataset.rareza === "Todos");
    });
    renderizarCatalogo();
  });

  // --- Delegación de eventos en el catálogo (botones "Agregar") ---
  document.getElementById("catalogo").addEventListener("click", e => {
    const btn = e.target.closest(".btn-agregar");
    if (btn) agregarAlCarrito(Number(btn.dataset.id));
  });

  // --- Delegación de eventos en la lista del carrito ---
  document.getElementById("carritoLista").addEventListener("click", e => {
    const btn = e.target.closest("[data-accion]");
    if (!btn) return;

    const id     = Number(btn.dataset.id);
    const accion = btn.dataset.accion;

    if (accion === "sumar")    cambiarCantidad(id, +1);
    if (accion === "restar")   cambiarCantidad(id, -1);
    if (accion === "eliminar") eliminarDelCarrito(id);
  });

  // --- Formateo en tiempo real del número de tarjeta ---
  document.getElementById("inputTarjeta").addEventListener("input", e => {
    // Mantiene solo dígitos y agrega espacios cada 4 caracteres
    let valor = e.target.value.replace(/\D/g, "").substring(0, 16);
    e.target.value = valor.replace(/(.{4})/g, "$1 ").trim();
  });

  // --- Limpiar error visual al corregir un campo ---
  ["inputNombre","inputEmail","inputDireccion","inputTarjeta"].forEach(id => {
    document.getElementById(id).addEventListener("input", e => {
      e.target.classList.remove("invalido");
      const errorId = "error" + id.replace("input","");
      document.getElementById(errorId).textContent = "";
    });
  });
}

/* ==========================================
   ARRANQUE
   ========================================== */
document.addEventListener("DOMContentLoaded", inicializar);
