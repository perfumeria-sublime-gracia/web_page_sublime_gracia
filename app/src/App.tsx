import {
  ArrowRightLeft,
  Boxes,
  BriefcaseBusiness,
  CalendarDays,
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
  Trash2,
  UserRound,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  deleteProduct,
  deleteReview,
  deleteSeason,
  fetchCustomerOrders,
  fetchCustomers,
  fetchDashboard,
  fetchInventoryMovements,
  fetchOrders,
  fetchProducts,
  fetchPromotions,
  fetchReviews,
  fetchSeasons,
  loginAdmin,
  registerInventoryMovement,
  registerSale,
  resolveBaseUrl,
  saveApiBaseUrl,
  saveProduct,
  savePromotion,
  saveSeason,
  setProductActive,
  setPromotionActive,
  setReviewActive,
  setSeasonActive,
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
  Season,
  SeasonColors,
  SeasonDecoration,
  SaleRequest,
} from './types';

const navigation = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'catalog', label: 'Catálogo', icon: PackageSearch },
  { key: 'inventory', label: 'Inventario', icon: Warehouse },
  { key: 'orders', label: 'Pedidos', icon: BriefcaseBusiness },
  { key: 'pos', label: 'Ventas presenciales', icon: ShoppingCart },
  { key: 'promotions', label: 'Promociones', icon: Percent },
  { key: 'seasons', label: 'Temporadas y apariencia', icon: CalendarDays },
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
type SeasonDraft = Omit<Season, 'id' | 'estado'> & { id?: number };

type ProductDraft = Omit<Product, 'id'> & { id?: number };
type PromotionDraft = Omit<Promotion, 'id' | 'productos' | 'presentaciones'> & {
  id?: number;
  productIds: number[];
  presentationIds: number[];
};
type CartLine = {
  key: string;
  product: Product;
  presentationId?: number;
  presentation?: Product['presentaciones'][number];
  quantity: number;
  freeSale?: boolean;
  customPrice?: number;
  soldMilliliters?: number;
};

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
  img: null,
  seleccionEspecifica: true,
  productIds: [],
  presentationIds: [],
});

const seasonColorLabels: Array<{ key: keyof SeasonColors; label: string }> = [
  { key: 'principal', label: 'Principal' },
  { key: 'secundario', label: 'Secundario' },
  { key: 'acento', label: 'Acento' },
  { key: 'fondo', label: 'Fondo' },
  { key: 'texto', label: 'Texto' },
  { key: 'boton', label: 'Botón' },
  { key: 'decorativo', label: 'Decorativo' },
];

const seasonTemplates: Array<{
  nombre: string;
  tema: string;
  decoracion: SeasonDecoration;
  colores: SeasonColors;
}> = [
  { nombre: 'San Valentín', tema: 'Amor romántico', decoracion: 'hearts', colores: { principal: '#9f3153', secundario: '#f5d9df', acento: '#cf6b83', fondo: '#fff7f7', texto: '#39232b', boton: '#9f3153', decorativo: '#e8a4b2' } },
  { nombre: 'Día de la Mujer', tema: 'Celebración de la mujer', decoracion: 'floral', colores: { principal: '#76586f', secundario: '#eee4ec', acento: '#a7869f', fondo: '#fcf8fb', texto: '#302630', boton: '#6f5268', decorativo: '#d5bfd1' } },
  { nombre: 'Día de la Madre', tema: 'Homenaje a mamá', decoracion: 'floral', colores: { principal: '#a64c63', secundario: '#f3d9df', acento: '#d3919e', fondo: '#fff8f8', texto: '#3e2a2d', boton: '#a64c63', decorativo: '#e7b6be' } },
  { nombre: 'Día del Padre', tema: 'Celebración del padre', decoracion: 'stars', colores: { principal: '#34546c', secundario: '#d8e4eb', acento: '#7e9cae', fondo: '#f6f9fa', texto: '#26333a', boton: '#34546c', decorativo: '#a8bfcb' } },
  { nombre: 'Amor y Amistad', tema: 'Amor y amistad', decoracion: 'hearts', colores: { principal: '#a5414c', secundario: '#f2d8d8', acento: '#d17b78', fondo: '#fff8f5', texto: '#3e2928', boton: '#a5414c', decorativo: '#e9b2a7' } },
  { nombre: 'Halloween', tema: 'Halloween', decoracion: 'pumpkins', colores: { principal: '#8a4a25', secundario: '#f0d7c3', acento: '#d1813c', fondo: '#fbf5ef', texto: '#30251f', boton: '#8a4a25', decorativo: '#b97137' } },
  { nombre: 'Black Friday', tema: 'Black Friday', decoracion: 'stars', colores: { principal: '#262323', secundario: '#ded8cf', acento: '#c4a366', fondo: '#f7f5f1', texto: '#211e1a', boton: '#262323', decorativo: '#c4a366' } },
  { nombre: 'Navidad', tema: 'Navidad', decoracion: 'snowflakes', colores: { principal: '#315747', secundario: '#e5eee7', acento: '#a84a45', fondo: '#f7faf6', texto: '#27342c', boton: '#315747', decorativo: '#c8a86c' } },
  { nombre: 'Año Nuevo', tema: 'Año Nuevo', decoracion: 'confetti', colores: { principal: '#69543a', secundario: '#eee5d3', acento: '#b99661', fondo: '#fbf8f1', texto: '#30281d', boton: '#69543a', decorativo: '#d2b979' } },
  { nombre: 'Cyber Monday', tema: 'Cyber Monday', decoracion: 'confetti', colores: { principal: '#38556f', secundario: '#e1e9ef', acento: '#7894a8', fondo: '#f7f9fb', texto: '#26323a', boton: '#34516a', decorativo: '#a9bdca' } },
  { nombre: 'Primavera', tema: 'Primavera', decoracion: 'leaves', colores: { principal: '#557448', secundario: '#e5eddc', acento: '#b1a65d', fondo: '#f9fbf4', texto: '#2d3527', boton: '#557448', decorativo: '#9daf79' } },
];

