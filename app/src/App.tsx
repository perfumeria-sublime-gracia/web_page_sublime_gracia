import {
  ArrowRightLeft,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  PackageSearch,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  UserRound,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteProduct,
  deleteReview,
  fetchCustomerOrders,
  fetchCustomers,
  fetchDashboard,
  fetchInventoryMovements,
  fetchOrders,
  fetchProducts,
  fetchPromotions,
  fetchReviews,
  loginAdmin,
  registerInventoryMovement,
  registerSale,
  resolveBaseUrl,
  saveApiBaseUrl,
  saveProduct,
  savePromotion,
  setProductActive,
  setPromotionActive,
  setReviewActive,
  updateOrderState,
} from './api';
import type {
  Customer,
  DashboardStats,
  InventoryMovement,
  MenuKey,
  Order,
  OrderState,
  Product,
  Promotion,
  Review,
  SaleRequest,
} from './types';

const navigation = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'catalog', label: 'Catálogo', icon: PackageSearch },
  { key: 'inventory', label: 'Inventario', icon: Warehouse },
  { key: 'orders', label: 'Pedidos', icon: BriefcaseBusiness },
  { key: 'pos', label: 'Ventas presenciales', icon: ShoppingCart },
  { key: 'promotions', label: 'Promociones', icon: Percent },
  { key: 'customers', label: 'Clientes', icon: Users },
  { key: 'reviews', label: 'Opiniones', icon: Star },
  { key: 'administration', label: 'Administración', icon: ShieldCheck },
  { key: 'settings', label: 'Configuración', icon: ArrowRightLeft },
] as const;

const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value ?? 0);

const formatDate = (value?: string) => value
  ? new Date(value).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const emptyStats: DashboardStats = {
  ventasHoy: 0,
  ventasMes: 0,
  pedidosPendientes: 0,
  pedidosAceptados: 0,
  productosDisponibles: 0,
  stockBajo: 0,
  agotados: 0,
  ventasUltimosSieteDias: [],
  productosMasVendidos: [],
};

type ProductDraft = Omit<Product, 'id'> & { id?: number };
type PromotionDraft = Omit<Promotion, 'id' | 'productos' | 'presentaciones'> & {
  id?: number;
  productIds: number[];
  presentationIds: number[];
};
type CartLine = { key: string; product: Product; presentationId?: number; presentation?: Product['presentaciones'][number]; quantity: number };

const newProductDraft = (): ProductDraft => ({
  nombre: '',
  marca: '',
  genero: 'UNISEX',
  categoria: 'Otros',
  segmentacion: 'Otros',
  descripcion: '',
  precio: 1,
  stock: 0,
  activo: true,
  img: '',
  presentaciones: [{ mililitros: null, precio: 1, stock: 0, activo: true }],
});

const newPromotionDraft = (): PromotionDraft => ({
  nombre: '',
  tipo: 'PORCENTAJE',
  valor: 10,
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaFin: new Date().toISOString().slice(0, 10),
  activa: true,
  genero: 'TODOS',
  prioridad: 0,
  productIds: [],
  presentationIds: [],
});

