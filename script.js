let cart = []; // Array para almacenar los ítems del carrito

// Constantes para elementos del DOM (comunes en varias páginas o específicas de index.html)
const cartCountElement = document.getElementById('cart-count');
const cartItemsElement = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');
const cartModal = document.getElementById('cart-modal');
const cartViewContent = document.getElementById('cart-view-content');
const invoiceViewContent = document.getElementById('invoice-view-content');
const modalTitle = document.querySelector('#modal-content h2');
const closeCartModalBtn = document.getElementById('close-cart-modal-btn');
const openCartModalBtn = document.getElementById('open-cart-btn'); // Botón de abrir carrito en el header
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const customerEmailInput = document.getElementById('customer-email');
const paymentMethodSelect = document.getElementById('payment-method');
const emailErrorElement = document.getElementById('email-error');
const paymentErrorElement = document.getElementById('payment-error');

// NUEVAS CONSTANTES para la gestión de productos en index.html y frutas_detalle.html
const productCardsContainer = document.getElementById('product-cards-container'); // Contenedor de productos en index.html
const productList = document.getElementById('product-list'); // Contenedor de productos estáticos en frutas_detalle.html
const apiProductListContainer = document.getElementById('api-product-list-container'); // NUEVO: Contenedor para productos de API en frutas_detalle.html

// Variables para manejar el foco del teclado en el modal (Accesibilidad)
let lastFocusedElement; // Para guardar el elemento que tenía el foco antes de abrir el modal

// --- Funciones de Carga y Guardado del Carrito ---
window.onload = function() {
    loadCart();
    updateCartDisplay();
    addGlobalEventListeners(); // Agrega los event listeners que aplican a todo el sitio

    // Lógica condicional para inicializar funciones específicas de cada página
    // Si quieres que los productos de tu frutas.json aparezcan en index.html,
    // descomenta la siguiente línea:
    // if (productCardsContainer) { // Si estamos en index.html
    //     fetchProductsForIndex(); // Carga los productos desde frutas.json para la página principal
    // }
    if (productList) { // Si estamos en frutas_detalle.html (la página con el catálogo completo)
        initializeStaticProductCatalogPage(); // Inicializa los listeners para filtro/ordenación de productos ESTÁTICOS
    }
    if (apiProductListContainer) { // Si estamos en frutas_detalle.html y tenemos la sección de API
        fetchAndDisplayAPIProducts(); // Carga los productos desde Open Food Facts para su sección
    }
};

function loadCart() {
    const storedCart = localStorage.getItem('shoppingCart');
    if (storedCart) {
        cart = JSON.parse(storedCart);
    }
}

function saveCart() {
    localStorage.setItem('shoppingCart', JSON.stringify(cart));
}

// --- FUNCIÓN UNIFICADA PARA AÑADIR AL CARRITO ---
function addToCart(productData, quantityInputId = null) {
    let name, price, image;
    let quantity = 1;

    if (typeof productData === 'object' && productData !== null) {
        name = productData.name || productData.title;
        // Si no hay precio en la API, podemos simular uno o marcarlo como "consultar"
        price = parseFloat(productData.price) || 0; // Si no hay precio, usa 0 o un valor por defecto
        image = productData.image || productData.image_url || '';
    } else {
        name = productData;
        price = parseFloat(arguments[1]);
        quantityInputId = arguments[2];
        image = '';
    }

    if (quantityInputId) {
        const quantityInput = document.getElementById(quantityInputId);
        if (quantityInput) {
            quantity = parseFloat(quantityInput.value);
        }
    }

    if (isNaN(quantity) || quantity <= 0) {
        console.warn('Intento de añadir cantidad inválida:', quantity);
        return;
    }
    if (isNaN(price)) {
        console.error('Error: El precio del producto no es un número válido:', productData);
        return;
    }

    const existingItemIndex = cart.findIndex(item => item.name === name);

    if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += quantity;
    } else {
        cart.push({ name: name, price: price, quantity: quantity, image: image });
    }

    saveCart();
    updateCartDisplay();
    console.log(`"${name}" (x${quantity}) ha sido añadido al carrito.`);
}