const bogotaInputValue = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Date(date.getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 16);
};

const newSeasonDraft = (): SeasonDraft => {
  const start = new Date();
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    nombre: 'Temporada personalizada',
    descripcion: '',
    tema: 'Personalizada',
    colores: { principal: '#302015', secundario: '#f3e8d8', acento: '#b99661', fondo: '#faf6ef', texto: '#29221c', boton: '#21160f', decorativo: '#d8bd91' },
    decoracion: 'none',
    intensidad: 1,
    fechaInicio: bogotaInputValue(start),
    fechaFin: bogotaInputValue(end),
    habilitada: false,
  };
};

const formatBogotaDate = (value: string) => new Date(value).toLocaleString('es-CO', {
  timeZone: 'America/Bogota',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
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
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonDraft, setSeasonDraft] = useState<SeasonDraft | null>(null);
  const [seasonTemplate, setSeasonTemplate] = useState('');
  const [seasonPreview, setSeasonPreview] = useState(false);
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
  const [promotionImage, setPromotionImage] = useState<File | undefined>();
  const [promotionImagePreview, setPromotionImagePreview] = useState('');
  const [promotionGenreFilter, setPromotionGenreFilter] = useState('all');
  const [promotionPresentationFilter, setPromotionPresentationFilter] = useState('all');
  const [saleLines, setSaleLines] = useState<CartLine[]>([]);
  const [salePayment, setSalePayment] = useState<SaleRequest['metodoPago']>('Efectivo');
  const [saleCustomerName, setSaleCustomerName] = useState('');
  const [saleCustomerPhone, setSaleCustomerPhone] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [posGenreFilter, setPosGenreFilter] = useState('all');
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

  const refreshSeasons = useCallback(async (authToken: string) => {
    setSeasons(await fetchSeasons(authToken));
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
    if (!token) {
      setSeasons([]);
      return undefined;
    }
    let active = true;
    const loadSeasons = async () => {
      try {
        const values = await fetchSeasons(token);
        if (active) setSeasons(values);
      } catch (requestError) {
        if (active) setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las temporadas.');
      }
    };
    void loadSeasons();
    const timer = window.setInterval(() => void loadSeasons(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token]);

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

  useEffect(() => () => {
    if (promotionImagePreview.startsWith('blob:')) URL.revokeObjectURL(promotionImagePreview);
  }, [promotionImagePreview]);

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
    setSeasons([]);
    setSeasonDraft(null);
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
      await savePromotion(token, promotionDraft, promotionImage);
      setPromotionDraft(null);
      setPromotionImage(undefined);
      setPromotionImagePreview('');
    }, 'Promoción guardada y sincronizada.');
  };

  const handleSaveSeason = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!seasonDraft || !token) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveSeason(token, seasonDraft);
      setSeasonDraft({
        ...saved,
        descripcion: saved.descripcion ?? '',
        fechaInicio: bogotaInputValue(saved.fechaInicio),
        fechaFin: bogotaInputValue(saved.fechaFin),
      });
      setMessage('Temporada guardada. La programación se aplica automáticamente según las fechas de Bogotá.');
      try {
        await refreshSeasons(token);
      } catch (refreshError) {
        setError(`La temporada se guardó, pero no se pudo actualizar la lista: ${refreshError instanceof Error ? refreshError.message : 'error de conexión.'}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo guardar la temporada.');
    } finally {
      setBusy(false);
    }
  };

  const runSeasonAction = async (action: () => Promise<unknown>, successMessage: string) => {
    if (!token) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(successMessage);
      try {
        await refreshSeasons(token);
      } catch (refreshError) {
        setError(`El cambio se guardó, pero no se pudo actualizar la lista: ${refreshError instanceof Error ? refreshError.message : 'error de conexión.'}`);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'La operación de temporada no pudo completarse.');
    } finally {
      setBusy(false);
    }
  };

  const beginEditSeason = (season?: Season) => {
    if (!season) {
      setSeasonDraft(newSeasonDraft());
      setSeasonTemplate('');
      setSeasonPreview(false);
      return;
    }
    setSeasonDraft({
      ...season,
      descripcion: season.descripcion ?? '',
      fechaInicio: bogotaInputValue(season.fechaInicio),
      fechaFin: bogotaInputValue(season.fechaFin),
    });
    setSeasonTemplate(seasonTemplates.some((template) => template.nombre === season.nombre) ? season.nombre : '');
    setSeasonPreview(false);
  };

  const beginEditPromotion = (promotion?: Promotion) => {
    setPromotionImage(undefined);
    setPromotionImagePreview('');
    setPromotionGenreFilter('all');
    setPromotionPresentationFilter('all');
    setPromotionDraft(promotion ? {
      id: promotion.id,
      nombre: promotion.nombre,
      tipo: promotion.tipo,
      valor: promotion.valor,
      fechaInicio: promotion.fechaInicio,
      fechaFin: promotion.fechaFin,
      activa: promotion.activa,
      genero: promotion.genero,
      prioridad: promotion.prioridad,
      img: promotion.img ?? null,
      seleccionEspecifica: promotion.seleccionEspecifica ?? false,
      productIds: promotion.productos?.map((item) => item.id) ?? [],
      presentationIds: promotion.presentaciones?.map((item) => item.id) ?? [],
    } : newPromotionDraft());
  };

  const selectPromotionImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Elige una imagen JPG, JPEG, PNG o WEBP.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen de la promoción no puede superar 5 MB.');
      event.target.value = '';
      return;
    }
    setError('');
    setPromotionImage(file);
    setPromotionImagePreview(URL.createObjectURL(file));
    setPromotionDraft((current) => current && ({ ...current, img: null }));
  };

  const removePromotionImage = () => {
    setPromotionImage(undefined);
    setPromotionImagePreview('');
    setPromotionDraft((current) => current && ({ ...current, img: null }));
  };

  const togglePromotionProduct = (product: Product, selected: boolean) => {
    setPromotionDraft((current) => {
      if (!current) return current;
      const productPresentationIds = product.presentaciones
        .filter((presentation) => presentation.activo && presentation.id)
        .map((presentation) => presentation.id!);
      const productIds = selected
        ? [...new Set([...current.productIds, product.id])]
        : current.productIds.filter((id) => id !== product.id);
      const presentationIds = selected
        ? [...new Set([...current.presentationIds, ...productPresentationIds])]
        : current.presentationIds.filter((id) => !productPresentationIds.includes(id));
      return { ...current, seleccionEspecifica: true, productIds, presentationIds };
    });
  };

  const togglePromotionPresentation = (product: Product, presentationId: number, selected: boolean) => {
    setPromotionDraft((current) => {
      if (!current) return current;
      const presentationIds = selected
        ? [...new Set([...current.presentationIds, presentationId])]
        : current.presentationIds.filter((id) => id !== presentationId);
      const selectedForProduct = product.presentaciones.some((presentation) =>
        presentation.id !== presentationId && presentationIds.includes(presentation.id ?? -1));
      const productIds = selected
        ? [...new Set([...current.productIds, product.id])]
        : selectedForProduct
          ? current.productIds
          : current.productIds.filter((id) => id !== product.id);
      return { ...current, seleccionEspecifica: true, productIds, presentationIds };
    });
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

  const addFreeSaleLine = (product: Product, presentation?: Product['presentaciones'][number]) => {
    setSaleLines((current) => [...current, {
      key: `free-${product.id}-${presentation?.id ?? 'base'}-${crypto.randomUUID()}`,
      product,
      presentation,
      presentationId: presentation?.id,
      quantity: 1,
      freeSale: true,
    }]);
  };

  const saleSubtotal = saleLines.reduce((sum, line) =>
    sum + Number(line.customPrice ?? line.presentation?.precio ?? line.product.precio) * line.quantity, 0);
  const hasInvalidFreeSale = saleLines.some((line) => line.freeSale && (
    !Number.isInteger(line.customPrice) || Number(line.customPrice) <= 0 ||
    !Number.isInteger(line.soldMilliliters) || Number(line.soldMilliliters) <= 0 ||
    (line.presentation?.mililitros != null && Number(line.soldMilliliters) > line.presentation.mililitros)
  ));
  const hasPartialSaleCustomer = Boolean(saleCustomerName.trim()) !== Boolean(saleCustomerPhone.trim());

  const submitSale = async () => {
    if (!token || !saleLines.length) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await registerSale(token, {
        metodoPago: salePayment,
        ...(saleCustomerName.trim() && saleCustomerPhone.trim()
          ? { cliente: { nombre: saleCustomerName.trim(), telefono: saleCustomerPhone.trim() } }
          : {}),
        items: saleLines.map((line) => ({
          productId: line.product.id,
          ...(line.presentationId ? { presentationId: line.presentationId } : {}),
          quantity: line.quantity,
          ...(line.freeSale ? { customPrice: line.customPrice, soldMilliliters: line.soldMilliliters } : {}),
        })),
      });
      setMessage(`Venta ${result.pedido.id} registrada. Total final: ${formatCurrency(result.pedido.total)}.`);
      setSaleLines([]);
      setSaleCustomerName('');
      setSaleCustomerPhone('');
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
  const posProducts = useMemo(() => products.filter((product) => {
    const search = posSearch.trim().toLocaleLowerCase();
    return product.activo
      && (!search || product.nombre.trim().toLocaleLowerCase().startsWith(search))
      && (posGenreFilter === 'all' || product.genero === posGenreFilter);
  }), [posGenreFilter, posSearch, products]);
  const promotionFilterProducts = useMemo(() => products.filter((product) => {
    if (!product.activo || (promotionGenreFilter !== 'all' &&
      String(product.genero).toUpperCase() !== promotionGenreFilter)) return false;
    const presentations = product.presentaciones.filter((presentation) => presentation.activo && presentation.id);
    if (promotionPresentationFilter === 'all') return true;
    return presentations.some((presentation) => presentation.mililitros === Number(promotionPresentationFilter));
  }), [products, promotionGenreFilter, promotionPresentationFilter]);
  const applyPromotionFilters = () => {
    if (!promotionDraft) return;
    const selectedProductIds = promotionFilterProducts.map((product) => product.id);
    const selectedPresentationIds = promotionFilterProducts.flatMap((product) => product.presentaciones
      .filter((presentation) => presentation.activo && presentation.id &&
        (promotionPresentationFilter === 'all' || presentation.mililitros === Number(promotionPresentationFilter)))
      .map((presentation) => presentation.id!));
    setPromotionDraft((current) => current && ({
      ...current,
      seleccionEspecifica: true,
      productIds: [...new Set([...current.productIds, ...selectedProductIds])],
      presentationIds: [...new Set([...current.presentationIds, ...selectedPresentationIds])],
    }));
  };

  const showCustomerOrders = async (customer: Customer) => {
    if (!token) return;
    setSelectedCustomer(customer);
    try {
      setCustomerOrders(await fetchCustomerOrders(token, customer.id));
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
        <div className="pos-filters">
          <label className="pos-search"><Search size={16} /><input type="search" value={posSearch} placeholder="Buscar colonia por nombre"
            aria-label="Buscar colonia por nombre" onChange={(event) => setPosSearch(event.target.value)} /></label>
          <select aria-label="Filtrar por género" value={posGenreFilter} onChange={(event) => setPosGenreFilter(event.target.value)}>
            <option value="all">Todos los géneros</option><option value="HOMBRE">Hombre</option><option value="MUJER">Mujer</option>
          </select>
        </div>
        {posProducts.map((product) => (
          <div className="pos-product-card" key={product.id}>
            {product.img && <img className="pos-image" src={imageUrl(product.img)} alt="" />}
            <strong>{product.nombre}</strong><small>{product.marca} · {product.genero}</small>
            {product.presentaciones.filter((presentation) => presentation.activo).length
              ? product.presentaciones.filter((presentation) => presentation.activo).map((presentation) => (
                <div className="pos-presentation" key={presentation.id}>
                  <button type="button" className="pos-product" disabled={(presentation.stock ?? product.stock ?? 0) <= 0}
                    onClick={() => addSaleLine(product, presentation)}>
                    <span>{presentation.mililitros ? `${presentation.mililitros} ml` : 'Estándar'} · {presentation.stock ?? product.stock ?? 0} disponibles</span>
                    <small>{formatCurrency(presentation.precio)} · Agregar</small>
                  </button>
                  <button type="button" className="btn btn-small pos-free-sale" disabled={(presentation.stock ?? product.stock ?? 0) <= 0}
                    onClick={() => addFreeSaleLine(product, presentation)}>Venta libre</button>
                </div>
              ))
              : <div className="pos-presentation">
                <button type="button" className="pos-product" disabled={(product.stock ?? 0) <= 0} onClick={() => addSaleLine(product)}>
                  <span>{product.stock ?? 0} disponibles</span><small>{formatCurrency(product.precio)} · Agregar</small>
                </button>
                <button type="button" className="btn btn-small pos-free-sale" disabled={(product.stock ?? 0) <= 0}
                  onClick={() => addFreeSaleLine(product)}>Venta libre</button>
              </div>}
          </div>
        ))}
        {!posProducts.length && <p className="empty-state">{posSearch || posGenreFilter !== 'all'
          ? 'No hay colonias que coincidan con la búsqueda y el género.'
          : 'No hay productos conectados al catálogo.'}</p>}
      </div>
      <div className="sale-summary">
        <h3>Resumen de venta</h3>
        <div className="sale-customer-fields">
          <label><span>Nombre del cliente (opcional)</span><input value={saleCustomerName} maxLength={255}
            onChange={(event) => setSaleCustomerName(event.target.value)} placeholder="Nombre completo" /></label>
          <label><span>Teléfono del cliente (opcional)</span><input type="tel" value={saleCustomerPhone} maxLength={40}
            onChange={(event) => setSaleCustomerPhone(event.target.value)} placeholder="Número de contacto" /></label>
          {hasPartialSaleCustomer && <small className="field-error">Ingresa el nombre y el teléfono, o deja ambos vacíos.</small>}
        </div>
        {!saleLines.length && <p className="empty-state">Agrega perfumes para iniciar la venta.</p>}
        {saleLines.map((line) => <div className="sale-row sale-row-edit" key={line.key}>
          <span>{line.product.nombre} {line.freeSale
            ? <small>Venta libre · {line.soldMilliliters ? `${line.soldMilliliters} ml` : 'ml sin indicar'}</small>
            : line.presentation?.mililitros ? `${line.presentation.mililitros} ml` : ''}
            {!line.freeSale && <small>{formatCurrency(line.presentation?.precio ?? line.product.precio)} c/u</small>}
          </span>
          {line.freeSale
            ? <div className="free-sale-fields">
              <label><span>Precio de esta venta</span><input aria-label={`Precio manual de ${line.product.nombre}`} type="number" min="1" step="1"
                value={line.customPrice ?? ''} onChange={(event) => setSaleLines((current) => current.map((item) => item.key === line.key
                  ? { ...item, customPrice: event.target.value === '' ? undefined : Number(event.target.value) } : item))} /></label>
              <label><span>ml vendidos</span><input aria-label={`Mililitros vendidos de ${line.product.nombre}`} type="number" min="1" step="1"
                max={line.presentation?.mililitros ?? undefined} value={line.soldMilliliters ?? ''} onChange={(event) => setSaleLines((current) => current.map((item) => item.key === line.key
                  ? { ...item, soldMilliliters: event.target.value === '' ? undefined : Number(event.target.value) } : item))} /></label>
            </div>
            : <input aria-label={`Cantidad de ${line.product.nombre}`} type="number" min="1" value={line.quantity} onChange={(event) => setSaleLines((current) => current.map((item) => item.key === line.key ? { ...item, quantity: Math.max(1, Number(event.target.value)) } : item))} />}
          <button type="button" className="icon-button" aria-label="Quitar producto" onClick={() => setSaleLines((current) => current.filter((item) => item.key !== line.key))}><X size={15} /></button>
        </div>)}
        <label><span>Método de pago</span><select value={salePayment} onChange={(event) => setSalePayment(event.target.value as SaleRequest['metodoPago'])}><option>Efectivo</option><option>Nequi</option></select></label>
        <div className="sale-total"><span>Subtotal antes de promociones</span><strong>{formatCurrency(saleSubtotal)}</strong></div>
        <p className="helper-text">El backend aplica promociones a precios de catálogo. Las ventas libres usan el precio manual y descuentan una presentación completa; los ml vendidos quedan en el detalle.</p>
        <button type="button" className="btn btn-primary wide" disabled={busy || !saleLines.length || hasInvalidFreeSale || hasPartialSaleCustomer} onClick={() => {
          if (window.confirm('¿Confirmar la venta y descontar el inventario compartido?')) void submitSale();
        }}><CircleDollarSign size={16} /> Registrar venta</button>
      </div>
    </div>
  </section>;

  const renderPromotions = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Marketing</p><h2>Promociones</h2></div>
      <button type="button" className="btn btn-primary" onClick={() => beginEditPromotion()}><Plus size={16} /> Nueva promoción</button>
    </div>
    <div className="cards-grid">
      {promotions.map((promo) => <div className="promo-card" key={promo.id}>
        {promo.img && <img className="promo-image" src={imageUrl(promo.img)} alt={`Imagen de ${promo.nombre}`} />}
        <div className="promo-head"><strong>{promo.nombre}</strong><span className={`status ${promo.activa ? 'status-success' : 'status-cancelled'}`}>{promo.activa ? 'Activa' : 'Inactiva'}</span></div>
        <p>{promo.tipo}{promo.tipo === 'PORCENTAJE' ? ` · ${promo.valor}%` : promo.tipo === 'MONTO' ? ` · ${formatCurrency(promo.valor)}` : ''}</p>
        <small>{promo.fechaInicio} — {promo.fechaFin} · Género: {promo.genero}</small>
        <small>{promo.seleccionEspecifica
          ? `${promo.productos?.length ?? 0} productos seleccionados`
          : 'Aplica a todos los productos'}</small>
        <div className="table-actions">
          <button type="button" className="btn btn-small" onClick={() => beginEditPromotion(promo)}>Editar</button>
          <button type="button" className="btn btn-small" disabled={busy} onClick={() => token && void runAction(
            () => setPromotionActive(token, promo.id, !promo.activa),
            promo.activa ? 'Promoción desactivada.' : 'Promoción activada.',
          )}>{promo.activa ? 'Desactivar' : 'Activar'}</button>
        </div>
      </div>)}
      {!promotions.length && <p className="empty-state">No hay promociones en el backend.</p>}
    </div>
  </section>;

  const renderSeasons = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Identidad visual programada</p><h2>Temporadas y apariencia</h2></div>
      <button type="button" className="btn btn-primary" onClick={() => beginEditSeason()}><Plus size={16} /> Nueva temporada</button>
    </div>
    <p className="helper-text">Programa una apariencia para toda la tienda. Las fechas se interpretan en la zona horaria de Bogotá; una temporada habilitada comienza y termina automáticamente.</p>
    {seasonDraft && <form className="season-editor" onSubmit={(event) => void handleSaveSeason(event)}>
      <div className="section-header"><div><p className="eyebrow">{seasonDraft.id ? 'Editar programación' : 'Nueva configuración'}</p><h3>{seasonDraft.nombre}</h3></div>
        <button type="button" className="btn btn-ghost" onClick={() => setSeasonDraft(null)}>Cerrar editor</button>
      </div>
      <div className="season-fields">
        <label><span>Plantilla de temporada</span><select value={seasonTemplate} onChange={(event) => {
          const value = event.target.value;
          setSeasonTemplate(value);
          const template = seasonTemplates.find((item) => item.nombre === value);
          setSeasonDraft((current) => current ? {
            ...current,
            nombre: template?.nombre ?? 'Temporada personalizada',
            tema: template?.tema ?? 'Personalizada',
            decoracion: template?.decoracion ?? 'none',
            colores: template?.colores ?? current.colores,
          } : current);
        }}>
          <option value="">Personalizada</option>
          {seasonTemplates.map((template) => <option key={template.nombre} value={template.nombre}>{template.nombre}</option>)}
        </select></label>
        <label><span>Nombre</span><input required maxLength={120} value={seasonDraft.nombre} onChange={(event) => setSeasonDraft({ ...seasonDraft, nombre: event.target.value })} /></label>
        <label><span>Temática</span><input required maxLength={80} value={seasonDraft.tema} onChange={(event) => setSeasonDraft({ ...seasonDraft, tema: event.target.value })} /></label>
        <label className="season-field-full"><span>Descripción (opcional)</span><textarea maxLength={2000} value={seasonDraft.descripcion ?? ''} onChange={(event) => setSeasonDraft({ ...seasonDraft, descripcion: event.target.value })} /></label>
        <label><span>Inicio · hora Bogotá</span><input type="datetime-local" required value={seasonDraft.fechaInicio} onChange={(event) => setSeasonDraft({ ...seasonDraft, fechaInicio: event.target.value })} /></label>
        <label><span>Fin · hora Bogotá</span><input type="datetime-local" required value={seasonDraft.fechaFin} onChange={(event) => setSeasonDraft({ ...seasonDraft, fechaFin: event.target.value })} /></label>
        <label><span>Elemento decorativo</span><select value={seasonDraft.decoracion} onChange={(event) => setSeasonDraft({ ...seasonDraft, decoracion: event.target.value as SeasonDecoration })}>
          <option value="none">Ninguno</option><option value="stars">Estrellas</option><option value="hearts">Corazones</option><option value="snowflakes">Copos de nieve</option><option value="floral">Flores</option><option value="pumpkins">Calabazas</option><option value="confetti">Confeti</option><option value="leaves">Hojas</option><option value="lights">Luces</option><option value="web">Telarañas</option><option value="fireworks">Fuegos artificiales</option>
        </select></label>
        <label><span>Intensidad decorativa · {seasonDraft.intensidad === 0 ? 'sin decoración' : `${seasonDraft.intensidad} de 3`}</span><input type="range" min="0" max="3" step="1" value={seasonDraft.intensidad} onChange={(event) => setSeasonDraft({ ...seasonDraft, intensidad: Number(event.target.value) })} /></label>
      </div>
      <div className="season-colors"><h4>Paleta de colores</h4>
        <div className="season-color-grid">{seasonColorLabels.map(({ key, label }) => <label key={key}><span>{label}</span>
          <span className="season-color-input"><input type="color" value={seasonDraft.colores[key]} onChange={(event) => setSeasonDraft({ ...seasonDraft, colores: { ...seasonDraft.colores, [key]: event.target.value } })} /><code>{seasonDraft.colores[key]}</code></span>
        </label>)}</div>
      </div>
      {seasonPreview && <div className="season-preview" style={{ backgroundColor: seasonDraft.colores.fondo, color: seasonDraft.colores.texto, borderColor: seasonDraft.colores.acento }}>
        <div><small style={{ color: seasonDraft.colores.principal }}>VISTA PREVIA · {seasonDraft.tema}</small><h4>{seasonDraft.nombre || 'Tu temporada'}</h4>
          <p>Así se verá la paleta y los elementos visuales de la tienda durante esta temporada.</p>
          <button type="button" style={{ backgroundColor: seasonDraft.colores.boton, color: seasonDraft.colores.fondo }}>Explorar colección</button>
        </div>
        <span className="season-preview-decoration" style={{ color: seasonDraft.colores.decorativo, opacity: seasonDraft.intensidad / 3 }} aria-hidden="true">{seasonDraft.decoracion === 'none' ? '' : seasonDraft.decoracion === 'hearts' ? '♥' : seasonDraft.decoracion === 'snowflakes' ? '❄' : seasonDraft.decoracion === 'floral' ? '✿' : seasonDraft.decoracion === 'pumpkins' ? '✺' : seasonDraft.decoracion === 'leaves' ? '❧' : seasonDraft.decoracion === 'lights' ? '●  ●  ●' : seasonDraft.decoracion === 'web' ? '✳' : seasonDraft.decoracion === 'fireworks' ? '✺' : seasonDraft.decoracion === 'confetti' ? '✦' : '✧'}</span>
      </div>}
      <div className="season-editor-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setSeasonPreview((current) => !current)}>{seasonPreview ? 'Ocultar vista previa' : 'Vista previa'}</button>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar temporada'}</button>
      </div>
      {seasonPreview && <p className="helper-text" role="status">La vista previa es solo administrativa; no modifica la tienda hasta habilitar la temporada.</p>}
    </form>}
    <div className="season-list">
      {!seasons.length && <p className="empty-state">Todavía no hay temporadas guardadas.</p>}
      {seasons.map((season) => <article className="season-card" key={season.id} style={{ borderInlineStartColor: season.colores.principal }}>
        <div className="season-card-heading"><div><h3>{season.nombre}</h3><p>{season.tema}{season.descripcion ? ` · ${season.descripcion}` : ''}</p></div>
          <span className={`status ${season.estado === 'activa' ? 'status-success' : season.estado === 'finalizada' ? 'status-cancelled' : ''}`}>{season.estado === 'activa' ? 'Activa' : season.estado === 'programada' ? 'Programada' : season.estado === 'finalizada' ? 'Finalizada' : 'Inactiva'}</span>
        </div>
        <small>{formatBogotaDate(season.fechaInicio)} — {formatBogotaDate(season.fechaFin)} · Bogotá</small>
        <div className="season-swatches" aria-label="Colores de la temporada">{seasonColorLabels.map(({ key, label }) => <span key={key} title={label} style={{ backgroundColor: season.colores[key] }} />)}</div>
        <div className="table-actions">
          <button type="button" className="btn btn-small" onClick={() => beginEditSeason(season)}>Editar</button>
          {season.estado !== 'finalizada' && <button type="button" className="btn btn-small" disabled={busy} onClick={() => void runSeasonAction(
            () => setSeasonActive(token, season.id, !season.habilitada),
            season.habilitada ? 'Temporada deshabilitada.' : 'Temporada habilitada y programada.',
          )}>{season.habilitada ? 'Desactivar' : 'Activar'}</button>}
          <button type="button" className="btn btn-small btn-danger" disabled={busy} onClick={() => {
            if (window.confirm(`¿Eliminar la temporada "${season.nombre}"?`) && token) {
              void runSeasonAction(() => deleteSeason(token, season.id), 'Temporada eliminada.');
            }
          }}><Trash2 size={14} /> Eliminar</button>
        </div>
      </article>)}
    </div>
  </section>;

  const renderCustomers = () => <section className="panel">
    <div className="section-header"><div><p className="eyebrow">Clientes web y presenciales</p><h2>Base de clientes</h2></div></div>
    <div className="toolbar"><div className="search-field"><Search size={16} /><input type="search" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Buscar nombre, correo o teléfono" /></div></div>
    <div className="table-wrapper"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Teléfono</th><th>Ciudad</th><th>Pedidos</th><th>Total compras</th><th></th></tr></thead>
      <tbody>{customers.map((customer) => <tr key={customer.id}>
        <td>{customer.nombre}<small>{customer.canalVenta === 'presencial' ? 'Cliente presencial' : 'Cliente web'}</small></td>
        <td>{customer.email.includes('@sublimegracia.local') ? '—' : customer.email}</td><td>{customer.telefono}</td><td>{customer.ciudad}</td>
        <td>{customer.pedidos}</td><td>{formatCurrency(customer.totalCompras)}</td>
        <td><button type="button" className="btn btn-small" onClick={() => void showCustomerOrders(customer)}>Historial</button></td>
      </tr>)}
      {!customers.length && <tr><td colSpan={7} className="empty-state">No hay clientes con ventas registradas.</td></tr>}</tbody>
    </table></div>
    {selectedCustomer && <div className="mini-panel customer-history">
      <div className="section-header"><div><h3>Compras de {selectedCustomer.nombre}</h3><small>{selectedCustomer.telefono}{selectedCustomer.email.includes('@sublimegracia.local') ? '' : ` · ${selectedCustomer.email}`}</small></div>
        <button type="button" className="icon-button" aria-label="Cerrar historial" onClick={() => { setSelectedCustomer(null); setCustomerOrders(null); }}><X size={17} /></button>
      </div>
      {customerOrders?.map((order) => <div className="history-order" key={order.id}>
        <strong>#{order.id.slice(0, 8)} · {order.canalVenta === 'presencial' ? 'Presencial' : 'Web'} · {order.estado} · {formatCurrency(order.total)}</strong><small>{formatDate(order.createdAt)}</small>
        <ul>{order.items?.map((item) => <li key={item.id}>{item.nombreProducto} {item.mililitros ? `· ${item.mililitros} ml ` : ''}× {item.cantidad} · {formatCurrency(item.precio * item.cantidad)}</li>)}</ul>
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
    seasons: renderSeasons(),
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
      if (event.target === event.currentTarget && !busy) {
        setPromotionDraft(null);
        setPromotionImage(undefined);
        setPromotionImagePreview('');
      }
    }}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="promotion-modal-title">
      <div className="modal-heading"><div><p className="eyebrow">Promociones</p><h2 id="promotion-modal-title">{promotionDraft.id ? 'Editar promoción' : 'Nueva promoción'}</h2></div>
      <button type="button" className="icon-button" aria-label="Cerrar" onClick={() => { setPromotionDraft(null); setPromotionImage(undefined); setPromotionImagePreview(''); }}><X size={18} /></button></div>
      <form className="form-grid" onSubmit={(event) => void handleSavePromotion(event)}>
        <label className="form-full"><span>Nombre</span><input required value={promotionDraft.nombre} onChange={(event) => setPromotionDraft({ ...promotionDraft, nombre: event.target.value })} /></label>
      <div className="form-full promotion-image-field">
        <label><span>Imagen publicitaria (JPG, PNG o WEBP, máximo 5 MB)</span>
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={selectPromotionImage} />
        </label>
        {(promotionImagePreview || promotionDraft.img) && <div className="promotion-image-preview">
          <img src={promotionImagePreview || imageUrl(promotionDraft.img ?? undefined)} alt="Vista previa de la imagen de la promoción" />
          <button type="button" className="btn btn-small" onClick={removePromotionImage}>Quitar imagen</button>
        </div>}
      </div>
      <label><span>Tipo</span><select value={promotionDraft.tipo} onChange={(event) => setPromotionDraft({ ...promotionDraft, tipo: event.target.value as PromotionDraft['tipo'] })}>{['PORCENTAJE', 'MONTO', '2X1', '3X2'].map((type) => <option key={type}>{type}</option>)}</select></label>
        <label><span>Valor (porcentaje o monto)</span><input type="number" min="0" step="1" value={promotionDraft.valor} onChange={(event) => setPromotionDraft({ ...promotionDraft, valor: Number(event.target.value) })} /></label>
        <label><span>Inicio</span><input type="date" required value={promotionDraft.fechaInicio} onChange={(event) => setPromotionDraft({ ...promotionDraft, fechaInicio: event.target.value })} /></label>
        <label><span>Fin</span><input type="date" required value={promotionDraft.fechaFin} onChange={(event) => setPromotionDraft({ ...promotionDraft, fechaFin: event.target.value })} /></label>
        <label><span>Género</span><select value={promotionDraft.genero} onChange={(event) => setPromotionDraft({ ...promotionDraft, genero: event.target.value as PromotionDraft['genero'] })}><option>TODOS</option><option>HOMBRE</option><option>MUJER</option></select></label>
        <label><span>Prioridad</span><input type="number" min="0" step="1" value={promotionDraft.prioridad} onChange={(event) => setPromotionDraft({ ...promotionDraft, prioridad: Number(event.target.value) })} /></label>
        <div className="form-full promotion-selection">
          <div className="promotion-filter-row">
            <label><span>Filtrar por género</span><select value={promotionGenreFilter} onChange={(event) => setPromotionGenreFilter(event.target.value)}>
              <option value="all">Todos</option><option value="HOMBRE">Hombre</option><option value="MUJER">Mujer</option><option value="UNISEX">Unisex</option>
            </select></label>
            <label><span>Filtrar por presentación</span><select value={promotionPresentationFilter} onChange={(event) => setPromotionPresentationFilter(event.target.value)}>
              <option value="all">Todas las presentaciones</option><option value="30">30 ml</option><option value="50">50 ml</option><option value="100">100 ml</option>
            </select></label>
            <button type="button" className="btn btn-small" onClick={applyPromotionFilters}>Agregar resultados ({promotionFilterProducts.length})</button>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setPromotionDraft({
              ...promotionDraft, seleccionEspecifica: true, productIds: [], presentationIds: [],
            })}>Limpiar selección</button>
          </div>
          <p className="helper-text">
            Seleccionados: {promotionDraft.productIds.length} productos · {promotionDraft.presentationIds.length} presentaciones.
            {!promotionDraft.seleccionEspecifica && ' Esta promoción heredada se aplica a todo el catálogo hasta que selecciones productos.'}
          </p>
          <div className="promotion-filter-results">
            <strong>Resultados del filtro ({promotionFilterProducts.length})</strong>
            <small>{promotionFilterProducts.map((product) => product.nombre).join(' · ') || 'No hay productos para esos filtros.'}</small>
          </div>
          <div className="selected-promotion-products">
            <strong>Productos incluidos</strong>
            {products.filter((product) => promotionDraft.productIds.includes(product.id)).map((product) => (
              <span key={product.id}>{product.nombre}</span>
            ))}
            {!promotionDraft.productIds.length && <small>{promotionDraft.seleccionEspecifica ? 'No hay productos seleccionados; la promoción no se aplicará.' : 'Todos los productos por configuración actual.'}</small>}
          </div>
          <div className="form-full product-checklist"><span>Productos aplicables (selección individual y automática)</span>
          {products.map((product) => <label key={product.id} className="checkbox-line">
            <input type="checkbox" checked={promotionDraft.productIds.includes(product.id)} onChange={(event) => togglePromotionProduct(product, event.target.checked)} /><span>{product.nombre} · {product.genero}</span>
          </label>)}
          <div className="form-full presentation-checklist"><strong>Presentaciones aplicables</strong>
            <small>Marca las presentaciones que también deben recibir la promoción. Las selecciones de producto y presentación se combinan.</small>
            {products.flatMap((product) => product.presentaciones.filter((presentation) => presentation.activo && presentation.id).map((presentation) => (
              <label key={presentation.id} className="checkbox-line">
                <input type="checkbox" checked={promotionDraft.presentationIds.includes(presentation.id!)}
                  onChange={(event) => togglePromotionPresentation(product, presentation.id!, event.target.checked)} />
                <span>{product.nombre} · {presentation.mililitros ? `${presentation.mililitros} ml` : 'Estándar'}</span>
              </label>
            )))}
          </div>
          </div>
        </div>
        <label className="checkbox-line"><input type="checkbox" checked={promotionDraft.activa} onChange={(event) => setPromotionDraft({ ...promotionDraft, activa: event.target.checked })} /><span>Activa</span></label>
        <div className="form-actions form-full"><button type="button" className="btn btn-ghost" onClick={() => {
          setPromotionDraft(null);
          setPromotionImage(undefined);
          setPromotionImagePreview('');
        }}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar promoción'}</button></div>
      </form>
    </div></div>}
  </div>;
}

export default App;
