// ==================== AUTENTICACIÓN ====================
const PIN_CORRECTO = '1234';
let intentosFallidos = 0;

const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const pinInput = document.getElementById('pinInput');
const btnIngresar = document.getElementById('btnIngresar');
const pinError = document.getElementById('pinError');

function verificarSesion() {
    const sesionActiva = sessionStorage.getItem('autenticado');
    if (sesionActiva === 'true') {
        mostrarApp();
    }
}

function mostrarApp() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    sessionStorage.setItem('autenticado', 'true');
}

function validarPIN() {
    const pinIngresado = pinInput.value;
    
    if (pinIngresado === PIN_CORRECTO) {
        mostrarApp();
        pinError.style.display = 'none';
        intentosFallidos = 0;
    } else {
        intentosFallidos++;
        pinError.style.display = 'block';
        pinInput.value = '';
        pinInput.focus();
        
        if (intentosFallidos >= 3) {
            alert('Demasiados intentos fallidos. El PIN es 1234');
            intentosFallidos = 0;
        }
    }
}

document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        if (value === 'clear') {
            pinInput.value = pinInput.value.slice(0, -1);
        } else {
            if (pinInput.value.length < 4) {
                pinInput.value += value;
            }
        }
        if (pinInput.value.length === 4) {
            setTimeout(() => validarPIN(), 100);
        }
    });
});

pinInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') validarPIN();
});

pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/[^0-9]/g, '').slice(0, 4);
});

btnIngresar.addEventListener('click', validarPIN);
verificarSesion();

// ==================== DATOS Y ALMACENAMIENTO ====================
let productos = [];
let carrito = [];
let historialVentas = [];
let productosFiltrados = [];
let graficoSemanalInstancia = null;
let graficoProductosInstancia = null;
let ventanaCerrandose = false;

function cargarDatos() {
    const prodGuardados = localStorage.getItem('productos');
    const histGuardados = localStorage.getItem('historialVentas');
    if (prodGuardados) productos = JSON.parse(prodGuardados);
    if (histGuardados) historialVentas = JSON.parse(histGuardados);
    productosFiltrados = [...productos];
    actualizarListaProductos();
    actualizarSelectProductos();
    actualizarHistorial();
    llenarSelectAnios();
}

function guardarProductos() {
    localStorage.setItem('productos', JSON.stringify(productos));
}

function guardarHistorial() {
    localStorage.setItem('historialVentas', JSON.stringify(historialVentas));
}

window.addEventListener('beforeunload', (e) => {
    if (carrito.length > 0 && !ventanaCerrandose) {
        e.preventDefault();
        e.returnValue = 'Tienes productos en el carrito. ¿Seguro que quieres salir?';
    }
});

// ==================== PESTAÑAS ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
        if (tabId === 'historial') {
            actualizarTotalDelDia();
            actualizarTotalDelMes();
        }
        if (tabId === 'estadisticas') {
            actualizarEstadisticas();
        }
    });
});

// ==================== PRODUCTOS ====================
const nombreInput = document.getElementById('nombreProducto');
const precioInput = document.getElementById('precioProducto');
const btnAgregar = document.getElementById('btnAgregarProducto');
const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
const editandoIdInput = document.getElementById('editandoId');
const formTitle = document.getElementById('formTitle');
const listaProductosDiv = document.getElementById('listaProductos');
const selectProductoVenta = document.getElementById('selectProductoVenta');
const precioUnitarioSpan = document.getElementById('precioUnitarioMostrar');
const buscarInput = document.getElementById('buscarProducto');
const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
const cantidadProductosSpan = document.getElementById('cantidadProductos');

btnAgregar.addEventListener('click', guardarProducto);
btnCancelarEdicion.addEventListener('click', cancelarEdicion);
buscarInput.addEventListener('input', filtrarProductos);
btnLimpiarBusqueda.addEventListener('click', limpiarBusqueda);