// Función para eliminar una cantidad específica de un producto del carrito
function removeQuantityFromCart(itemName, quantityInputId) {
    const quantityInput = document.getElementById(quantityInputId);
    let quantityToRemove = parseFloat(quantityInput.value);

    if (isNaN(quantityToRemove) || quantityToRemove <= 0) {
        console.warn('Intento de eliminar cantidad inválida:', quantityToRemove);
        return;
    }

    const itemIndex = cart.findIndex(item => item.name === itemName);

    if (itemIndex > -1) {
        if (cart[itemIndex].quantity <= quantityToRemove) {
            cart.splice(itemIndex, 1);
        } else {
            cart[itemIndex].quantity -= quantityToRemove;
        }
        saveCart();
        updateCartDisplay();
    } else {
        console.warn('El producto no se encuentra en el carrito:', itemName);
    }
}

function updateCartDisplay() {
    let totalProductsCount = 0;
    let totalPriceValue = 0;
    if (cartItemsElement) cartItemsElement.innerHTML = '';

    if (cart.length === 0) {
        if (cartItemsElement) cartItemsElement.innerHTML = '<p class="text-gray-600">El carrito está vacío.</p>';
    } else {
        cart.forEach(item => {
            const removeQuantityInputId = `remove-${item.name.replace(/\s/g, '')}-qty`;
            const itemElement = document.createElement('div');
            itemElement.classList.add('flex', 'flex-col', 'sm:flex-row', 'justify-between', 'items-center', 'py-2', 'border-b', 'border-gray-200');
            itemElement.innerHTML = `
                <span class="text-gray-700 mb-2 sm:mb-0">${item.name} (${item.quantity.toFixed(1)})</span>
                <div class="flex items-center space-x-2">
                    <span class="font-semibold">$${(item.price * item.quantity).toLocaleString('es-AR')}</span>
                    <input type="number" id="${removeQuantityInputId}" value="1" min="0.1" step="0.1" max="${item.quantity}" class="w-16 p-1 border rounded-md text-center text-gray-800">
                    <button data-item-name="${item.name}" data-quantity-input-id="${removeQuantityInputId}" class="remove-item-btn bg-red-400 text-white px-2 py-1 rounded-full text-xs hover:bg-red-500 transition duration-300">Eliminar</button>
                </div>
            `;
            if (cartItemsElement) cartItemsElement.appendChild(itemElement);
            totalProductsCount += item.quantity;
            totalPriceValue += item.price * item.quantity;
        });
    }

    if (cartCountElement) cartCountElement.textContent = Math.floor(totalProductsCount);
    if (cartTotalElement) cartTotalElement.textContent = `Total: $${totalPriceValue.toLocaleString('es-AR')}`;
}

// --- Gestión de Modal (para accesibilidad) ---
function openCartModal() {
    lastFocusedElement = document.activeElement;
    if (cartViewContent) cartViewContent.style.display = 'block';
    if (invoiceViewContent) invoiceViewContent.style.display = 'none';
    if (modalTitle) modalTitle.textContent = 'Tu Carrito';
    if (closeCartModalBtn) closeCartModalBtn.classList.remove('hide-on-print');
    if (cartModal) cartModal.style.display = 'flex';

    const focusableElements = cartModal ? cartModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : [];
    const firstFocusableElement = focusableElements[0];
    if (firstFocusableElement) {
        firstFocusableElement.focus();
    } else if (closeCartModalBtn) {
        closeCartModalBtn.focus();
    }

    updateCartDisplay();
    if (cartModal) cartModal.addEventListener('keydown', trapFocus);
}

function closeCartModal() {
    if (cartModal) cartModal.style.display = 'none';
    if (cartModal) cartModal.removeEventListener('keydown', trapFocus);

    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
}

// Función para atrapar el foco dentro del modal (Accesibilidad)
function trapFocus(e) {
    if (e.key === 'Tab') {
        const focusableElements = cartModal ? cartModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : [];
        if (focusableElements.length === 0) {
            e.preventDefault();
            return;
        }
        const firstFocusableElement = focusableElements[0];
        const lastFocusableElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
            if (document.activeElement === firstFocusableElement || document.activeElement === cartModal) {
                lastFocusableElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastFocusableElement || document.activeElement === cartModal) {
                firstFocusableElement.focus();
                e.preventDefault();
            }
        }
    }
    if (e.key === 'Escape') {
        closeCartModal();
    }
}

function clearCart() {
    cart = [];
    saveCart();
    updateCartDisplay();
    console.log('El carrito ha sido vaciado.');
}

