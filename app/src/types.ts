export type MenuKey =
  | 'dashboard'
  | 'catalog'
  | 'inventory'
  | 'orders'
  | 'pos'
  | 'promotions'
  | 'seasons'
  | 'customers'
  | 'reviews'
  | 'administration'
  | 'settings';

export interface Presentation {
  id?: number;
  mililitros: number | null;
  precio: number;
  stock: number;
  activo: boolean;
}

export interface Product {
  id: number;
  nombre: string;
  marca?: string;
  genero: string;
  categoria: string;
  segmentacion?: string;
  descripcion: string;
  precio: number;
  stock: number | null;
  activo: boolean;
  img?: string;
  presentaciones: Presentation[];
}

export type OrderState = 'pendiente' | 'pagado' | 'preparando' | 'enviado' | 'entregado' | 'rechazado' | 'cancelado';

export interface OrderItem {
  id: string;
  cantidad: number;
  productId: number;
  precio: number;
  nombreProducto?: string;
  imagenProducto?: string;
  mililitros?: number | null;
  producto?: Product;
  presentacion?: Presentation;
}

export interface Order {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  estado: OrderState;
  total: number;
  canalVenta?: 'web' | 'presencial';
  metodoPago?: string | null;
  comprobante?: string | null;
  referencia?: string | null;
  comentarioCancelacion?: string | null;
  createdAt?: string;
  items: OrderItem[];
}

export interface Promotion {
  id: number;
  nombre: string;
  tipo: 'PORCENTAJE' | 'MONTO' | '2X1' | '3X2';
  valor: number;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
  genero: 'TODOS' | 'HOMBRE' | 'MUJER';
  prioridad: number;
  img?: string | null;
  seleccionEspecifica?: boolean;
  productos?: Array<{ id: number; nombre: string }>;
  presentaciones?: Array<{ id: number; productoId: number; mililitros: number | null }>;
}

export type SeasonDecoration = 'none' | 'stars' | 'hearts' | 'snowflakes' | 'floral' | 'pumpkins' | 'confetti' | 'leaves' | 'lights' | 'web' | 'fireworks';

export interface SeasonColors {
  principal: string;
  secundario: string;
  acento: string;
  fondo: string;
  texto: string;
  boton: string;
  decorativo: string;
}

export interface Season {
  id: number;
  nombre: string;
  descripcion: string | null;
  tema: string;
  colores: SeasonColors;
  decoracion: SeasonDecoration;
  intensidad: number;
  fechaInicio: string;
  fechaFin: string;
  habilitada: boolean;
  estado: 'inactiva' | 'programada' | 'activa' | 'finalizada';
}

export interface Customer {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  ciudad: string;
  totalCompras: number;
  pedidos: number;
  canalVenta?: 'web' | 'presencial';
}

export interface Review {
  id: number;
  nombre: string;
  opinion: string;
  calificacion: number;
  productoId: number | null;
  activa: boolean;
  createdAt?: string;
  producto?: { id: number; nombre: string } | null;
}

export interface InventoryMovement {
  id: number;
  productoId: number;
  presentacionId: number | null;
  pedidoId: string | null;
  tipo: string;
  cantidad: number;
  stockAnterior: number;
  stockNuevo: number;
  motivo?: string | null;
  createdAt: string;
  producto?: { id: number; nombre: string; marca?: string };
  presentacion?: { id: number; mililitros: number | null };
}

export interface DashboardStats {
  ventasHoy: number;
  ventasMes: number;
  pedidosPendientes: number;
  pedidosAceptados: number;
  productosDisponibles: number;
  stockBajo: number;
  agotados: number;
  ventasUltimosSieteDias: Array<{ fecha: string; total: number }>;
  productosMasVendidos: Array<{ productId: number; nombre: string; unidades: number; ventas: number }>;
}

export interface SaleRequest {
  metodoPago: 'Efectivo' | 'Nequi';
  cliente?: { nombre: string; telefono: string };
  items: Array<{
    productId: number;
    presentationId?: number;
    quantity: number;
    customPrice?: number;
    soldMilliliters?: number;
  }>;
}