function guardarProducto() {
    const nombre = nombreInput.value.trim();
    const precio = parseFloat(precioInput.value);
    const editandoId = editandoIdInput.value;
    if (!nombre || isNaN(precio) || precio <= 0) {
        alert('Ingresa un nombre válido y un precio mayor a 0');
        return;
    }
    if (editandoId) {
        const index = productos.findIndex(p => p.id == editandoId);
        if (index !== -1) {
            productos[index].nombre = nombre;
            productos[index].precio = precio;
        }
        cancelarEdicion();
    } else {
        productos.push({ id: Date.now(), nombre, precio });
    }
    guardarProductos();
    nombreInput.value = '';
    precioInput.value = '';
    nombreInput.focus();
    filtrarProductos();
    actualizarSelectProductos();
}

function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    nombreInput.value = producto.nombre;
    precioInput.value = producto.precio;
    editandoIdInput.value = producto.id;
    formTitle.textContent = '✏️ Editar Producto';
    btnAgregar.textContent = '💾 Guardar Cambios';
    btnCancelarEdicion.style.display = 'block';
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelarEdicion() {
    editandoIdInput.value = '';
    nombreInput.value = '';
    precioInput.value = '';
    formTitle.textContent = '➕ Agregar Producto';
    btnAgregar.textContent = '➕ Agregar';
    btnCancelarEdicion.style.display = 'none';
}

function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    productos = productos.filter(p => p.id !== id);
    guardarProductos();
    if (editandoIdInput.value == id) cancelarEdicion();
    filtrarProductos();
    actualizarSelectProductos();
}

function filtrarProductos() {
    const termino = buscarInput.value.trim().toLowerCase();
    if (termino === '') {
        productosFiltrados = [...productos];
        btnLimpiarBusqueda.style.display = 'none';
    } else {
        productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(termino));
        btnLimpiarBusqueda.style.display = 'flex';
    }
    actualizarListaProductos();
}

function limpiarBusqueda() {
    buscarInput.value = '';
    filtrarProductos();
    buscarInput.focus();
}

function actualizarListaProductos() {
    const productosAMostrar = productosFiltrados;
    cantidadProductosSpan.textContent = productos.length;
    if (productos.length === 0) {
        listaProductosDiv.innerHTML = '<div class="empty-state">No hay productos. Agrega uno arriba 👆</div>';
        return;
    }
    if (productosAMostrar.length === 0) {
        listaProductosDiv.innerHTML = `<div class="no-results">🔍 No se encontraron productos con "${buscarInput.value}"<br><button class="btn-secondary" style="margin-top:15px;" onclick="limpiarBusqueda()">Ver todos</button></div>`;
        return;
    }
    listaProductosDiv.innerHTML = productosAMostrar.map(prod => {
        let nombreMostrar = prod.nombre;
        const termino = buscarInput.value.trim();
        if (termino) {
            const regex = new RegExp(`(${termino})`, 'gi');
            nombreMostrar = prod.nombre.replace(regex, '<span class="highlight">$1</span>');
        }
        return `<div class="producto-item"><div class="producto-info"><span class="producto-nombre">${nombreMostrar}</span><span class="producto-precio">$${prod.precio.toFixed(2)}</span></div><div class="producto-actions"><button class="btn-editar" onclick="editarProducto(${prod.id})">✏️</button><button class="btn-eliminar" onclick="eliminarProducto(${prod.id})">🗑️</button></div></div>`;
    }).join('');
}