// --- Validación de Formularios y Checkout ---
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function checkout() {
    if (cart.length === 0) {
        if (emailErrorElement) emailErrorElement.textContent = 'Tu carrito está vacío. Por favor, añade productos antes de pagar.';
        return;
    }

    const customerEmail = customerEmailInput ? customerEmailInput.value.trim() : '';
    const paymentMethod = paymentMethodSelect ? paymentMethodSelect.value : '';

    let isValid = true;

    if (customerEmail && !validateEmail(customerEmail)) {
        if (emailErrorElement) emailErrorElement.textContent = 'Por favor, introduce un formato de correo válido.';
        isValid = false;
    } else {
        if (emailErrorElement) emailErrorElement.textContent = '';
    }

    if (!paymentMethod) {
        if (paymentErrorElement) paymentErrorElement.textContent = 'Por favor, selecciona un método de pago.';
        isValid = false;
    } else {
        if (paymentErrorElement) paymentErrorElement.textContent = '';
    }

    if (!isValid) {
        return;
    }

    const invoiceHtml = generateInvoiceHtml(customerEmail, paymentMethod);

    if (cartViewContent) cartViewContent.style.display = 'none';
    if (invoiceViewContent) {
        invoiceViewContent.innerHTML = invoiceHtml;
        invoiceViewContent.style.display = 'block';
    }

    if (modalTitle) modalTitle.textContent = 'Factura de tu Compra';
    if (closeCartModalBtn) closeCartModalBtn.classList.add('hide-on-print');

    console.log('Factura generada:', invoiceHtml);

    clearCartAfterCheckout();
}

function generateInvoiceHtml(email, paymentMethod) {
    let itemsHtml = '';
    let totalAmount = 0;
    const purchaseDate = new Date().toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const currentCartItems = [...cart];

    currentCartItems.forEach(item => {
        const subtotal = item.price * item.quantity;
        totalAmount += subtotal;
        itemsHtml += `
            <div class="flex justify-between py-1 border-b border-gray-100">
                <span>${item.name} (${item.quantity.toFixed(1)}) kg</span> <span>$${subtotal.toLocaleString('es-AR')}</span>
            </div>
        `;
    });

    return `
        <div class="invoice-container p-4">
            <h2 class="text-3xl font-bold text-green-700 mb-4 text-center">¡Gracias por tu compra!</h2>
            <p class="text-gray-700 mb-2">Fecha: ${purchaseDate}</p>
            ${email ? `<p class="text-gray-700 mb-2">Email: <span class="font-semibold">${email}</span></p>` : ''}
            <div class="border rounded-md p-4 mb-4">
                <h3 class="text-xl font-semibold text-gray-800 mb-2">Detalle de la Compra</h3>
                ${itemsHtml}
                <div class="flex justify-between font-bold text-xl text-green-800 mt-4">
                    <span>Total:</span>
                    <span>$${totalAmount.toLocaleString('es-AR')}</span>
                </div>
            </div>
            <p class="text-gray-700 mb-4">Método de Pago: <span class="font-semibold">${paymentMethodText(paymentMethod)}</span></p>
            <p class="text-gray-600 text-sm text-center">¡Esperamos verte de nuevo pronto en La Verdulería de Teto!</p>
            <div class="mt-6 flex justify-center space-x-4 hide-on-print">
                <button onclick="window.print()" class="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition duration-300 shadow-md">Imprimir Factura</button>
                <button id="close-invoice-btn" class="bg-gray-500 text-white px-6 py-2 rounded-full hover:bg-gray-600 transition duration-300 shadow-md">Cerrar</button>
            </div>
        </div>
    `;
}

function paymentMethodText(method) {
    switch (method) {
        case 'credit-card': return 'Tarjeta de Crédito';
        case 'debit-card': return 'Tarjeta de Débito';
        case 'mercado-pago': return 'Mercado Pago';
        case 'cash': return 'Efectivo';
        default: return 'No especificado';
    }
}

function clearCartAfterCheckout() {
    cart = [];
    saveCart();
    updateCartDisplay();
}

// --- FUNCIONES PARA CARGA Y VISUALIZACIÓN DE PRODUCTOS DESDE JSON LOCAL (para index.html) ---
async function fetchProductsForIndex() { // Renombrada para claridad
    try {
        const response = await fetch('./Multimedia/frutas.json'); // Apunta a tu JSON local
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        displayProductsForIndex(data); // Pasamos los productos a la función para mostrarlos
    } catch (error) {
        console.error('Error al obtener los productos desde frutas.json para index.html:', error);
        if (productCardsContainer) {
            productCardsContainer.innerHTML += '<p class="text-red-600 text-center col-span-full">No se pudieron cargar productos adicionales. Por favor, intente de nuevo más tarde.</p>';
        }
    }
}

