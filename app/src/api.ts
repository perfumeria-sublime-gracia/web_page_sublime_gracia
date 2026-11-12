import type {
  Customer,
  DashboardStats,
  InventoryMovement,
  Order,
  Product,
  Promotion,
  Review,
  SaleRequest,
} from './types';

declare global {
  interface Window {
    electronAPI?: {
      apiBaseUrl?: string;
      getBaseUrl?: () => Promise<string>;
    };
  }
}

const defaultBaseUrl = 'https://web-page-sublime-gracia.onrender.com';
const legacyDefaultBaseUrl = 'http://localhost:3000';

export const resolveBaseUrl = async (): Promise<string> => {
  const saved = localStorage.getItem('sg-admin-api-url');
  if (saved) {
    const savedBaseUrl = validateBaseUrl(saved);
    if (savedBaseUrl === legacyDefaultBaseUrl) {
      localStorage.setItem('sg-admin-api-url', defaultBaseUrl);
      return defaultBaseUrl;
    }
    return savedBaseUrl;
  }
  if (window.electronAPI?.getBaseUrl) {
    const value = await window.electronAPI.getBaseUrl();
    if (value) return validateBaseUrl(value);
  }
  if (window.electronAPI?.apiBaseUrl) return validateBaseUrl(window.electronAPI.apiBaseUrl);
  return validateBaseUrl(import.meta.env.VITE_API_URL || defaultBaseUrl);
};

const validateBaseUrl = (value: string) => {
  const normalized = value.trim().replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('La URL del backend no es válida.');
  }
  if (parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) {
    throw new Error('El backend remoto debe utilizar HTTPS.');
  }
  return normalized;
};

export const saveApiBaseUrl = (value: string) => {
  localStorage.setItem('sg-admin-api-url', validateBaseUrl(value));
};

export const apiFetch = async <T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> => {
  const baseUrl = await resolveBaseUrl();
  const headers = new Headers(options.headers ?? {});

  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  } catch (error) {
    console.error('No se pudo conectar con el backend.', { url: baseUrl, error });
    throw new Error('No hay conexión con el servidor. Revisa la URL y tu conexión a internet.');
  }

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    if (response.ok) throw new Error(`El servidor respondió con un formato inesperado (${response.status}).`);
  }

  if (!response.ok) {
    const data = payload as { message?: string; error?: string } | null;
    if (response.status === 401) throw new Error('La sesión expiró o el token no es válido. Inicia sesión nuevamente.');
    if (response.status === 403) throw new Error('Tu cuenta no tiene permisos de administrador.');
    throw new Error(data?.message || data?.error || `Error del servidor (${response.status}).`);
  }

  return payload as T;
};

export const loginAdmin = (correo: string, contraseña: string) =>
  apiFetch<{ token: string; user: { nombre: string; apellido: string; correo: string; rol: string } }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ correo, contraseña }) },
  );

export const fetchProducts = (token: string, search = '') =>
  apiFetch<Product[]>(`/api/admin/productos${search ? `?search=${encodeURIComponent(search)}` : ''}`, {}, token);

export const saveProduct = (token: string, product: Omit<Product, 'id'> & { id?: number }, image?: File) => {
  const body = new FormData();
  body.set('nombre', product.nombre);
  body.set('marca', product.marca ?? '');
  body.set('genero', product.genero ?? 'UNISEX');
  body.set('categoria', product.categoria ?? 'Otros');
  body.set('segmentacion', product.segmentacion ?? product.categoria ?? 'Otros');
  body.set('descripcion', product.descripcion ?? '');
  body.set('precio', String(product.precio));
  body.set('stock', String(product.stock ?? 0));
  body.set('activo', String(product.activo !== false));
  body.set('img', product.img ?? '');
  body.set('presentaciones', JSON.stringify(product.presentaciones ?? []));
  if (image) body.set('imagen', image);
  return apiFetch<Product>(product.id ? `/api/productos/${product.id}` : '/api/productos', {
    method: product.id ? 'PUT' : 'POST',
    body,
  }, token);
};

export const setProductActive = (token: string, id: number, activo: boolean) =>
  apiFetch<Product>(`/api/productos/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ activo }),
  }, token);

export const deleteProduct = (token: string, id: number) =>
  apiFetch<{ message: string }>(`/api/productos/${id}`, { method: 'DELETE' }, token);

export const fetchOrders = (token: string) => apiFetch<Order[]>('/api/admin/pedidos', {}, token);

export const updateOrderState = (
  token: string,
  id: string,
  estado: Order['estado'],
  comentarioCancelacion?: string,
) => apiFetch<{ message: string; pedido: Order }>(`/api/admin/pedidos/${id}/estado`, {
  method: 'PUT',
  body: JSON.stringify({ estado, comentarioCancelacion }),
}, token);

export const fetchDashboard = (token: string) => apiFetch<DashboardStats>('/api/admin/dashboard', {}, token);
export const fetchPromotions = (token: string) => apiFetch<Promotion[]>('/api/promociones', {}, token);
export const savePromotion = (token: string, promotion: Omit<Promotion, 'id' | 'productos' | 'presentaciones'> & {
  id?: number;
  productIds: number[];
  presentationIds: number[];
}, image?: File) => {
  const body: BodyInit = image
    ? (() => {
      const formData = new FormData();
      formData.set('promocion', JSON.stringify(promotion));
      formData.set('imagen', image);
      return formData;
    })()
    : JSON.stringify(promotion);
  return apiFetch<Promotion>(promotion.id ? `/api/promociones/${promotion.id}` : '/api/promociones', {
    method: promotion.id ? 'PUT' : 'POST',
    body,
  }, token);
};
export const setPromotionActive = (token: string, id: number, activa: boolean) =>
  apiFetch<Promotion>(`/api/promociones/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ activa }),
  }, token);

export const fetchCustomers = (token: string, search = '') =>
  apiFetch<Customer[]>(`/api/admin/clientes${search ? `?search=${encodeURIComponent(search)}` : ''}`, {}, token);
export const fetchCustomerOrders = (token: string, customerId: string) =>
  apiFetch<Order[]>(`/api/admin/clientes/${encodeURIComponent(customerId)}/pedidos`, {}, token);

export const fetchReviews = (token: string) => apiFetch<Review[]>('/api/admin/opiniones', {}, token);
export const setReviewActive = (token: string, id: number, activa: boolean) =>
  apiFetch<Review>(`/api/admin/opiniones/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ activa }),
  }, token);
export const deleteReview = (token: string, id: number) =>
  apiFetch<{ message: string }>(`/api/admin/opiniones/${id}`, { method: 'DELETE' }, token);

export const fetchInventoryMovements = (token: string) =>
  apiFetch<InventoryMovement[]>('/api/admin/inventario/movimientos?limit=250', {}, token);
export const registerInventoryMovement = (
  token: string,
  data: { productId: number; presentationId?: number; operation: 'entrada' | 'ajuste'; quantity: number; direction?: 1 | -1; motivo?: string },
) => apiFetch<{ stock: number }>('/api/admin/inventario/movimientos', {
  method: 'POST',
  body: JSON.stringify(data),
}, token);

export const registerSale = (token: string, sale: SaleRequest) =>
  apiFetch<{ message: string; pedido: Order }>('/api/admin/ventas-presenciales', {
    method: 'POST',
    body: JSON.stringify(sale),
  }, token);