function actualizarSelectProductos() {
    if (productos.length === 0) {
        selectProductoVenta.innerHTML = '<option value="">-- Agrega productos primero --</option>';
        precioUnitarioSpan.textContent = '$0.00';
        return;
    }
    const productosOrdenados = [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre));
    selectProductoVenta.innerHTML = '<option value="">-- Selecciona un producto --</option>' + productosOrdenados.map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} - $${p.precio.toFixed(2)}</option>`).join('');
}

selectProductoVenta.addEventListener('change', (e) => {
    const selectedOption = e.target.selectedOptions[0];
    precioUnitarioSpan.textContent = selectedOption && selectedOption.dataset.precio ? `$${parseFloat(selectedOption.dataset.precio).toFixed(2)}` : '$0.00';
});

document.getElementById('btnEliminarTodosProductos').addEventListener('click', () => {
    if (productos.length > 0 && confirm('¿Eliminar TODOS los productos?')) {
        productos = [];
        guardarProductos();
        cancelarEdicion();
        filtrarProductos();
        actualizarSelectProductos();
    }
});

document.getElementById('btnExportarProductos').addEventListener('click', () => {
    if (productos.length === 0) { alert('No hay productos'); return; }
    const ws = XLSX.utils.json_to_sheet(productos.map(p => ({ Nombre: p.nombre, Precio: p.precio })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');
    XLSX.writeFile(wb, `productos_${new Date().toISOString().split('T')[0]}.xlsx`);
});

// ==================== CARRITO Y VENTAS ====================
const cantidadVenta = document.getElementById('cantidadVenta');
const btnAgregarCarrito = document.getElementById('btnAgregarAlCarrito');
const carritoItemsDiv = document.getElementById('carritoItems');
const totalCarritoSpan = document.getElementById('totalCarrito');
const btnFinalizar = document.getElementById('btnFinalizarVenta');
const btnVaciarCarrito = document.getElementById('btnVaciarCarrito');

btnAgregarCarrito.addEventListener('click', agregarAlCarrito);
btnVaciarCarrito.addEventListener('click', () => { if (carrito.length > 0 && confirm('¿Vaciar carrito?')) { carrito = []; actualizarCarrito(); } });

function agregarAlCarrito() {
    const productoId = selectProductoVenta.value;
    if (!productoId) { alert('Selecciona un producto'); return; }
    const producto = productos.find(p => p.id == productoId);
    const cantidad = parseInt(cantidadVenta.value);
    if (cantidad < 1) { alert('Cantidad debe ser al menos 1'); return; }
    const itemExistente = carrito.find(item => item.id === producto.id);
    if (itemExistente) itemExistente.cantidad += cantidad;
    else carrito.push({ id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad });
    actualizarCarrito();
    selectProductoVenta.value = '';
    cantidadVenta.value = 1;
    precioUnitarioSpan.textContent = '$0.00';
}

function actualizarCarrito() {
    if (carrito.length === 0) {
        carritoItemsDiv.innerHTML = '<div class="empty-state">Carrito vacío</div>';
        totalCarritoSpan.textContent = '$0.00';
        return;
    }
    let total = 0;
    carritoItemsDiv.innerHTML = carrito.map((item, index) => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        return `<div class="carrito-item"><div class="carrito-item-info"><span class="carrito-item-nombre">${item.nombre}</span><span class="carrito-item-cantidad">${item.cantidad} x $${item.precio.toFixed(2)}</span></div><div style="display:flex;align-items:center;gap:10px;"><span class="carrito-item-precio">$${subtotal.toFixed(2)}</span><button class="btn-quitar" onclick="quitarDelCarrito(${index})">✕</button></div></div>`;
    }).join('');
    totalCarritoSpan.textContent = `$${total.toFixed(2)}`;
}

function quitarDelCarrito(index) { carrito.splice(index, 1); actualizarCarrito(); }

btnFinalizar.addEventListener('click', () => {
    if (carrito.length === 0) { alert('Carrito vacío'); return; }
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    historialVentas.push({ id: Date.now(), fecha: new Date().toISOString(), productos: [...carrito], total });
    guardarHistorial();
    ventanaCerrandose = true;
    carrito = [];
    actualizarCarrito();
    ventanaCerrandose = false;
    actualizarHistorial();
    llenarSelectAnios();
    alert(`✅ Venta registrada\nTotal: $${total.toFixed(2)}`);
    document.querySelector('[data-tab="historial"]').click();
});

// ==================== HISTORIAL ====================
const historialListDiv = document.getElementById('historialList');
const totalDelDiaSpan = document.getElementById('totalDelDia');
const totalDelMesSpan = document.getElementById('totalDelMes');
const filtroFecha = document.getElementById('filtroFecha');
const filtroMes = document.getElementById('filtroMes');
const filtroAnio = document.getElementById('filtroAnio');

function llenarSelectAnios() {
    const anios = [...new Set(historialVentas.map(v => new Date(v.fecha).getFullYear()))].sort((a,b) => b-a);
    filtroAnio.innerHTML = '<option value="">Todos los años</option>' + anios.map(a => `<option value="${a}">${a}</option>`).join('');
}

function actualizarHistorial(ventasFiltradas = null) {
    const ventasAMostrar = ventasFiltradas || historialVentas;
    if (ventasAMostrar.length === 0) {
        historialListDiv.innerHTML = '<div class="empty-state">No hay ventas registradas</div>';
        return;
    }
    historialListDiv.innerHTML = ventasAMostrar.slice().reverse().map(venta => {
        const fecha = new Date(venta.fecha);
        return `<div class="venta-item"><div class="venta-fecha">📅 ${fecha.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div><div class="venta-productos">🛒 ${venta.productos.map(p => `${p.cantidad} ${p.nombre}`).join(', ')}</div><div class="venta-total">$${venta.total.toFixed(2)}</div></div>`;
    }).join('');
    actualizarTotalDelDia();
    actualizarTotalDelMes();
}

function actualizarTotalDelDia() {
    const hoy = new Date().toLocaleDateString('es-ES');
    const total = historialVentas.filter(v => new Date(v.fecha).toLocaleDateString('es-ES') === hoy).reduce((s, v) => s + v.total, 0);
    totalDelDiaSpan.textContent = `$${total.toFixed(2)}`;
}

function actualizarTotalDelMes() {
    const ahora = new Date();
    const total = historialVentas.filter(v => { const f = new Date(v.fecha); return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear(); }).reduce((s, v) => s + v.total, 0);
    totalDelMesSpan.textContent = `$${total.toFixed(2)}`;
}

document.getElementById('btnLimpiarHistorial').addEventListener('click', () => {
    if (historialVentas.length > 0 && confirm('¿Eliminar TODO el historial?')) { historialVentas = []; guardarHistorial(); actualizarHistorial(); llenarSelectAnios(); }
});

document.getElementById('btnFiltrarFecha').addEventListener('click', () => {
    if (!filtroFecha.value) { actualizarHistorial(); return; }
    actualizarHistorial(historialVentas.filter(v => new Date(v.fecha).toISOString().split('T')[0] === filtroFecha.value));
});

document.getElementById('btnFiltrarMes').addEventListener('click', () => {
    let ventas = historialVentas;
    if (filtroMes.value !== '') ventas = ventas.filter(v => new Date(v.fecha).getMonth() === parseInt(filtroMes.value));
    if (filtroAnio.value !== '') ventas = ventas.filter(v => new Date(v.fecha).getFullYear() === parseInt(filtroAnio.value));
    actualizarHistorial(ventas);
});

document.getElementById('btnResetFiltro').addEventListener('click', () => {
    filtroFecha.value = filtroMes.value = filtroAnio.value = '';
    actualizarHistorial();
});

document.getElementById('btnExportarHistorial').addEventListener('click', () => {
    if (historialVentas.length === 0) { alert('No hay ventas'); return; }
    const ws = XLSX.utils.json_to_sheet(historialVentas.map(v => ({ Fecha: new Date(v.fecha).toLocaleString('es-ES'), Productos: v.productos.map(p => `${p.cantidad}x ${p.nombre}`).join('; '), Total: v.total })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial');
    XLSX.writeFile(wb, `historial_${new Date().toISOString().split('T')[0]}.xlsx`);
});

// ==================== ESTADÍSTICAS ====================
function actualizarEstadisticas() {
    if (historialVentas.length === 0) {
        document.getElementById('statsTotalVentas').textContent = '$0.00';
        document.getElementById('statsPromedio').textContent = '$0.00';
        document.getElementById('statsMejorDia').textContent = '-';
        document.getElementById('statsTotalUnidades').textContent = '0';
        return;
    }
    const totalVentas = historialVentas.reduce((s, v) => s + v.total, 0);
    const totalUnidades = historialVentas.reduce((s, v) => s + v.productos.reduce((ss, p) => ss + p.cantidad, 0), 0);
    const ventasPorDia = {};
    historialVentas.forEach(v => { const dia = new Date(v.fecha).toLocaleDateString('es-ES'); ventasPorDia[dia] = (ventasPorDia[dia] || 0) + v.total; });
    const mejorDia = Object.entries(ventasPorDia).sort((a,b) => b[1] - a[1])[0];
    document.getElementById('statsTotalVentas').textContent = `$${totalVentas.toFixed(2)}`;
    document.getElementById('statsPromedio').textContent = `$${(totalVentas / historialVentas.length).toFixed(2)}`;
    document.getElementById('statsMejorDia').textContent = mejorDia ? `${mejorDia[0]} ($${mejorDia[1].toFixed(2)})` : '-';
    document.getElementById('statsTotalUnidades').textContent = totalUnidades;

    // Gráfico semanal
    const ultimos7Dias = [];
    for (let i = 6; i >= 0; i--) {
        const fecha = new Date(); fecha.setDate(fecha.getDate() - i);
        const fechaStr = fecha.toLocaleDateString('es-ES');
        const total = historialVentas.filter(v => new Date(v.fecha).toLocaleDateString('es-ES') === fechaStr).reduce((s, v) => s + v.total, 0);
        ultimos7Dias.push({ fecha: fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }), total });
    }
    const ctxSemanal = document.getElementById('graficoSemanal').getContext('2d');
    if (graficoSemanalInstancia) graficoSemanalInstancia.destroy();
    graficoSemanalInstancia = new Chart(ctxSemanal, { type: 'bar', data: { labels: ultimos7Dias.map(d => d.fecha), datasets: [{ label: 'Ventas ($)', data: ultimos7Dias.map(d => d.total), backgroundColor: '#0f3460', borderRadius: 8 }] }, options: { responsive: true, plugins: { legend: { display: false } } } });

    // Gráfico productos
    const productosVendidos = {};
    historialVentas.forEach(v => v.productos.forEach(p => productosVendidos[p.nombre] = (productosVendidos[p.nombre] || 0) + p.cantidad));
    const top = Object.entries(productosVendidos).sort((a,b) => b[1] - a[1]).slice(0,5);
    const ctxProd = document.getElementById('graficoProductos').getContext('2d');
    if (graficoProductosInstancia) graficoProductosInstancia.destroy();
    graficoProductosInstancia = new Chart(ctxProd, { type: 'doughnut', data: { labels: top.map(t => t[0]), datasets: [{ data: top.map(t => t[1]), backgroundColor: ['#0f3460','#10b981','#e94560','#f59e0b','#8b5cf6'] }] } });
}

document.getElementById('btnExportarEstadisticas').addEventListener('click', () => {
    if (historialVentas.length === 0) { alert('No hay datos'); return; }
    const wb = XLSX.utils.book_new();
    const wsV = XLSX.utils.json_to_sheet(historialVentas.map(v => ({ Fecha: new Date(v.fecha).toLocaleString('es-ES'), Productos: v.productos.map(p => `${p.cantidad}x ${p.nombre}`).join('; '), Total: v.total })));
    XLSX.utils.book_append_sheet(wb, wsV, 'Ventas');
    if (productos.length) { const wsP = XLSX.utils.json_to_sheet(productos.map(p => ({ Producto: p.nombre, Precio: p.precio }))); XLSX.utils.book_append_sheet(wb, wsP, 'Productos'); }
    XLSX.writeFile(wb, `reporte_${new Date().toISOString().split('T')[0]}.xlsx`);
});

// ==================== INICIALIZAR ====================
cargarDatos();