function App() {
  const [selectedSection, setSelectedSection] = useState<MenuKey>('dashboard');
  const [token, setToken] = useState(() => sessionStorage.getItem('sg-admin-token') ?? '');
  const [userName, setUserName] = useState(() => sessionStorage.getItem('sg-admin-user') ?? 'Administrador');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productGenreFilter, setProductGenreFilter] = useState('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerOrders, setCustomerOrders] = useState<Order[] | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [productDraft, setProductDraft] = useState<ProductDraft | null>(null);
  const [productImage, setProductImage] = useState<File | undefined>();
  const [promotionDraft, setPromotionDraft] = useState<PromotionDraft | null>(null);
  const [saleLines, setSaleLines] = useState<CartLine[]>([]);
  const [salePayment, setSalePayment] = useState<SaleRequest['metodoPago']>('Efectivo');
  const [inventoryDraft, setInventoryDraft] = useState({
    productId: '',
    presentationId: '',
    operation: 'entrada' as 'entrada' | 'ajuste',
    quantity: 1,
    direction: 1 as 1 | -1,
    motivo: '',
  });

  const refreshData = useCallback(async (authToken: string) => {
    setError('');
    try {
      const [dashboard, productList, orderList, promotionList, customerList, reviewList, movementList] = await Promise.all([
        fetchDashboard(authToken),
        fetchProducts(authToken),
        fetchOrders(authToken),
        fetchPromotions(authToken),
        fetchCustomers(authToken),
        fetchReviews(authToken),
        fetchInventoryMovements(authToken),
      ]);
      setStats(dashboard);
      setProducts(productList);
      setOrders(orderList);
      setPromotions(promotionList);
      setCustomers(customerList);
      setReviews(reviewList);
      setMovements(movementList);
      setLastRefresh(new Date());
      setMessage('');
    } catch (requestError) {
      const errorText = requestError instanceof Error ? requestError.message : 'No se pudo sincronizar con el backend.';
      setError(errorText);
      if (errorText.includes('sesión expiró') || errorText.includes('permisos de administrador')) {
        sessionStorage.removeItem('sg-admin-token');
        sessionStorage.removeItem('sg-admin-user');
        setToken('');
      }
    }
  }, []);

  useEffect(() => {
    void resolveBaseUrl().then(setApiBaseUrl);
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    void refreshData(token);
    const timer = window.setInterval(() => void refreshData(token), 60_000);
    return () => window.clearInterval(timer);
  }, [refreshData, token]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setTimeout(async () => {
      try {
        setCustomers(await fetchCustomers(token, customerSearch));
        setError('');
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'No se pudieron consultar los clientes.');
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch, token]);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      if (token) await refreshData(token);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'La operación no pudo completarse.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await loginAdmin(email, password);
      if (result.user?.rol !== 'admin') throw new Error('Esta cuenta no tiene permisos de administrador.');
      sessionStorage.setItem('sg-admin-token', result.token);
      sessionStorage.setItem('sg-admin-user', `${result.user.nombre} ${result.user.apellido}`.trim());
      setToken(result.token);
      setUserName(`${result.user.nombre} ${result.user.apellido}`.trim());
      setPassword('');
      setMessage('Sesión iniciada correctamente.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('sg-admin-token');
    sessionStorage.removeItem('sg-admin-user');
    setToken('');
    setUserName('Administrador');
    setProducts([]);
    setOrders([]);
    setPromotions([]);
    setCustomers([]);
    setReviews([]);
    setMovements([]);
    setStats(emptyStats);
    setSelectedSection('dashboard');
  };

  const imageUrl = (image?: string) => {
    if (!image) return '';
    if (/^https?:\/\//i.test(image) || image.startsWith('data:')) return image;
    return `${apiBaseUrl}${image.startsWith('/') ? image : `/${image}`}`;
  };

  const beginEditProduct = (product?: Product) => {
    setProductImage(undefined);
    if (!product) {
      setProductDraft(newProductDraft());
      return;
    }
    setProductDraft({
      ...product,
      presentaciones: product.presentaciones.map((presentation) => ({ ...presentation })),
    });
  };

  const handleSaveProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!productDraft || !token) return;
    await runAction(async () => {
      await saveProduct(token, productDraft, productImage);
      setProductDraft(null);
      setProductImage(undefined);
    }, 'Perfume guardado y sincronizado con la tienda.');
  };

  const handleSavePromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!promotionDraft || !token) return;
    await runAction(async () => {
      await savePromotion(token, promotionDraft);
      setPromotionDraft(null);
    }, 'Promoción guardada y sincronizada.');
  };

  const updateProductPresentation = (index: number, patch: Partial<Product['presentaciones'][number]>) => {
    setProductDraft((current) => current && ({
      ...current,
      presentaciones: current.presentaciones.map((presentation, itemIndex) =>
        itemIndex === index ? { ...presentation, ...patch } : presentation),
    }));
  };

  const addSaleLine = (product: Product, presentation?: Product['presentaciones'][number]) => {
    const key = `${product.id}-${presentation?.id ?? 'base'}`;
    setSaleLines((current) => {
      const found = current.find((line) => line.key === key);
      if (found) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, {
        key,
        product,
        presentation,
        presentationId: presentation?.id,
        quantity: 1,
      }];
    });
  };

  const saleSubtotal = saleLines.reduce((sum, line) =>
    sum + Number(line.presentation?.precio ?? line.product.precio) * line.quantity, 0);

  const submitSale = async () => {
    if (!token || !saleLines.length) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await registerSale(token, {
        metodoPago: salePayment,
        items: saleLines.map((line) => ({
          productId: line.product.id,
          ...(line.presentationId ? { presentationId: line.presentationId } : {}),
          quantity: line.quantity,
        })),
      });
      setMessage(`Venta ${result.pedido.id} registrada. Total final: ${formatCurrency(result.pedido.total)}.`);
      setSaleLines([]);
      await refreshData(token);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo registrar la venta.');
    } finally {
      setBusy(false);
    }
  };

  const submitInventoryMovement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !inventoryDraft.productId) return;
    await runAction(async () => {
      await registerInventoryMovement(token, {
        productId: Number(inventoryDraft.productId),
        ...(inventoryDraft.presentationId ? { presentationId: Number(inventoryDraft.presentationId) } : {}),
        operation: inventoryDraft.operation,
        quantity: Number(inventoryDraft.quantity),
        direction: inventoryDraft.operation === 'ajuste' ? inventoryDraft.direction : undefined,
        motivo: inventoryDraft.motivo,
      });
      setInventoryDraft((current) => ({ ...current, quantity: 1, motivo: '' }));
    }, 'Movimiento registrado en el historial.');
  };

  const selectedInventoryProduct = products.find((product) => product.id === Number(inventoryDraft.productId));
  const availablePresentations = selectedInventoryProduct?.presentaciones.filter((item) => item.activo) ?? [];
  const filteredProducts = useMemo(() => products.filter((product) => {
    const search = productSearch.trim().toLocaleLowerCase();
    return (!search || `${product.nombre} ${product.marca ?? ''}`.toLocaleLowerCase().includes(search))
      && (productGenreFilter === 'all' || product.genero === productGenreFilter)
      && (productCategoryFilter === 'all' || product.categoria === productCategoryFilter);
  }), [productCategoryFilter, productGenreFilter, productSearch, products]);

  const showCustomerOrders = async (customer: Customer) => {
    if (!token) return;
    setSelectedCustomer(customer);
    try {
      setCustomerOrders(await fetchCustomerOrders(token, customer.email));
      setError('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo consultar el historial del cliente.');
      setCustomerOrders(null);
    }
  };

  const handleOrderState = async (order: Order, nextState: OrderState) => {
    if (!token) return;
    let comment: string | undefined;
    if (nextState === 'rechazado' || nextState === 'cancelado') {
      const answer = window.prompt(`Indica el motivo de ${nextState === 'rechazado' ? 'rechazo' : 'cancelación'}:`, '');
      if (answer === null) return;
      comment = answer;
      if (!comment?.trim()) return;
    }
    await runAction(
      () => updateOrderState(token, order.id, nextState, comment),
      `Pedido ${order.id} actualizado a ${nextState}.`,
    );
  };

  const renderDashboard = () => {
    const metricCards = [
      ['Ventas del día', formatCurrency(stats.ventasHoy), 'Órdenes pagadas o en proceso'],
      ['Ventas del mes', formatCurrency(stats.ventasMes), 'Acumulado real del mes'],
      ['Pedidos pendientes', String(stats.pedidosPendientes), 'Esperando revisión'],
      ['Pedidos aceptados', String(stats.pedidosAceptados), 'Órdenes confirmadas'],
      ['Productos disponibles', String(stats.productosDisponibles), 'Presentaciones con stock'],
      ['Stock bajo', String(stats.stockBajo), 'Hasta 10 unidades'],
      ['Agotados', String(stats.agotados), 'Sin unidades disponibles'],
    ];
    const maxSales = Math.max(1, ...stats.ventasUltimosSieteDias.map((day) => day.total));

    return <section className="panel">
      <div className="section-header">
        <div><p className="eyebrow">Resumen operativo</p><h2>Dashboard</h2></div>
        <button type="button" className="btn btn-ghost" onClick={() => token && void refreshData(token)} disabled={busy}>
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>
      <div className="stats-grid">
        {metricCards.map(([label, value, note], index) => (
          <div className={`stat-card ${index === 0 ? 'accent-gold' : index === 5 ? 'warning' : index === 6 ? 'danger' : ''}`} key={label}>
            <span className="stat-label">{label}</span><strong>{value}</strong><small>{note}</small>
          </div>
        ))}
      </div>
      <div className="charts-grid">
        <div className="mini-panel">
          <h3>Ventas de los últimos 7 días</h3>
          {stats.ventasUltimosSieteDias.length
            ? <div className="chart-bars">
              {stats.ventasUltimosSieteDias.map((day) => (
                <div className="chart-bar-group" key={day.fecha} title={`${day.fecha}: ${formatCurrency(day.total)}`}>
                  <span style={{ height: `${Math.max(4, day.total / maxSales * 100)}%` }} />
                  <small>{new Date(`${day.fecha}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short' })}</small>
                </div>
              ))}
            </div>
            : <p className="empty-state">Sin ventas para mostrar.</p>}
        </div>
        <div className="mini-panel">
          <h3>Productos más vendidos</h3>
          {stats.productosMasVendidos.length
            ? <ul className="rank-list">{stats.productosMasVendidos.map((product) => (
              <li key={product.productId}><span>{product.nombre} <small>({product.unidades} un.)</small></span><strong>{formatCurrency(product.ventas)}</strong></li>
            ))}</ul>
            : <p className="empty-state">Aún no hay ventas confirmadas.</p>}
        </div>
      </div>
      <div className="mini-panel table-panel">
        <h3>Últimos pedidos recibidos</h3>
        <div className="table-wrapper"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Canal</th><th>Estado</th><th>Total</th></tr></thead>
          <tbody>{orders.slice(0, 5).map((order) => <tr key={order.id}>
            <td>#{order.id.slice(0, 8)}</td><td>{order.nombre}</td><td>{order.canalVenta === 'presencial' ? 'Presencial' : 'Web'}</td>
            <td><span className="status status-pending">{order.estado}</span></td><td>{formatCurrency(order.total)}</td>
          </tr>)}
          {!orders.length && <tr><td colSpan={5} className="empty-state">No hay pedidos.</td></tr>}</tbody>
        </table></div>
      </div>
    </section>;
  };

  const renderCatalog = () => <section className="panel">
    <div className="section-header">
      <div><p className="eyebrow">Catálogo</p><h2>Catálogo de perfumes</h2></div>
      <button type="button" className="btn btn-primary" onClick={() => beginEditProduct()}><Plus size={16} /> Nuevo perfume</button>
    </div>
    <div className="toolbar">
      <input type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Buscar por nombre o marca" />
      <select value={productGenreFilter} onChange={(event) => setProductGenreFilter(event.target.value)}>
        <option value="all">Todos los géneros</option>{[...new Set(products.map((product) => product.genero))].sort().map((genre) => <option key={genre}>{genre}</option>)}
      </select>
      <select value={productCategoryFilter} onChange={(event) => setProductCategoryFilter(event.target.value)}>
        <option value="all">Todas las categorías</option>{[...new Set(products.map((product) => product.categoria))].sort().map((category) => <option key={category}>{category}</option>)}
      </select>
      <span className="record-count">{filteredProducts.length} productos</span>
    </div>
    <div className="table-wrapper"><table><thead><tr><th>Perfume</th><th>Género</th><th>Categoría</th><th>Precio</th><th>Stock base</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>{filteredProducts.map((product) => <tr key={product.id}>
        <td><div className="product-cell">
          {product.img ? <img className="product-thumb" src={imageUrl(product.img)} alt="" /> : <span className="product-badge"><Sparkles size={16} /></span>}
          <div><strong>{product.nombre}</strong><small>{product.marca}</small></div>
        </div></td>
        <td>{product.genero}</td><td>{product.categoria}</td><td>{formatCurrency(product.precio)}</td><td>{product.stock ?? '—'}</td>
        <td><span className={`status ${product.activo ? 'status-success' : 'status-cancelled'}`}>{product.activo ? 'Activo' : 'Inactivo'}</span></td>
        <td><div className="table-actions">
          <button type="button" className="btn btn-small" onClick={() => beginEditProduct(product)}>Editar</button>
          <button type="button" className="btn btn-small" onClick={() => token && void runAction(
            () => setProductActive(token, product.id, !product.activo),
            product.activo ? 'Producto desactivado en la tienda.' : 'Producto activado en la tienda.',
          )}>{product.activo ? 'Desactivar' : 'Activar'}</button>
          <button type="button" className="btn btn-small btn-danger" onClick={() => {
            if (window.confirm(`¿Eliminar ${product.nombre} del catálogo?`)) {
              if (token) void runAction(() => deleteProduct(token, product.id), 'Producto eliminado del catálogo.');
            }
          }}>Eliminar</button>
        </div></td>
      </tr>)}
      {!filteredProducts.length && <tr><td colSpan={7} className="empty-state">No se encontraron perfumes.</td></tr>}</tbody>
    </table></div>
  </section>;

  const renderInventory = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Control de existencias</p><h2>Inventario</h2></div></div>
    <form className="movement-form" onSubmit={(event) => void submitInventoryMovement(event)}>
      <label><span>Perfume</span><select required value={inventoryDraft.productId} onChange={(event) => setInventoryDraft((draft) => ({ ...draft, productId: event.target.value, presentationId: '' }))}>
        <option value="">Selecciona un perfume</option>{products.map((product) => <option value={product.id} key={product.id}>{product.nombre}</option>)}
      </select></label>
      <label><span>Presentación</span><select value={inventoryDraft.presentationId} onChange={(event) => setInventoryDraft((draft) => ({ ...draft, presentationId: event.target.value }))}>
        <option value="">Stock general</option>{availablePresentations.map((presentation) => <option key={presentation.id} value={presentation.id}>{presentation.mililitros ? `${presentation.mililitros} ml` : 'Estándar'} · {presentation.stock ?? selectedInventoryProduct?.stock ?? 0} u.</option>)}
      </select></label>
      <label><span>Movimiento</span><select value={inventoryDraft.operation} onChange={(event) => setInventoryDraft((draft) => ({ ...draft, operation: event.target.value as 'entrada' | 'ajuste' }))}>
        <option value="entrada">Entrada de mercancía</option><option value="ajuste">Ajuste</option>
      </select></label>
      {inventoryDraft.operation === 'ajuste' && <label><span>Dirección del ajuste</span><select value={inventoryDraft.direction} onChange={(event) => setInventoryDraft((draft) => ({ ...draft, direction: Number(event.target.value) as 1 | -1 }))}>
        <option value={1}>Aumentar</option><option value={-1}>Disminuir</option>
      </select></label>}
      <label><span>Unidades</span><input type="number" min="1" step="1" required value={inventoryDraft.quantity} onChange={(event) => setInventoryDraft((draft) => ({ ...draft, quantity: Number(event.target.value) }))} /></label>
      <label className="movement-reason"><span>Motivo (obligatorio para ajustes)</span><input value={inventoryDraft.motivo} onChange={(event) => setInventoryDraft((draft) => ({ ...draft, motivo: event.target.value }))} placeholder="Ej. conteo físico" /></label>
      <button type="submit" className="btn btn-primary" disabled={busy}><PackageCheck size={16} /> Registrar movimiento</button>
    </form>
    <div className="section-header history-heading"><div><p className="eyebrow">Trazabilidad</p><h3>Historial de movimientos</h3></div></div>
    <div className="table-wrapper"><table><thead><tr><th>Fecha</th><th>Producto</th><th>Presentación</th><th>Tipo</th><th>Cambio</th><th>Existencia</th><th>Motivo / pedido</th></tr></thead>
      <tbody>{movements.map((movement) => <tr key={movement.id}>
        <td>{formatDate(movement.createdAt)}</td><td>{movement.producto?.nombre ?? `#${movement.productoId}`}</td>
        <td>{movement.presentacion?.mililitros ? `${movement.presentacion.mililitros} ml` : 'General'}</td>
        <td><span className="status status-pending">{movement.tipo.replaceAll('_', ' ')}</span></td>
        <td className={movement.cantidad > 0 ? 'quantity-in' : 'quantity-out'}>{movement.cantidad > 0 ? '+' : ''}{movement.cantidad}</td>
        <td>{movement.stockAnterior} → {movement.stockNuevo}</td><td>{movement.motivo || (movement.pedidoId ? `Pedido ${movement.pedidoId.slice(0, 8)}` : '—')}</td>
      </tr>)}
      {!movements.length && <tr><td colSpan={7} className="empty-state">Aún no hay movimientos de inventario.</td></tr>}</tbody>
    </table></div>
  </section>;

  const renderOrders = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Gestión de pedidos</p><h2>Pedidos</h2></div></div>
    <div className="table-wrapper"><table><thead><tr><th>Pedido / fecha</th><th>Cliente</th><th>Contacto</th><th>Canal / pago</th><th>Estado</th><th>Total</th><th>Acciones</th></tr></thead>
      <tbody>{orders.map((order) => <tr key={order.id}>
        <td><button type="button" className="text-button" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>#{order.id.slice(0, 8)}</button><small>{formatDate(order.createdAt)}</small></td>
        <td>{order.nombre}<small>{order.ciudad}</small></td><td>{order.telefono}<small>{order.email}</small></td>
        <td>{order.canalVenta === 'presencial' ? `Presencial · ${order.metodoPago ?? ''}` : 'Web'}</td>
        <td><span className="status status-pending">{order.estado}</span></td><td>{formatCurrency(order.total)}</td>
        <td><div className="table-actions">
          {order.estado === 'pendiente' && <button type="button" className="btn btn-small" disabled={busy} onClick={() => void handleOrderState(order, 'pagado')}>Aceptar</button>}
          {!['rechazado', 'cancelado', 'entregado'].includes(order.estado) && <select aria-label="Cambiar estado" value="" onChange={(event) => {
            if (event.target.value) void handleOrderState(order, event.target.value as OrderState);
          }}>
            <option value="">Cambiar estado</option>{(['preparando', 'enviado', 'entregado', 'cancelado', 'rechazado'] as OrderState[]).map((state) => <option value={state} key={state}>{state}</option>)}
          </select>}
          {order.comprobante && <a className="btn btn-small" href={imageUrl(order.comprobante)} target="_blank" rel="noreferrer">Comprobante</a>}
        </div></td>
      </tr>)}
      {expandedOrder && orders.find((order) => order.id === expandedOrder) && <tr className="expanded-order"><td colSpan={7}>
        {(() => {
          const order = orders.find((entry) => entry.id === expandedOrder)!;
          return <div><strong>Detalle del pedido {order.id}</strong><p>{order.direccion}, {order.ciudad}</p>
            <ul>{order.items?.map((item) => <li key={item.id}>{item.nombreProducto ?? item.producto?.nombre} {item.mililitros ? `${item.mililitros} ml` : ''} × {item.cantidad} · {formatCurrency(item.precio)}</li>)}</ul>
            {order.comentarioCancelacion && <p>Motivo: {order.comentarioCancelacion}</p>}
          </div>;
        })()}
      </td></tr>}
      {!orders.length && <tr><td colSpan={7} className="empty-state">No hay pedidos.</td></tr>}</tbody>
    </table></div>
    <p className="helper-text">El inventario web se descuenta al crear el pedido. Aceptarlo o cambiar su estado no descuenta nuevamente; cancelar o rechazar genera un reintegro único.</p>
  </section>;

  const renderPos = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Caja</p><h2>Ventas presenciales</h2></div></div>
    <div className="pos-layout">
      <div className="pos-list">
        {products.filter((product) => product.activo).map((product) => (
          <div className="pos-product-card" key={product.id}>
            {product.img && <img className="pos-image" src={imageUrl(product.img)} alt="" />}
            <strong>{product.nombre}</strong><small>{product.marca}</small>
            {product.presentaciones.filter((presentation) => presentation.activo).length
              ? product.presentaciones.filter((presentation) => presentation.activo).map((presentation) => (
                <button type="button" key={presentation.id} className="pos-product" disabled={(presentation.stock ?? product.stock ?? 0) <= 0}
                  onClick={() => addSaleLine(product, presentation)}>
                  <span>{presentation.mililitros ? `${presentation.mililitros} ml` : 'Estándar'} · {presentation.stock ?? product.stock ?? 0} disponibles</span>
                  <small>{formatCurrency(presentation.precio)} · Agregar</small>
                </button>
              ))
              : <button type="button" className="pos-product" disabled={(product.stock ?? 0) <= 0} onClick={() => addSaleLine(product)}>
                <span>{product.stock ?? 0} disponibles</span><small>{formatCurrency(product.precio)} · Agregar</small>
              </button>}
          </div>
        ))}
        {!products.length && <p className="empty-state">No hay productos conectados al catálogo.</p>}
      </div>
      <div className="sale-summary">
        <h3>Resumen de venta</h3>
        {!saleLines.length && <p className="empty-state">Agrega perfumes para iniciar la venta.</p>}
        {saleLines.map((line) => <div className="sale-row sale-row-edit" key={line.key}>
          <span>{line.product.nombre} {line.presentation?.mililitros ? `${line.presentation.mililitros} ml` : ''}<small>{formatCurrency(line.presentation?.precio ?? line.product.precio)} c/u</small></span>
          <input aria-label={`Cantidad de ${line.product.nombre}`} type="number" min="1" value={line.quantity} onChange={(event) => setSaleLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: Math.max(1, Number(event.target.value)) } : item))} />
          <button type="button" className="icon-button" aria-label="Quitar producto" onClick={() => setSaleLines((current) => current.filter((item) => item.key !== line.key))}><X size={15} /></button>
        </div>)}
        <label><span>Método de pago</span><select value={salePayment} onChange={(event) => setSalePayment(event.target.value as SaleRequest['metodoPago'])}><option>Efectivo</option><option>Nequi</option></select></label>
        <div className="sale-total"><span>Subtotal antes de promoción</span><strong>{formatCurrency(saleSubtotal)}</strong></div>
        <p className="helper-text">El backend calcula y aplica la promoción vigente al registrar la venta.</p>
        <button type="button" className="btn btn-primary wide" disabled={busy || !saleLines.length} onClick={() => {
          if (window.confirm('¿Confirmar la venta y descontar el inventario compartido?')) void submitSale();
        }}><CircleDollarSign size={16} /> Registrar venta</button>
      </div>
    </div>
  </section>;

  const renderPromotions = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Marketing</p><h2>Promociones</h2></div>
      <button type="button" className="btn btn-primary" onClick={() => setPromotionDraft(newPromotionDraft())}><Plus size={16} /> Nueva promoción</button>
    </div>
    <div className="cards-grid">
      {promotions.map((promo) => <div className="promo-card" key={promo.id}>
        <div className="promo-head"><strong>{promo.nombre}</strong><span className={`status ${promo.activa ? 'status-success' : 'status-cancelled'}`}>{promo.activa ? 'Activa' : 'Inactiva'}</span></div>
        <p>{promo.tipo}{promo.tipo === 'PORCENTAJE' ? ` · ${promo.valor}%` : promo.tipo === 'MONTO' ? ` · ${formatCurrency(promo.valor)}` : ''}</p>
        <small>{promo.fechaInicio} — {promo.fechaFin} · Género: {promo.genero}</small>
        <small>{promo.productos?.length ? `Productos: ${promo.productos.map((item) => item.nombre).join(', ')}` : 'Aplica a todos los productos'}</small>
        <div className="table-actions">
          <button type="button" className="btn btn-small" onClick={() => setPromotionDraft({
            id: promo.id, nombre: promo.nombre, tipo: promo.tipo, valor: promo.valor,
            fechaInicio: promo.fechaInicio, fechaFin: promo.fechaFin, activa: promo.activa,
            genero: promo.genero, prioridad: promo.prioridad,
            productIds: promo.productos?.map((item) => item.id) ?? [],
            presentationIds: promo.presentaciones?.map((item) => item.id) ?? [],
          })}>Editar</button>
          <button type="button" className="btn btn-small" disabled={busy} onClick={() => token && void runAction(
            () => setPromotionActive(token, promo.id, !promo.activa),
            promo.activa ? 'Promoción desactivada.' : 'Promoción activada.',
          )}>{promo.activa ? 'Desactivar' : 'Activar'}</button>
        </div>
      </div>)}
      {!promotions.length && <p className="empty-state">No hay promociones en el backend.</p>}
    </div>
  </section>;

  const renderCustomers = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Clientes web</p><h2>Base de clientes</h2></div></div>
    <div className="toolbar"><div className="search-field"><Search size={16} /><input type="search" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Buscar nombre, correo o teléfono" /></div></div>
    <div className="table-wrapper"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Ciudad</th><th>Pedidos</th><th>Total compras</th><th></th></tr></thead>
      <tbody>{customers.map((customer) => <tr key={customer.id}>
        <td>{customer.nombre}</td><td>{customer.email}</td><td>{customer.telefono}</td><td>{customer.ciudad}</td>
        <td>{customer.pedidos}</td><td>{formatCurrency(customer.totalCompras)}</td>
        <td><button type="button" className="btn btn-small" onClick={() => void showCustomerOrders(customer)}>Historial</button></td>
      </tr>)}
      {!customers.length && <tr><td colSpan={7} className="empty-state">No hay clientes web con pedidos.</td></tr>}</tbody>
    </table></div>
    {selectedCustomer && <div className="mini-panel customer-history">
      <div className="section-header"><div><h3>Pedidos de {selectedCustomer.nombre}</h3><small>{selectedCustomer.email}</small></div>
        <button type="button" className="icon-button" aria-label="Cerrar historial" onClick={() => { setSelectedCustomer(null); setCustomerOrders(null); }}><X size={17} /></button>
      </div>
      {customerOrders?.map((order) => <div className="history-order" key={order.id}>
        <strong>#{order.id.slice(0, 8)} · {order.estado} · {formatCurrency(order.total)}</strong><small>{formatDate(order.createdAt)}</small>
        <ul>{order.items?.map((item) => <li key={item.id}>{item.nombreProducto} × {item.cantidad}</li>)}</ul>
      </div>)}
      {customerOrders && !customerOrders.length && <p className="empty-state">Este cliente no tiene pedidos.</p>}
    </div>}
  </section>;

  const renderReviews = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Reseñas existentes</p><h2>Opiniones</h2></div></div>
    <div className="review-list">
      {reviews.map((review) => <div className="review-card" key={review.id}>
        <div className="review-top"><strong>{review.nombre}</strong><span>{'★'.repeat(review.calificacion)}{'☆'.repeat(5 - review.calificacion)}</span></div>
        <small>{review.producto?.nombre ?? `Producto #${review.productoId ?? '—'}`} · {formatDate(review.createdAt)}</small>
        <p>{review.opinion}</p><span className={`status ${review.activa ? 'status-success' : 'status-cancelled'}`}>{review.activa ? 'Visible en la tienda' : 'Oculta'}</span>
        <div className="table-actions">
          <button type="button" className="btn btn-small" disabled={busy} onClick={() => token && void runAction(
            () => setReviewActive(token, review.id, !review.activa),
            review.activa ? 'Opinión ocultada de la tienda.' : 'Opinión aprobada y visible en la tienda.',
          )}>{review.activa ? 'Ocultar' : 'Aprobar'}</button>
          <button type="button" className="btn btn-small btn-danger" onClick={() => {
            if (window.confirm('¿Eliminar esta opinión definitivamente?') && token) {
              void runAction(() => deleteReview(token, review.id), 'Opinión eliminada.');
            }
          }}>Eliminar</button>
        </div>
      </div>)}
      {!reviews.length && <p className="empty-state">No hay opiniones guardadas.</p>}
    </div>
  </section>;

  const renderAdministration = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Acceso administrativo</p><h2>Administración</h2></div></div>
    <div className="cards-grid admin-grid">
      <div className="mini-panel"><h3>Cuenta activa</h3><ul className="feature-list">
        <li><ShieldCheck size={16} /> Sesión verificada por el backend</li>
        <li><UserRound size={16} /> {userName}</li>
        <li><RefreshCw size={16} /> Sincronización automática cada 30 segundos</li>
      </ul></div>
      <div className="mini-panel"><h3>Resumen de registros</h3><ul className="feature-list">
        <li><Boxes size={16} /> {products.length} perfumes cargados</li>
        <li><CreditCard size={16} /> {orders.length} pedidos</li>
        <li><Sparkles size={16} /> {promotions.length} promociones</li>
      </ul></div>
    </div>
  </section>;

  const renderSettings = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Conexión</p><h2>Configuración</h2></div></div>
    <div className="settings-card">
      <label><span>URL del backend REST</span><input type="url" value={apiBaseUrl} onChange={(event) => setApiBaseUrl(event.target.value)} placeholder="https://tu-api.example.com" /></label>
      <p className="helper-text">Usa HTTPS para servidores remotos. HTTP se permite únicamente para localhost durante desarrollo.</p>
      <button type="button" className="btn btn-primary" onClick={() => {
        const normalized = apiBaseUrl.trim().replace(/\/$/, '');
        let parsed: URL;
        try { parsed = new URL(normalized); } catch { setError('La URL del backend no es válida.'); return; }
        if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
          setError('El backend remoto debe utilizar HTTPS.');
          return;
        }
        saveApiBaseUrl(normalized);
        setApiBaseUrl(normalized);
        setMessage('URL guardada. Comprueba la conexión actualizando los datos.');
      }}>Guardar URL</button>
      <div className="connection-state"><span className={`dot ${lastRefresh ? 'online' : 'offline'}`} />
        {lastRefresh ? `Última sincronización: ${formatDate(lastRefresh.toISOString())}` : 'Esperando conexión con el backend.'}
      </div>
    </div>
  </section>;

  const sectionContent: Record<MenuKey, React.ReactNode> = {
    dashboard: renderDashboard(),
    catalog: renderCatalog(),
    inventory: renderInventory(),
    orders: renderOrders(),
    pos: renderPos(),
    promotions: renderPromotions(),
    customers: renderCustomers(),
    reviews: renderReviews(),
    administration: renderAdministration(),
    settings: renderSettings(),
  };

  if (!token) return <div className="auth-shell"><div className="auth-card">
    <div className="auth-brand"><span className="brand-mark"><Sparkles size={18} /></span><div><strong>Sublime Gracia</strong><small>Admin Desktop</small></div></div>
    <h1>Iniciar sesión</h1><p>Ingresa con tu usuario administrador de Sublime Gracia.</p>
    <form onSubmit={(event) => void handleLogin(event)} className="auth-form">
      <label><span>Correo</span><input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label><span>Contraseña</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      {error && <div className="alert-box" role="alert">{error}</div>}
      <button type="submit" className="btn btn-primary wide" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</button>
    </form>
  </div></div>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="sidebar-brand"><div className="brand-mark"><Sparkles size={20} /></div><div><strong>Sublime Gracia</strong><small>Panel Administrativo</small></div></div>
      <nav className="nav-menu">{navigation.map(({ key, label, icon: Icon }) => <button key={key} type="button"
        className={`nav-item ${selectedSection === key ? 'active' : ''}`} onClick={() => setSelectedSection(key)}>
        <Icon size={18} /><span>{label}</span><ChevronRight size={14} />
      </button>)}</nav>
    </aside>
    <main className="main-panel">
      <header className="topbar"><div><p className="eyebrow">Sistema interno</p><h1>Sublime Gracia Admin</h1></div>
        <div className="topbar-actions"><div className="user-badge"><UserRound size={16} /><span>{userName}</span></div>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}><LogOut size={16} /> Cerrar sesión</button>
        </div>
      </header>
      <div className={`server-banner ${lastRefresh ? 'connected' : 'disconnected'}`}>
        <span className={`dot ${lastRefresh ? 'online' : 'offline'}`} />
        {lastRefresh ? `Conectado · Actualizado ${formatDate(lastRefresh.toISOString())}` : 'Sin conexión confirmada con el servidor'}
        <button type="button" className="icon-button" aria-label="Actualizar datos" disabled={busy} onClick={() => void refreshData(token)}><RefreshCw size={15} /></button>
      </div>
      {(message || error) && <div className={error ? 'alert-box' : 'status-banner'} role={error ? 'alert' : 'status'}>{error || message}</div>}
      {loading && <div className="loading-box">Sincronizando información…</div>}
      {!loading && sectionContent[selectedSection]}
    </main>

    {productDraft && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) setProductDraft(null);
    }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
      <div className="modal-heading"><div><p className="eyebrow">{productDraft.id ? 'Editar catálogo' : 'Nuevo producto'}</p><h2 id="product-modal-title">{productDraft.id ? 'Editar perfume' : 'Agregar perfume'}</h2></div>
        <button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setProductDraft(null)}><X size={18} /></button></div>
      <form className="form-grid" onSubmit={(event) => void handleSaveProduct(event)}>
        <label><span>Nombre</span><input required value={productDraft.nombre} onChange={(event) => setProductDraft({ ...productDraft, nombre: event.target.value })} /></label>
        <label><span>Marca</span><input required value={productDraft.marca ?? ''} onChange={(event) => setProductDraft({ ...productDraft, marca: event.target.value })} /></label>
        <label><span>Género</span><select value={productDraft.genero} onChange={(event) => setProductDraft({ ...productDraft, genero: event.target.value })}><option>HOMBRE</option><option>MUJER</option><option>UNISEX</option></select></label>
        <label><span>Categoría</span><select value={productDraft.categoria} onChange={(event) => setProductDraft({ ...productDraft, categoria: event.target.value })}>{['Amaderadas', 'Árabes', 'Cítricas', 'Aromáticas', 'Floral', 'Frutales', 'Dulces', 'Frescas', 'Especiadas', 'Otros'].map((category) => <option key={category}>{category}</option>)}</select></label>
        <label><span>Precio base</span><input required type="number" min="1" step="1" value={productDraft.precio} onChange={(event) => setProductDraft({ ...productDraft, precio: Number(event.target.value) })} /></label>
        <label><span>Stock general</span><input required type="number" min="0" step="1" value={productDraft.stock ?? 0} onChange={(event) => setProductDraft({ ...productDraft, stock: Number(event.target.value) })} /></label>
        <label className="form-full"><span>Descripción</span><textarea required value={productDraft.descripcion} onChange={(event) => setProductDraft({ ...productDraft, descripcion: event.target.value })} /></label>
        <label className="form-full"><span>Imagen {productDraft.id ? '(opcional para conservar la actual)' : '(obligatoria)'}</span><input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" required={!productDraft.id && !productDraft.img} onChange={(event) => setProductImage(event.target.files?.[0])} /></label>
        <div className="form-full presentations-editor"><div className="modal-heading"><h3>Presentaciones y existencias</h3><button type="button" className="btn btn-small" onClick={() => setProductDraft({ ...productDraft, presentaciones: [...productDraft.presentaciones, { mililitros: null, precio: productDraft.precio, stock: 0, activo: true }] })}><Plus size={14} /> Añadir</button></div>
          {productDraft.presentaciones.map((presentation, index) => <div className="presentation-row" key={presentation.id ?? `new-${index}`}>
            <label><span>Mililitros</span><input type="number" min="1" value={presentation.mililitros ?? ''} placeholder="Estándar" onChange={(event) => updateProductPresentation(index, { mililitros: event.target.value ? Number(event.target.value) : null })} /></label>
            <label><span>Precio</span><input required type="number" min="1" value={presentation.precio} onChange={(event) => updateProductPresentation(index, { precio: Number(event.target.value) })} /></label>
            <label><span>Stock</span><input required type="number" min="0" value={presentation.stock ?? 0} onChange={(event) => updateProductPresentation(index, { stock: Number(event.target.value) })} /></label>
            <button type="button" className="icon-button" aria-label="Quitar presentación" disabled={productDraft.presentaciones.length <= 1} onClick={() => setProductDraft({ ...productDraft, presentaciones: productDraft.presentaciones.filter((_, itemIndex) => itemIndex !== index) })}><X size={15} /></button>
          </div>)}
        </div>
        <label className="checkbox-line"><input type="checkbox" checked={productDraft.activo} onChange={(event) => setProductDraft({ ...productDraft, activo: event.target.checked })} /><span>Activo en la tienda</span></label>
        <div className="form-actions form-full"><button type="button" className="btn btn-ghost" onClick={() => setProductDraft(null)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar perfume'}</button></div>
      </form>
    </div></div>}

    {promotionDraft && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) setPromotionDraft(null);
    }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="promotion-modal-title">
      <div className="modal-heading"><div><p className="eyebrow">Promociones</p><h2 id="promotion-modal-title">{promotionDraft.id ? 'Editar promoción' : 'Nueva promoción'}</h2></div>
        <button type="button" className="icon-button" aria-label="Cerrar" onClick={() => setPromotionDraft(null)}><X size={18} /></button></div>
      <form className="form-grid" onSubmit={(event) => void handleSavePromotion(event)}>
        <label className="form-full"><span>Nombre</span><input required value={promotionDraft.nombre} onChange={(event) => setPromotionDraft({ ...promotionDraft, nombre: event.target.value })} /></label>
        <label><span>Tipo</span><select value={promotionDraft.tipo} onChange={(event) => setPromotionDraft({ ...promotionDraft, tipo: event.target.value as PromotionDraft['tipo'] })}>{['PORCENTAJE', 'MONTO', '2X1', '3X2'].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label><span>Valor (porcentaje o monto)</span><input type="number" min="0" step="1" value={promotionDraft.valor} onChange={(event) => setPromotionDraft({ ...promotionDraft, valor: Number(event.target.value) })} /></label>
        <label><span>Inicio</span><input type="date" required value={promotionDraft.fechaInicio} onChange={(event) => setPromotionDraft({ ...promotionDraft, fechaInicio: event.target.value })} /></label>
        <label><span>Fin</span><input type="date" required value={promotionDraft.fechaFin} onChange={(event) => setPromotionDraft({ ...promotionDraft, fechaFin: event.target.value })} /></label>
        <label><span>Género</span><select value={promotionDraft.genero} onChange={(event) => setPromotionDraft({ ...promotionDraft, genero: event.target.value as PromotionDraft['genero'] })}><option>TODOS</option><option>HOMBRE</option><option>MUJER</option></select></label>
        <label><span>Prioridad</span><input type="number" min="0" step="1" value={promotionDraft.prioridad} onChange={(event) => setPromotionDraft({ ...promotionDraft, prioridad: Number(event.target.value) })} /></label>
        <div className="form-full product-checklist"><span>Productos aplicables (sin selección: todos)</span>
          {products.map((product) => <label key={product.id} className="checkbox-line">
            <input type="checkbox" checked={promotionDraft.productIds.includes(product.id)} onChange={(event) => setPromotionDraft({
              ...promotionDraft,
              productIds: event.target.checked ? [...promotionDraft.productIds, product.id] : promotionDraft.productIds.filter((id) => id !== product.id),
            })} /><span>{product.nombre}</span>
          </label>)}
          <div className="form-full presentation-checklist"><strong>Presentaciones aplicables</strong>
            <small>Si no marcas presentaciones, se aplican todas las presentaciones de los productos seleccionados.</small>
            {products.flatMap((product) => product.presentaciones.filter((presentation) => presentation.activo && presentation.id).map((presentation) => (
              <label key={presentation.id} className="checkbox-line">
                <input type="checkbox" checked={promotionDraft.presentationIds.includes(presentation.id!)} onChange={(event) => setPromotionDraft({
                  ...promotionDraft,
                  presentationIds: event.target.checked
                    ? [...promotionDraft.presentationIds, presentation.id!]
                    : promotionDraft.presentationIds.filter((id) => id !== presentation.id),
                })} />
                <span>{product.nombre} · {presentation.mililitros ? `${presentation.mililitros} ml` : 'Estándar'}</span>
              </label>
            )))}
          </div>
        </div>
        <label className="checkbox-line"><input type="checkbox" checked={promotionDraft.activa} onChange={(event) => setPromotionDraft({ ...promotionDraft, activa: event.target.checked })} /><span>Activa</span></label>
        <div className="form-actions form-full"><button type="button" className="btn btn-ghost" onClick={() => setPromotionDraft(null)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar promoción'}</button></div>
      </form>
    </div></div>}
  </div>;
}

export default App;