function displayProductsForIndex(products) { // Renombrada para claridad
    if (!productCardsContainer) {
        return;
    }
    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.classList.add('card', 'bg-green-50', 'p-6', 'rounded-lg', 'shadow-md', 'hover:shadow-lg', 'transition', 'duration-300', 'text-center');
        
        const productName = product.name;
        const productPrice = product.price;
        const productImage = product.image;
        const productDescription = product.description || '';

        productCard.innerHTML = `
            <h3 class="text-2xl font-semibold text-green-800 mb-3">${productName}</h3>
            <img src="${productImage}" alt="${productName}" class="w-48 h-48 object-cover rounded-full mx-auto mb-4 border-4 border-green-300">
            <p class="text-gray-700 mb-4">${productDescription}</p>
            <p class="text-gray-700 text-lg mb-2">Precio: $${productPrice.toLocaleString('es-AR')}/kg</p>
            <button class="add-to-cart-btn bg-green-600 text-white px-6 py-2 rounded-full text-lg font-semibold hover:bg-green-700 transition duration-300 shadow-md"
                    data-product-name="${productName}" 
                    data-product-price="${productPrice}"
                    data-product-image="${productImage}">
                Añadir al Carrito
            </button>
        `;
        productCardsContainer.appendChild(productCard);
    });

    productCardsContainer.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const name = event.target.dataset.productName;
            const price = event.target.dataset.productPrice;
            const image = event.target.dataset.productImage;
            addToCart({ name, price, image });
        });
    });
}


// --- FUNCIONES PARA FILTRADO Y ORDENACIÓN DE PRODUCTOS ESTÁTICOS (para frutas_detalle.html) ---

// Función para ordenar productos (trabaja sobre los elementos HTML directos)
function sortProducts(order) {
    if (!productList) return;

    let products = Array.from(productList.children);

    products.sort((a, b) => {
        const nameA = a.dataset.name.toLowerCase();
        const nameB = b.dataset.name.toLowerCase();
        const priceA = parseFloat(a.dataset.price); 
        const priceB = parseFloat(b.dataset.price);

        if (order === 'price-asc') {
            return priceA - priceB;
        } else if (order === 'price-desc') {
            return priceB - priceA;
        } else if (order === 'name-asc') {
            return nameA.localeCompare(nameB);
        } else if (order === 'name-desc') {
            return nameB.localeCompare(nameA);
        }
        return 0;
    });

    productList.innerHTML = '';
    products.forEach(product => productList.appendChild(product));
    filterProducts(); // Volver a aplicar el filtro actual después de ordenar
}

// Función para filtrar productos por entrada de búsqueda (trabaja sobre los elementos HTML directos)
function filterProducts() {
    if (!productList) return;

    const searchInput = document.getElementById('search-input');
    const filter = searchInput.value.toLowerCase();
    const products = productList.children;

    for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const productName = product.dataset.name.toLowerCase();
        if (productName.includes(filter)) {
            product.style.display = '';
        } else {
            product.style.display = 'none';
        }
    }
}


