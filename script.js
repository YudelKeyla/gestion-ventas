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
let productoSeleccionadoId = null;  // Para el buscador en ventas
let datosParaCompartir = '';
let tituloParaCompartir = '';

function cargarDatos() {
    const prodGuardados = localStorage.getItem('productos');
    const histGuardados = localStorage.getItem('historialVentas');
    if (prodGuardados) productos = JSON.parse(prodGuardados);
    if (histGuardados) historialVentas = JSON.parse(histGuardados);
    // Compatibilidad: si un producto no tiene precioCosto, asignar 0
    productos.forEach(p => {
        if (p.precioCosto === undefined) p.precioCosto = 0;
        if (p.stock === undefined) p.stock = 0;
        if (!p.fechaCompra) p.fechaCompra = '';
    });
    productosFiltrados = [...productos];
    actualizarListaProductos();
    actualizarInterfazVenta();
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
const precioCostoInput = document.getElementById('precioCostoProducto');
const precioVentaInput = document.getElementById('precioVentaProducto');
const cantidadInput = document.getElementById('cantidadProducto');
const fechaCompraInput = document.getElementById('fechaCompraProducto');
const btnAgregar = document.getElementById('btnAgregarProducto');
const btnCancelarEdicion = document.getElementById('btnCancelarEdicion');
const editandoIdInput = document.getElementById('editandoId');
const formTitle = document.getElementById('formTitle');
const listaProductosDiv = document.getElementById('listaProductos');
const selectProductoVentaHidden = document.getElementById('selectProductoVenta');
const precioUnitarioSpan = document.getElementById('precioUnitarioMostrar');
const buscarInput = document.getElementById('buscarProducto');
const btnLimpiarBusqueda = document.getElementById('btnLimpiarBusqueda');
const cantidadProductosSpan = document.getElementById('cantidadProductos');

// Referencias a los elementos de búsqueda en ventas
const buscarProductoVenta = document.getElementById('buscarProductoVenta');
const btnLimpiarBusquedaVenta = document.getElementById('btnLimpiarBusquedaVenta');
const listaProductosVenta = document.getElementById('listaProductosVenta');
const productoSeleccionadoInfo = document.getElementById('productoSeleccionadoInfo');
const nombreProductoSeleccionado = document.getElementById('nombreProductoSeleccionado');
const precioProductoSeleccionado = document.getElementById('precioProductoSeleccionado');
const stockProductoSeleccionado = document.getElementById('stockProductoSeleccionado');
const btnDeseleccionarProducto = document.getElementById('btnDeseleccionarProducto');

btnAgregar.addEventListener('click', guardarProducto);
btnCancelarEdicion.addEventListener('click', cancelarEdicion);
buscarInput.addEventListener('input', filtrarProductos);
btnLimpiarBusqueda.addEventListener('click', () => { buscarInput.value = ''; filtrarProductos(); });
buscarProductoVenta.addEventListener('input', () => actualizarInterfazVenta(buscarProductoVenta.value));
btnLimpiarBusquedaVenta.addEventListener('click', () => { buscarProductoVenta.value = ''; actualizarInterfazVenta(); });
btnDeseleccionarProducto.addEventListener('click', deseleccionarProducto);

function guardarProducto() {
    const nombre = nombreInput.value.trim();
    const precioCosto = parseFloat(precioCostoInput.value);
    const precioVenta = parseFloat(precioVentaInput.value);
    const cantidad = parseInt(cantidadInput.value);
    const fechaCompra = fechaCompraInput.value || new Date().toISOString().split('T')[0];
    const editandoId = editandoIdInput.value;
    
    if (!nombre || isNaN(precioCosto) || isNaN(precioVenta) || isNaN(cantidad) || precioCosto <= 0 || precioVenta <= 0 || cantidad < 1) {
        alert('Completa todos los campos correctamente. El stock debe ser al menos 1.');
        return;
    }
    
    if (precioVenta <= precioCosto) {
        if (!confirm('⚠️ El precio de venta es menor o igual al costo. ¿Estás seguro?')) return;
    }
    
    if (editandoId) {
        const index = productos.findIndex(p => p.id == editandoId);
        if (index !== -1) {
            productos[index].nombre = nombre;
            productos[index].precioCosto = precioCosto;
            productos[index].precio = precioVenta;
            productos[index].stock = cantidad;
            productos[index].fechaCompra = fechaCompra;
        }
        cancelarEdicion();
    } else {
        // Verificar duplicado
        const duplicado = productos.find(p => p.nombre.toLowerCase() === nombre.toLowerCase());
        if (duplicado) {
            if (duplicado.precio === precioVenta && duplicado.precioCosto === precioCosto) {
                duplicado.stock += cantidad;
                guardarProductos();
                alert(`✅ Stock actualizado. "${nombre}" ahora tiene ${duplicado.stock} unidades.`);
                limpiarFormularioProducto();
                actualizarTodo();
                return;
            } else {
                if (!confirm(`"${nombre}" ya existe con otros precios. ¿Agregar como nuevo producto de todas formas?`)) {
                    return;
                }
            }
        }
        productos.push({
            id: Date.now(),
            nombre: nombre,
            precioCosto: precioCosto,
            precio: precioVenta,
            stock: cantidad,
            fechaCompra: fechaCompra
        });
    }
    
    guardarProductos();
    limpiarFormularioProducto();
    actualizarTodo();
}

function limpiarFormularioProducto() {
    nombreInput.value = '';
    precioCostoInput.value = '';
    precioVentaInput.value = '';
    cantidadInput.value = '1';
    fechaCompraInput.value = '';
    nombreInput.focus();
}

function editarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
    nombreInput.value = producto.nombre;
    precioCostoInput.value = producto.precioCosto || 0;
    precioVentaInput.value = producto.precio;
    cantidadInput.value = producto.stock || 0;
    fechaCompraInput.value = producto.fechaCompra || '';
    editandoIdInput.value = producto.id;
    formTitle.textContent = '✏️ Editar Producto';
    btnAgregar.textContent = '💾 Guardar Cambios';
    btnCancelarEdicion.style.display = 'block';
    document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelarEdicion() {
    editandoIdInput.value = '';
    limpiarFormularioProducto();
    formTitle.textContent = '➕ Agregar Producto';
    btnAgregar.textContent = '➕ Agregar';
    btnCancelarEdicion.style.display = 'none';
}

function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    productos = productos.filter(p => p.id !== id);
    guardarProductos();
    actualizarTodo();
    if (editandoIdInput.value == id) cancelarEdicion();
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

function actualizarListaProductos() {
    const productosAMostrar = productosFiltrados;
    cantidadProductosSpan.textContent = productos.length;
    if (productos.length === 0) {
        listaProductosDiv.innerHTML = '<div class="empty-state">No hay productos. Agrega uno arriba 👆</div>';
        return;
    }
    if (productosAMostrar.length === 0) {
        listaProductosDiv.innerHTML = `<div class="no-results">🔍 Sin resultados para "${buscarInput.value}"<br><button class="btn-secondary" onclick="document.getElementById('buscarProducto').value=''; filtrarProductos();">Ver todos</button></div>`;
        return;
    }
    listaProductosDiv.innerHTML = productosAMostrar.map(prod => {
        const ganancia = prod.precio - (prod.precioCosto || 0);
        const stockClass = (prod.stock || 0) <= 3 ? 'stock-bajo' : 'stock-ok';
        return `<div class="producto-item">
            <div class="producto-info">
                <span class="producto-nombre">${prod.nombre}</span>
                <span class="producto-precio">💲 ${prod.precio.toFixed(2)} | Costo: ${(prod.precioCosto||0).toFixed(2)}</span>
                <span class="producto-stock ${stockClass}">📦 Stock: ${prod.stock || 0} | Ganancia: $${ganancia.toFixed(2)}</span>
                <span style="font-size:12px;color:#888;">📅 ${prod.fechaCompra || 'N/D'}</span>
            </div>
            <div class="producto-actions">
                <button class="btn-editar" onclick="editarProducto(${prod.id})">✏️</button>
                <button class="btn-eliminar" onclick="eliminarProducto(${prod.id})">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

// ==================== INTERFAZ DE VENTA (BÚSQUEDA Y LISTA) ====================
function actualizarInterfazVenta(termino = '') {
    const term = termino.trim().toLowerCase();
    let productosFiltradosVenta = productos;
    if (term) {
        productosFiltradosVenta = productos.filter(p => p.nombre.toLowerCase().includes(term));
        btnLimpiarBusquedaVenta.style.display = 'flex';
    } else {
        btnLimpiarBusquedaVenta.style.display = 'none';
    }
    
    if (productos.length === 0) {
        listaProductosVenta.innerHTML = '<div class="empty-state">No hay productos. Agrégalos primero 👆</div>';
        return;
    }
    if (productosFiltradosVenta.length === 0) {
        listaProductosVenta.innerHTML = `<div class="no-results">🔍 Sin resultados para "${term}"</div>`;
        return;
    }
    
    listaProductosVenta.innerHTML = productosFiltradosVenta.map(p => {
        const agotado = (p.stock || 0) === 0;
        const seleccionado = productoSeleccionadoId === p.id;
        const stockBajo = (p.stock || 0) <= 3 && !agotado;
        return `<div class="producto-venta-item ${seleccionado ? 'seleccionado' : ''} ${agotado ? 'agotado' : ''}" 
                  onclick="seleccionarProductoVenta(${p.id})">
            <div class="producto-venta-nombre">${seleccionado ? '✅ ' : ''}${p.nombre}</div>
            <div class="producto-venta-info">
                <div class="producto-venta-precio">$${p.precio.toFixed(2)}</div>
                <div class="producto-venta-stock ${stockBajo ? 'bajo' : ''}">📦 ${p.stock || 0} ${agotado ? '(Agotado)' : ''}</div>
            </div>
        </div>`;
    }).join('');
}

function seleccionarProductoVenta(id) {
    const producto = productos.find(p => p.id === id);
    if (!producto || (producto.stock || 0) === 0) return;
    
    productoSeleccionadoId = id;
    selectProductoVentaHidden.value = id;
    precioUnitarioSpan.textContent = `$${producto.precio.toFixed(2)}`;
    
    nombreProductoSeleccionado.textContent = producto.nombre;
    precioProductoSeleccionado.textContent = `$${producto.precio.toFixed(2)}`;
    stockProductoSeleccionado.textContent = producto.stock || 0;
    productoSeleccionadoInfo.style.display = 'block';
    
    actualizarInterfazVenta(buscarProductoVenta.value);
}

function deseleccionarProducto() {
    productoSeleccionadoId = null;
    selectProductoVentaHidden.value = '';
    productoSeleccionadoInfo.style.display = 'none';
    precioUnitarioSpan.textContent = '$0.00';
    actualizarInterfazVenta(buscarProductoVenta.value);
}

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
    const productoId = productoSeleccionadoId || selectProductoVentaHidden.value;
    if (!productoId) { alert('Selecciona un producto de la lista'); return; }
    
    const producto = productos.find(p => p.id == productoId);
    const cantidad = parseInt(cantidadVenta.value);
    if (cantidad < 1) { alert('Cantidad debe ser al menos 1'); return; }
    if (cantidad > (producto.stock || 0)) {
        alert(`Stock insuficiente. Solo hay ${producto.stock || 0} unidades.`);
        return;
    }
    
    // Descontar del inventario
    producto.stock -= cantidad;
    guardarProductos();
    
    const itemExistente = carrito.find(item => item.id === producto.id);
    if (itemExistente) {
        itemExistente.cantidad += cantidad;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            precioCosto: producto.precioCosto || 0,
            cantidad: cantidad
        });
    }
    
    actualizarCarrito();
    actualizarTodo();
    deseleccionarProducto();
    cantidadVenta.value = 1;
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
        const gananciaItem = (item.precio - (item.precioCosto || 0)) * item.cantidad;
        total += subtotal;
        return `<div class="carrito-item">
            <div class="carrito-item-info">
                <span class="carrito-item-nombre">${item.nombre}</span>
                <span class="carrito-item-cantidad">${item.cantidad} x $${item.precio.toFixed(2)}</span>
                <span style="font-size:12px;color:#10b981;">Ganancia: $${gananciaItem.toFixed(2)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
                <span class="carrito-item-precio">$${subtotal.toFixed(2)}</span>
                <button class="btn-quitar" onclick="quitarDelCarrito(${index})">✕</button>
            </div>
        </div>`;
    }).join('');
    totalCarritoSpan.textContent = `$${total.toFixed(2)}`;
}

function quitarDelCarrito(index) {
    const item = carrito[index];
    const producto = productos.find(p => p.id === item.id);
    if (producto) {
        producto.stock += item.cantidad;
        guardarProductos();
    }
    carrito.splice(index, 1);
    actualizarCarrito();
    actualizarTodo();
}

btnFinalizar.addEventListener('click', () => {
    if (carrito.length === 0) { alert('Carrito vacío'); return; }
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const venta = {
        id: Date.now(),
        fecha: new Date().toISOString(),
        productos: carrito.map(item => ({
            id: item.id,
            nombre: item.nombre,
            precio: item.precio,
            precioCosto: item.precioCosto || 0,
            cantidad: item.cantidad
        })),
        total: total
    };
    historialVentas.push(venta);
    guardarHistorial();
    
    ventanaCerrandose = true;
    carrito = [];
    actualizarCarrito();
    ventanaCerrandose = false;
    
    actualizarHistorial();
    llenarSelectAnios();
    actualizarTodo();
    alert(`✅ Venta registrada\nTotal: $${total.toFixed(2)}`);
    document.querySelector('[data-tab="historial"]').click();
});

// ==================== HISTORIAL ====================
const historialListDiv = document.getElementById('historialList');
const totalDelDiaSpan = document.getElementById('totalDelDia');
const totalDelMesSpan = document.getElementById('totalDelMes');
const gananciaDelDiaSpan = document.getElementById('gananciaDelDia');
const gananciaDelMesSpan = document.getElementById('gananciaDelMes');
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
        const ganancia = venta.productos.reduce((sum, p) => sum + ((p.precio - (p.precioCosto || 0)) * p.cantidad), 0);
        return `<div class="venta-item">
            <div class="venta-fecha">📅 ${fecha.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
            <div class="venta-productos">🛒 ${venta.productos.map(p => `${p.cantidad} ${p.nombre}`).join(', ')}</div>
            <div class="venta-total">$${venta.total.toFixed(2)}</div>
            <div style="font-size:12px;color:#10b981;">Ganancia: $${ganancia.toFixed(2)}</div>
        </div>`;
    }).join('');
    actualizarTotalDelDia();
    actualizarTotalDelMes();
}

function actualizarTotalDelDia() {
    const hoy = new Date().toLocaleDateString('es-ES');
    const ventasHoy = historialVentas.filter(v => new Date(v.fecha).toLocaleDateString('es-ES') === hoy);
    
    // Calcular venta total del día
    const totalVenta = ventasHoy.reduce((s, v) => s + v.total, 0);
    totalDelDiaSpan.textContent = `$${totalVenta.toFixed(2)}`;
    
    // Calcular ganancia total del día
    const totalGanancia = ventasHoy.reduce((s, v) => {
        const gananciaVenta = v.productos.reduce((sum, p) => sum + ((p.precio - (p.precioCosto || 0)) * p.cantidad), 0);
        return s + gananciaVenta;
    }, 0);
    gananciaDelDiaSpan.textContent = `$${totalGanancia.toFixed(2)}`;
}

function actualizarTotalDelMes() {
    const ahora = new Date();
    const ventasMes = historialVentas.filter(v => {
        const f = new Date(v.fecha);
        return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
    });
    
    // Calcular venta total del mes
    const totalVenta = ventasMes.reduce((s, v) => s + v.total, 0);
    totalDelMesSpan.textContent = `$${totalVenta.toFixed(2)}`;
    
    // Calcular ganancia total del mes
    const totalGanancia = ventasMes.reduce((s, v) => {
        const gananciaVenta = v.productos.reduce((sum, p) => sum + ((p.precio - (p.precioCosto || 0)) * p.cantidad), 0);
        return s + gananciaVenta;
    }, 0);
    gananciaDelMesSpan.textContent = `$${totalGanancia.toFixed(2)}`;
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

// ==================== EXPORTACIÓN INTELIGENTE (descarga o modal) ====================
function exportarTipo(datosFormateados, nombreArchivo, titulo) {
    // Generar texto tabulado
    const claves = Object.keys(datosFormateados[0]);
    let texto = claves.join('\t') + '\n';
    texto += datosFormateados.map(fila => claves.map(k => fila[k] || '').join('\t')).join('\n');
    
    datosParaCompartir = texto;
    tituloParaCompartir = nombreArchivo;
    
    // Intentar descarga directa
    const blob = new Blob([texto], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo}.tsv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Mostrar modal (por si no se descargó en WebView)
    setTimeout(() => {
        document.getElementById('modalTitulo').textContent = '📤 ' + titulo;
        document.getElementById('modalContenido').value = texto;
        document.getElementById('modalExportar').style.display = 'flex';
        copiarAlPortapapeles(texto);
    }, 300);
}

function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).catch(() => {
            const textarea = document.getElementById('modalContenido');
            textarea.select();
            document.execCommand('copy');
        });
    } else {
        const textarea = document.getElementById('modalContenido');
        textarea.select();
        document.execCommand('copy');
    }
}

document.getElementById('btnCerrarModal').addEventListener('click', () => {
    document.getElementById('modalExportar').style.display = 'none';
});
document.getElementById('btnCopiarModal').addEventListener('click', () => {
    copiarAlPortapapeles(datosParaCompartir);
    alert('✅ Datos copiados al portapapeles');
});
document.getElementById('btnCompartirModal').addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: tituloParaCompartir,
            text: datosParaCompartir
        }).catch(() => {});
    } else {
        copiarAlPortapapeles(datosParaCompartir);
        alert('📋 Datos copiados. Pégalos en WhatsApp, Notas, etc.');
    }
});
document.getElementById('modalExportar').addEventListener('click', function(e) {
    if (e.target === this) this.style.display = 'none';
});

// Funciones de exportación específicas
document.getElementById('btnExportarProductos').addEventListener('click', () => {
    if (productos.length === 0) { alert('No hay productos'); return; }
    const datos = productos.map(p => ({
        'Nombre': p.nombre,
        'Precio Venta': p.precio,
        'Precio Costo': p.precioCosto || 0,
        'Stock': p.stock || 0,
        'Ganancia Unitaria': (p.precio - (p.precioCosto || 0)).toFixed(2),
        'Fecha Compra': p.fechaCompra || ''
    }));
    exportarTipo(datos, `productos_${new Date().toISOString().split('T')[0]}`, 'Productos');
});

document.getElementById('btnExportarHistorial').addEventListener('click', () => {
    if (historialVentas.length === 0) { alert('No hay ventas'); return; }
    const datos = historialVentas.map(v => ({
        'Fecha': new Date(v.fecha).toLocaleString('es-ES'),
        'Productos': v.productos.map(p => `${p.cantidad}x ${p.nombre}`).join('; '),
        'Total': v.total,
        'Ganancia': v.productos.reduce((sum, p) => sum + ((p.precio - (p.precioCosto || 0)) * p.cantidad), 0).toFixed(2)
    }));
    exportarTipo(datos, `historial_${new Date().toISOString().split('T')[0]}`, 'Historial');
});

document.getElementById('btnExportarEstadisticas').addEventListener('click', () => {
    if (historialVentas.length === 0) { alert('No hay datos'); return; }
    const datos = historialVentas.map(v => ({
        'Fecha': new Date(v.fecha).toLocaleString('es-ES'),
        'Productos': v.productos.map(p => `${p.cantidad}x ${p.nombre}`).join('; '),
        'Total': v.total,
        'Ganancia': v.productos.reduce((sum, p) => sum + ((p.precio - (p.precioCosto || 0)) * p.cantidad), 0).toFixed(2)
    }));
    exportarTipo(datos, `reporte_${new Date().toISOString().split('T')[0]}`, 'Reporte Completo');
});

// ==================== RESPALDO Y RESTAURACIÓN (incluido automáticamente en exportar) ====================
// Se puede agregar un botón extra en el HTML si se desea, pero las funciones de exportación ya cubren el respaldo.

// ==================== ACTUALIZAR TODO ====================
function actualizarTodo() {
    guardarProductos();
    filtrarProductos();
    actualizarInterfazVenta(buscarProductoVenta.value);
}

// ==================== INICIALIZAR ====================
cargarDatos();