// --- FUNCIÓN PARA CARGAR Y MOSTRAR PRODUCTOS DE API REMOTA (PARA FRUTAS_DETALLE.HTML EN NUEVA SECCIÓN) ---
// Ahora usaremos Open Food Facts API para obtener productos relacionados con la comida.
// Ten en cuenta que esta API no proporciona precios ni imágenes de alta calidad para e-commerce.
async function fetchAndDisplayAPIProducts() {
    if (!apiProductListContainer) return;

    apiProductListContainer.innerHTML = '<p class="text-center text-gray-500 col-span-full">Cargando productos de Open Food Facts...</p>';

    // Ejemplo de endpoint para buscar "fruits" en Open Food Facts
    // Más información: https://world.openfoodfacts.org/data
    const openFoodFactsApiUrl = 'https://world.openfoodfacts.org/cgi/search.pl?search_terms=fruit&search_simple=1&json=1&page_size=12';

    try {
        const response = await fetch(openFoodFactsApiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Filtramos para obtener productos que tengan nombre e imagen y sean más o menos 'comerciales'
        const foodProducts = data.products.filter(p => 
            p.product_name && p.image_url && p.image_small_url && !p.product_name.toLowerCase().includes('drink')
        ).slice(0, 8); // Tomamos los primeros 8 que cumplan el filtro

        if (foodProducts.length === 0) {
            apiProductListContainer.innerHTML = '<p class="text-gray-600 text-center col-span-full">No se encontraron productos de comida relevantes de la API.</p>';
            return;
        }

        apiProductListContainer.innerHTML = ''; // Limpiar mensaje de carga

        foodProducts.forEach(product => {
            const productCard = document.createElement('div');
            // Usamos el estilo amarillo/verde consistente para las tarjetas de frutas_detalle.html
            productCard.classList.add('card', 'bg-yellow-50', 'p-6', 'rounded-lg', 'shadow-md', 'hover:shadow-lg', 'transition', 'duration-300', 'text-center');
            
            // Mapeamos los datos de Open Food Facts
            const productName = product.product_name;
            const productImage = product.image_url || product.image_small_url; // Usa la imagen disponible
            // NOTA: Open Food Facts NO TIENE PRECIOS. Simulamos un precio aleatorio o indicamos "Consultar"
            const productPrice = (Math.random() * 1000 + 1000).toFixed(2); // Precio aleatorio entre $1000 y $2000
            const productDescription = product.ingredients_text || 'Sin descripción disponible.';

            productCard.innerHTML = `
                <h3 class="text-2xl font-semibold text-yellow-800 mb-3">${productName}</h3>
                <img src="${productImage}" alt="${productName}" class="w-48 h-48 object-cover rounded-full mx-auto mb-4 border-4 border-yellow-300">
                <p class="text-gray-700 mb-4">${productDescription.substring(0, 100)}...</p> 
                <p class="text-gray-700 text-lg mb-2">Precio: $${parseFloat(productPrice).toLocaleString('es-AR')}/kg (Simulado)</p>
                <button class="add-to-cart-btn bg-green-600 text-white px-6 py-2 rounded-full text-lg font-semibold hover:bg-green-700 transition duration-300 shadow-md"
                        data-product-name="${productName}" 
                        data-product-price="${productPrice}"
                        data-product-image="${productImage}">
                    Añadir al Carrito
                </button>
            `;
            apiProductListContainer.appendChild(productCard);
        });

        // Añadir event listeners a los botones de "Añadir al Carrito" para los productos de la API
        apiProductListContainer.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const name = event.target.dataset.productName;
                const price = event.target.dataset.productPrice;
                const image = event.target.dataset.productImage;
                addToCart({ name, price, image }); // Llamada a la función unificada
            });
        });

    } catch (error) {
        console.error('Error al obtener los productos de Open Food Facts API:', error);
        apiProductListContainer.innerHTML = '<p class="text-red-600 text-center col-span-full">No se pudieron cargar los productos de la API de alimentos. Intente más tarde.</p>';
    }
}


// --- Gestión de Event Listeners Globales (para todas las páginas) ---
function addGlobalEventListeners() {
    if (openCartModalBtn) {
        openCartModalBtn.addEventListener('click', openCartModal);
    }
    if (closeCartModalBtn) {
        closeCartModalBtn.addEventListener('click', closeCartModal);
    }
    if (cartModal) {
        cartModal.addEventListener('click', (event) => {
            if (event.target === cartModal) {
                closeCartModal();
            }
        });
    }
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
    if (cartItemsElement) {
        cartItemsElement.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-item-btn')) {
                const itemName = event.target.dataset.itemName;
                const quantityInputId = event.target.dataset.quantityInputId;
                removeQuantityFromCart(itemName, quantityInputId);
            }
        });
    }
    if (invoiceViewContent) {
        invoiceViewContent.addEventListener('click', (event) => {
            if (event.target.id === 'close-invoice-btn') {
                closeCartModal();
            }
        });
    }
}

// --- Inicialización de Event Listeners específicos para frutas_detalle.html (Catálogo Estático) ---
function initializeStaticProductCatalogPage() {
    // Añadir event listeners a los botones "Añadir al Carrito" en frutas_detalle.html (para productos estáticos)
    if (productList) {
        productList.addEventListener('click', (event) => {
            const button = event.target.closest('.add-to-cart-btn');
            if (button) {
                const card = button.closest('.card');
                const productName = button.dataset.productName;
                const productPrice = parseFloat(button.dataset.productPrice);
                const quantityInputId = button.dataset.quantityId;
                const productImage = button.dataset.productImage;
                
                addToCart({ name: productName, price: productPrice, image: productImage }, quantityInputId);
            }
        });
    }
    
    // Event listeners para la barra de búsqueda y el selector de ordenación (solo para productos estáticos)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', filterProducts);
    }
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (event) => sortProducts(event.target.value));
    }
}
