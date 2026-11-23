"use client";
import { ChristmasTop } from "./christmas-top";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {displayDate,displayTime} from "./date-format";
import {reassignRemovedAdvisors,isRemovedAdvisor} from "./advisor-reassignment";
import {businessMoment,orderCreationMoment,collectionMoment,creditPaymentMoment} from "./business-time";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  BarChart3,
  Banknote,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileDown,
  Download,
  LayoutDashboard,
  LogOut,
  Minus,
  PackageSearch,
  Pencil,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShoppingCart,
  Smartphone,
  StickyNote,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import { catalogProducts, catalogVersion } from "./catalog";
import {
  InlinePendingPayment,
  CatalogView,
  DepositsView,
  PendingEditView,
  SalePreviewDialog,
  SalesHistory,
} from "./admin-tools";
import { CashReportControl } from "./cash-report-control";
import { NewSaleView, type SaleDetails, type SalePayment } from "./new-sale-view";
import { WhatsAppNotes, type WhatsAppNote } from "./whatsapp-notes";
import { QueueBar } from "./queue-bar";
import { StoreSynchronizer, type StoreJournal, type SyncStatus } from "./store-synchronizer";
import { HeaderProductSearch } from "./header-product-search";
import {ProductConsult} from "./product-consult";
import {ProductCatalog} from "./product-catalog";
import {productMatches,productKey,codeKey,resolveProductCode,type CatalogProduct} from "./product-model";
import {InventoryView} from "./inventory-view";
import {applyStockTransitions,usedStock,stockQuantityBase,type StockProduct,type StockAllocation} from "./inventory-model";
import {hidePaidHistory,isPersonalOrder,advisorSection,moveAdvisorSection} from "./advisor-history";
import {OrderBackupImport} from "./order-backup-import";
import {prepareOrderBackup,type BackupOrder} from "./order-backup";
import {compactImportFingerprint} from './import-fingerprint';
import { ticketLabel, nextOrderId, nextCreditCode, orderSequence, includeLegacyCashOrder, datedCashRecords } from "./order-identifiers";
import {prepareCompleteCreditImport,type CompleteCreditData} from "./credit-complete-csv";
import { mergeQuoteImport } from "./quote-csv";
import { prepareCreditImport, type CreditImportRow } from "./credit-csv";
import { CreditsView, QuotesView, businessToday } from "./business-views";
import { applyCreditPayment, removeCreditPayment, reconcileCreditPayments, itemTotal, type CreditAccount, type CreditPayment, type Quote } from "./business-model";
import {ProductionView,ProductionNotices,AttendanceToolbar} from "./team-work";
import {transferProduction,updateProductionJob,readyProductionForAdvisor,canMarkAttendance,validProduction,lastAttendanceMark,type ProductionJob,type AttendanceMark,type AttendanceKind} from "./team-work-model";
import {ManagementView} from "./management-view";
import { AdvisorPerformanceView } from "./advisor-performance";
import { receiptSummary } from "./receipt-summary";
import { OrderSummary } from "./order-summary";
import { orderDocumentImageBlob } from "./order-image-export";
import { OrderDetails } from "./order-details";
import { confirmOrderPickup, type DeliveryConfirmation } from "./order-pickup";
import { paidAmount, requestBalanceCollection, type CashierNotice, removeFromOrderHistories, collectionLane, editedPaymentStatus, updateWithoutPayment, productionStatus, type ProductionStatus } from "./order-workflow";

type Role = "asesor" | "cajera" | "admin" | "gerencia";
type Product = CatalogProduct;
type CartItem = Product & { quantity: number };
type Payment = {
  method: string;
  amount: number;
  reference?: string;
  received?: number;
};
type PaymentRecord = {
  id: string;
  date: string;
  time: string;
  amount: number;
  kind: "Seña" | "Abono" | "Pago de saldo" | "Cobro completo";
  payments: Payment[];
  cashier: string;
};
type Order = {orderUid?:string;advisorSection?:"historial"|"ventas";stockAllocation?:StockAllocation[];advisorHistoryHiddenFor?:string[];importBackupSourceIds?:string[];importBackupFingerprint?:string;originalOrderNumber?:number;importBackupSources?:Record<string,unknown>[];
  importCompleteFingerprint?:string; importedSummary?:{paid:number;movements:number;balance:number}; importFingerprint?: string; creditAccountId?: string; creditCode?: string; withdrawnBy?: string; invoiceReference?: string; dueDate?: string; quoteId?: string;
  id: string;
  customer: string;
  phone?: string;
  ruc?: string;
  invoice?: string;
  invoiceRuc?: string;
  invoiceName?: string;
  invoiceAddress?: string;
  notes?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  productionStatus?: ProductionStatus | "Terminado";
  deliveryConfirmation?: DeliveryConfirmation;
  collectionLane?: "senas" | "pendientes";
  cashierNotice?: CashierNotice;
  advisor: string;
  createdAt: string;
  date?: string;
  items: CartItem[];
  total: number;
  status: "pendiente" | "cobrado" | "devuelto";
  payments?: Payment[];
  cashier?: string;
  refund?: number;
  paymentRecords?: PaymentRecord[];
  receiptKind?: PaymentRecord["kind"];
  collectionEntry?: boolean;
  sourceOrderId?: string;
  receiptSaleTotal?: number;
  receiptPaidBefore?: number;
  receiptPaidNow?: number;
  receiptPaidTotal?: number;
  receiptBalance?: number;
  requestedPayments?: Payment[];
};
type HistoryEntry = Omit<Order, "status"> & { status: Order["status"] | "guardado" };
type WorkOrder = Order & {
  productionStatus: ProductionStatus | "Terminado";
  progress: "Esperando" | "Diseño" | "Producción" | "Listo";
  sentToCashier?: boolean;
};
type Customer = {
  id: number;
  name: string;
  phone: string;
  ruc?: string;
  discount: number;
  special: string;
};
type CashMovement = {
  id: number;
  date: string;
  type: "apertura" | "gasto" | "retiro" | "cierre" | "reapertura";
  amount: number;
  detail: string;
  user: string;
  createdAt?: string;
};
type Store = {productionJobs?:ProductionJob[];attendanceMarks?:AttendanceMark[];stockProducts?:StockProduct[]; orderSequence?:number;
  creditAccounts: CreditAccount[]; creditPayments: CreditPayment[]; quotes: Quote[];
  orders: Order[];
  workOrders: WorkOrder[];
  customers: Customer[];
  products: Product[];
  advisors: string[];
  cashMovements: CashMovement[];
  catalogVersion?: string;
};

const products: Product[] = [
  { id: 1, name: "Impresión A4 color", price: 5000, category: "Impresiones" },
  {
    id: 2,
    name: "Impresión A4 blanco y negro",
    price: 1000,
    category: "Impresiones",
  },
  { id: 3, name: "Plastificado A4", price: 10000, category: "Terminaciones" },
  {
    id: 4,
    name: "Tarjeta personal doble cara",
    price: 100000,
    category: "Diseño e impresión",
  },
  { id: 5, name: "Foto 10 × 15 cm", price: 5000, category: "Fotografía" },
  {
    id: 6,
    name: "Llavero personalizado",
    price: 15000,
    category: "Personalizados",
  },
  { id: 7, name: "Taza sublimada", price: 35000, category: "Sublimación" },
  { id: 8, name: "Impresión DTF 60 × 100 cm", price: 130000, category: "DTF" },
  { id: 9, name: "Diseño gráfico", price: 30000, category: "Diseño" },
];
const initialStore: Store = {
  productionJobs:[],attendanceMarks:[],
  creditAccounts: [], creditPayments: [], quotes: [],
  workOrders: [],
  products: catalogProducts.map((product) => ({ ...product })),
  advisors: ["Aide", "Carlos"],
  catalogVersion,
  cashMovements: [],
  customers: [
    {
      id: 1,
      name: "María González",
      phone: "0981 555 204",
      discount: 10,
      special: "10% en impresiones",
    },
    {
      id: 2,
      name: "Colegio San Miguel",
      phone: "0972 440 198",
      discount: 5,
      special: "Tarifa institucional",
    },
    {
      id: 3,
      name: "Ocasional",
      phone: "",
      discount: 0,
      special: "Precio normal",
    },
  ],
  orders: [
    {
      id: "CP-1048",
      customer: "María González",
      advisor: "Aide",
      createdAt: "14:22",
      status: "pendiente",
      total: 60000,
      items: [
        { ...products[0], quantity: 10 },
        { ...products[4], quantity: 2 },
      ],
    },
    {
      id: "CP-1047",
      customer: "Ocasional",
      advisor: "Carlos",
      createdAt: "14:09",
      status: "cobrado",
      cashierNotice: undefined,
      total: 35000,
      items: [{ ...products[6], quantity: 1 }],
      cashier: "Laura",
      payments: [
        { method: "Efectivo", amount: 20000 },
        { method: "QR", amount: 15000 },
      ],
    },
  ],
};
const money = (value: number) =>
  `${new Intl.NumberFormat("es-PY").format(value)} Gs.`;
const isoToday = () => businessMoment().date;
const hasDepositRequest = (order: Order) => {
  const proposed = (order.requestedPayments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return order.status === "pendiente" && !order.paymentRecords?.length && proposed > 0 && proposed < order.total;
};
const normalizeStore = (value?: Partial<Store> | null): Store => {
  value=reassignRemovedAdvisors(value);
  const needsCatalog = value?.catalogVersion !== catalogVersion;
  const existingOrders = Array.isArray(value?.orders) ? value.orders : initialStore.orders;
  const savedWorkOrders = Array.isArray(value?.workOrders) ? value.workOrders : [];
  const workOrders = savedWorkOrders.map(work => {
    return !work.sentToCashier && work.status === "pendiente" ? { ...work, sentToCashier: true } : work;
  });
  const forwarded = savedWorkOrders.filter(work =>
    !work.sentToCashier && work.status === "pendiente" && !existingOrders.some(order => order.id === work.id),
  ).map(work => ({ ...work }));
  return {
    orderSequence: orderSequence([...existingOrders,...workOrders],value?.orderSequence||0),
    productionJobs:Array.isArray(value?.productionJobs)?value.productionJobs:[],
    attendanceMarks:Array.isArray(value?.attendanceMarks)?value.attendanceMarks:[],
    stockProducts:Array.isArray(value?.stockProducts)?value.stockProducts:[],
    creditAccounts: Array.isArray(value?.creditAccounts) ? value.creditAccounts : [],
    creditPayments: Array.isArray(value?.creditPayments) ? value.creditPayments : [],
    quotes: Array.isArray(value?.quotes) ? value.quotes : [],
    workOrders,
    orders: [...forwarded, ...existingOrders].map((order) => ({
      ...order,
      date: order.date || '',
      ...(order.importCompleteFingerprint?{importCompleteFingerprint:compactImportFingerprint(order.importCompleteFingerprint)}:{}),
    })),
    customers: Array.isArray(value?.customers)
      ? value.customers
      : initialStore.customers,
    products: needsCatalog
      ? catalogProducts.map((product) => ({ ...product }))
      : Array.isArray(value?.products)
        ? value.products
        : catalogProducts.map((product) => ({ ...product })),
    advisors: Array.isArray(value?.advisors)
      ? value.advisors
      : initialStore.advisors,
    cashMovements: Array.isArray(value?.cashMovements)
      ? value.cashMovements
      : [],
    catalogVersion,
  };
};

export function Dashboard() {
  const [role, setRole] = useState<Role>("admin");
  const [user, setUser] = useState("Admi");
  const [view, setView] = useState("resumen");
  const [consultQuery,setConsultQuery]=useState("");
  const [selectedAdvisor,setSelectedAdvisor]=useState("");
  const [creditFocus, setCreditFocus] = useState<string>();
  const [creditOrderFocus, setCreditOrderFocus] = useState<string>();
  const [accountChosen, setAccountChosen] = useState(false);
  const [managementAccessOpen,setManagementAccessOpen]=useState(false);
  const [managementPassword,setManagementPassword]=useState("");
  const [managementPasswordError,setManagementPasswordError]=useState("");
  const [managementAccessBusy,setManagementAccessBusy]=useState(false);
  const [store, renderStore] = useState<Store>(initialStore);
  const synchronizer = useRef<StoreSynchronizer<Store> | null>(null);
  const setStore = (updater: Store | ((state:Store)=>Store)) => {
    if (!synchronizer.current?.ready) throw new Error("La información todavía está cargando");
    synchronizer.current.update(state=>{const proposed=reassignRemovedAdvisors(typeof updater==='function'?updater(state):updater);const identities=new Map([...state.orders,...state.workOrders].filter(order=>order.orderUid).map(order=>[order.id,order.orderUid!]));const existing=new Set([...state.orders,...state.workOrders].map(order=>order.id));const identify=(order:Order)=>{if(order.orderUid||existing.has(order.id)&&!identities.has(order.id))return order;const uid=identities.get(order.id)||crypto.randomUUID();identities.set(order.id,uid);return {...order,orderUid:uid};};const identified={...proposed,orders:proposed.orders.map(identify),workOrders:proposed.workOrders.map(order=>({...order,...identify(order)}))};const next=applyStockTransitions(state,identified);return {...next,orderSequence:orderSequence([...next.orders,...next.workOrders],Math.max(state.orderSequence||0,next.orderSequence||0))};});
  };
  const [saleNoteId, setSaleNoteId] = useState<string>();
  const convertedNotes = useMemo(() => new Set(
    [...store.orders, ...store.workOrders].flatMap(order => order.orderUid ? [order.orderUid] : [])
  ), [store.orders, store.workOrders]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [directCheckoutOrder, setDirectCheckoutOrder] = useState<Order | null>(null);
  const [consultedOrderId, setConsultedOrderId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editingWorkOrderId, setEditingWorkOrderId] = useState<string | null>(null);
  const [managementMenuOpen, setManagementMenuOpen] = useState(false);
  const [editingReturnView, setEditingReturnView] = useState("pendientes");
  const [salePreviewOpen, setSalePreviewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [customer, setCustomer] = useState("Ocasional");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerRuc, setCustomerRuc] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    ruc: "",
    discount: 0,
  });
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([
    { method: "Efectivo", amount: 0 },
  ]);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [redoOrder, setRedoOrder] = useState<Order | null>(null);
  const [returnHistoryOrder,setReturnHistoryOrder]=useState<Order|null>(null);
  const [bulkMoveIds,setBulkMoveIds]=useState<string[]>([]);
  const [moveSection,setMoveSection]=useState<"historial"|"ventas">("historial");
  const [hideHistoryOrder,setHideHistoryOrder]=useState<Order|null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [syncStatus,setSyncStatus] = useState<SyncStatus>('loading');
  const [syncMessage,setSyncMessage] = useState('');
  const currentStore = useRef(store);
  useEffect(() => {
    let journal:StoreJournal<Store>|undefined;
    try{const saved=localStorage.getItem('copyprint-caja-journal');if(saved){const parsed=JSON.parse(saved);if(parsed.current&&parsed.base)journal={current:normalizeStore(parsed.current),base:normalizeStore(parsed.base),pending:!!parsed.pending};}else{const saved=localStorage.getItem('copyprint-caja');if(saved){const cached=normalizeStore(JSON.parse(saved));journal={current:cached,base:cached,pending:false};}}}catch{}
    let storageWarning=false;
    const controller=new StoreSynchronizer<Store>({initial:normalizeStore(initialStore),journal,online:()=>navigator.onLine,
      read:async()=>{const response=await fetch('/api/store',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('No se pudo cargar la información en línea');const data=await response.json() as {store?:Partial<Store>};return data.store?normalizeStore(data.store):null;},
      write:async(snapshot,base)=>{const response=await fetch('/api/store',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({store:snapshot,base}),signal:AbortSignal.timeout(20000)});const data=await response.json() as {error?:string;store?:Partial<Store>};if(!response.ok)throw new Error(data.error||'No se pudo guardar en línea');if(!data.store)throw new Error('No se recibió la confirmación del guardado');return normalizeStore(data.store);},
      persist:journal=>{try{localStorage.setItem('copyprint-caja-journal',JSON.stringify(journal));localStorage.setItem('copyprint-caja',JSON.stringify(journal.current));}catch{if(!storageWarning){storageWarning=true;toast.error('Este navegador no pudo guardar la copia de respaldo. Mantené la página abierta hasta que indique Guardado.');}}},
      onStore:snapshot=>{currentStore.current=snapshot;renderStore(snapshot);},
      onStatus:(status,error)=>{setSyncStatus(status);setSyncMessage(error?.message||'');},
    });
    synchronizer.current=controller;void controller.load();
    const reconnect=()=>{void controller.flush();void controller.pull();};
    const disconnect=()=>setSyncStatus('offline');
    const leave=()=>{if(controller.pending&&navigator.onLine)void fetch('/api/store',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(controller.snapshot()),keepalive:true}).catch(()=>{});};
    const timer=setInterval(()=>{if(controller.pending)void controller.flush();else void controller.pull();},5000);
    window.addEventListener('online',reconnect);window.addEventListener('offline',disconnect);window.addEventListener('pagehide',leave);
    return()=>{clearInterval(timer);window.removeEventListener('online',reconnect);window.removeEventListener('offline',disconnect);window.removeEventListener('pagehide',leave);controller.dispose();};
  }, []);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool?: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "create_cash_order",
          title: "Crear pedido para caja",
          description:
            "Crea un pedido de Copy Print con un producto, cantidad y precio unitario, y lo deja esperando cobro.",
          inputSchema: {
            type: "object",
            properties: {
              customer: { type: "string" },
              product: { type: "string" },
              quantity: { type: "number", minimum: 1 },
              unitPrice: { type: "number", minimum: 0 },
            },
            required: ["customer", "product", "quantity", "unitPrice"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: unknown) {
            const latestControl = currentStore.current.cashMovements.find(
              (movement) =>
                movement.date === isoToday() &&
                ["apertura", "cierre", "reapertura"].includes(movement.type),
            );
            if (
              latestControl?.type !== "apertura" &&
              latestControl?.type !== "reapertura"
            )
              throw new Error("La caja debe estar abierta para crear pedidos");
            const value = input as {
              customer?: string;
              product?: string;
              quantity?: number;
              unitPrice?: number;
            };
            if (
              !value.customer?.trim() ||
              !value.product?.trim() ||
              !Number.isFinite(value.quantity) ||
              !Number.isFinite(value.unitPrice) ||
              Number(value.quantity) < 1 ||
              Number(value.unitPrice) < 0
            )
              throw new Error("Datos de pedido inválidos");
            const quantity = Number(value.quantity),
              price = Number(value.unitPrice);
            const order: Order = {
              id: nextOrderId([...currentStore.current.orders,...currentStore.current.workOrders],currentStore.current.orderSequence),
              customer: value.customer.trim(),
              advisor: user,
              createdAt: new Date().toLocaleTimeString("es-PY", { hourCycle:"h23", timeZone:"America/Asuncion",
                hour: "2-digit",
                minute: "2-digit",
              }),
              date: isoToday(),
              items: [
                {
                  id: Date.now(),
                  name: value.product.trim(),
                  category: "Manual",
                  price,
                  quantity,
                },
              ],
              total: quantity * price,
              status: "pendiente",
            };
            setStore((current) => ({
              ...current,
              orders: [order, ...current.orders],
            }));
            return { id: order.id, status: order.status, total: order.total };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, [user]);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const filtered = useMemo(() => store.products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (category === "Todos" || p.category === category),
  ), [store.products, search, category]);
  const pending = useMemo(() => store.orders.filter(
    (o) => !o.creditAccountId && o.status === "pendiente",
  ).sort((a,b) => (b.cashierNotice?.at || "").localeCompare(a.cashierNotice?.at || "")), [store.orders]);
  const deposits = useMemo(() => store.orders.filter(
    (o) => !o.creditAccountId && o.status === "pendiente" && collectionLane(o) === "senas",
  ).sort((a,b) => (b.cashierNotice?.at || "").localeCompare(a.cashierNotice?.at || "")), [store.orders]);
  const reportOrders = useMemo(() => {
  const rows: Order[] = store.orders.flatMap((order) => {
    if (!order.paymentRecords?.length) return includeLegacyCashOrder(order)?[order]:[];
    let accumulated = order.importedSummary?.paid || 0;
    return datedCashRecords(order).map((record) => {
      const paidBefore = accumulated;
      accumulated += record.amount;
      return {
        ...order,
        id: record.id,
        sourceOrderId: order.id,
        date: record.date,
        createdAt: record.time,
        total: record.amount,
        status: "cobrado" as const,
        payments: record.payments,
        cashier: record.cashier,
        receiptKind: record.kind,
        collectionEntry: true,
        receiptSaleTotal: order.total,
        receiptPaidBefore: paidBefore,
        receiptPaidNow: record.amount,
        receiptPaidTotal: accumulated,
        receiptBalance: Math.max(0, order.total - accumulated),
        refund: undefined,
        items: [{
          id: Number(record.id.replace(/\D/g, "").slice(-9)) || Date.now(),
          name: `${record.kind} del pedido ${order.id}`,
          price: record.amount,
          quantity: 1,
          category: "Cobros",
        }],
      };
    });
  });
  for(const payment of store.creditPayments.filter(entry=>(entry.unallocatedAmount||0)>0)){const account=store.creditAccounts.find(entry=>entry.id===payment.accountId);rows.push({id:payment.id+'-saldo-a-favor',creditAccountId:payment.accountId,customer:account?.name||'Cliente',advisor:payment.cashier,date:payment.date,createdAt:payment.time,total:payment.unallocatedAmount!,status:'cobrado',payments:[{method:'No especificado',amount:payment.unallocatedAmount!}],items:[{id:1,name:'Pago a cuenta / saldo a favor',category:'Cobros',quantity:1,price:payment.unallocatedAmount!}],collectionEntry:true});}
  return rows;
  }, [store.orders, store.creditPayments, store.creditAccounts]);
  const depositTicket = (order: Order, record: PaymentRecord): Order => {
    const records = order.paymentRecords || [];
    const recordIndex = records.findIndex(item => item.id === record.id);
    const paidBefore = records.slice(0, recordIndex < 0 ? 0 : recordIndex).reduce((sum, item) => sum + item.amount, 0);
    return {
      ...order,
      id: record.id,
      date: record.date,
      createdAt: record.time,
      payments: record.payments,
      cashier: record.cashier,
      receiptKind: record.kind,
      receiptSaleTotal: order.total,
      receiptPaidBefore: paidBefore,
      receiptPaidNow: record.amount,
      receiptPaidTotal: paidBefore + record.amount,
      receiptBalance: Math.max(0, order.total - paidBefore - record.amount),
      collectionEntry: true,
      items: order.items,
    };
  };
  const openHistoryTicket = (entry: Order) => {
    const source = entry.sourceOrderId ? store.orders.find(order => order.id === entry.sourceOrderId) : undefined;
    const record = source?.paymentRecords?.find(item => item.id === entry.id);
    setReceiptOrder(source && record ? depositTicket(source, record) : entry);
  };
  const resolveHistoryOrder = (entry: HistoryEntry): Order => store.orders.find(order => order.id === (entry.sourceOrderId || entry.id)) || store.workOrders.find(order => order.id === entry.id) || { ...entry, status: entry.status === "guardado" ? "pendiente" : entry.status };
  const editHistoryOrder = (entry: HistoryEntry) => {
    const order = resolveHistoryOrder(entry);
    if (order.creditAccountId) { setCreditFocus(order.creditAccountId); setCreditOrderFocus(order.id); setView("creditos"); return; }
    if (store.orders.some(item => item.id === order.id)) editPendingOrder(order);
    else editWorkOrder(order as WorkOrder);
  };
  const updateProductionStatus = (entry: Pick<Order, "id" | "sourceOrderId">, value: ProductionStatus) => {
    const id = entry.sourceOrderId || entry.id;
    const deliveryConfirmation = value === "Entregado" ? { by: user, ...businessMoment() } : undefined;
    setStore(state => ({ ...state,
      orders: state.orders.map(order => order.id === id ? { ...order, productionStatus: value, deliveryConfirmation: order.productionStatus === value ? order.deliveryConfirmation : deliveryConfirmation } : order),
      workOrders: state.workOrders.map(order => order.id === id ? { ...order, productionStatus: value, deliveryConfirmation: order.productionStatus === value ? order.deliveryConfirmation : deliveryConfirmation } : order),
    }));
  };
  const confirmPickup = (entry: Order) => {
    if (role !== "admin" && role !== "cajera" && role !== "asesor") return false;
    try {
      setStore(state => {
        const latest = state.orders.find(order => order.id === entry.id);
        if (!latest || (entry.orderUid && latest.orderUid !== entry.orderUid)) throw new Error("Este pedido ya no está disponible");
        const delivered = confirmOrderPickup(latest, { by: user, ...businessMoment() });
        return { ...state,
          orders: state.orders.map(order => order.id === latest.id ? delivered : order),
          workOrders: state.workOrders.map(order => order.id === latest.id ? { ...order, productionStatus: delivered.productionStatus!, deliveryConfirmation: delivered.deliveryConfirmation } : order),
        };
      });
      toast.success("Entrega registrada. El pago original se conserva");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo confirmar la entrega");
      return false;
    }
  };
  const orderHistory = useMemo(() => {
    const orderIds = new Set(store.orders.map(order => order.id));
    return [...store.workOrders.filter(work => !orderIds.has(work.id)).map(work => ({ ...work, status: "guardado" as const })), ...store.orders];
  }, [store.orders, store.workOrders]);
  const advisorHistory = useMemo(() => orderHistory.filter(order => isPersonalOrder(order, user)), [orderHistory, user]);
  const otherAdvisorOrders = useMemo(() => role === "asesor" && view === "historial"
    ? orderHistory.filter(order => order.advisor !== user && !order.creditAccountId)
    : [], [orderHistory, role, user, view]);
  const storedConsultedOrder = consultedOrderId ? store.orders.find(order => order.id === consultedOrderId) : undefined;
  const consultedOrder = storedConsultedOrder || (consultedOrderId ? store.workOrders.find(order => order.id === consultedOrderId) : undefined) || null;
  const consultingAnotherAdvisor = role === "asesor" && !!consultedOrder && consultedOrder.advisor !== user;
  const notifyCashier = (entry: HistoryEntry) => {
    if (!cashOpen) return toast.error("La caja debe estar abierta para avisar el cobro");
    const order = resolveHistoryOrder(entry);
    if (order.creditAccountId) { setCreditFocus(order.creditAccountId); setCreditOrderFocus(undefined); setView("creditos"); setConsultedOrderId(null); toast.info("Este pedido se cobra desde su cuenta en Créditos"); return; }
    const updated = requestBalanceCollection(order, user, new Date().toISOString());
    if (!updated) return toast.info("Este pedido no tiene saldo pendiente");
    setStore(state => ({ ...state,
      orders: state.orders.some(item => item.id === order.id) ? state.orders.map(item => item.id === order.id ? updated : item) : [updated, ...state.orders],
      workOrders: state.workOrders.map(item => item.id === order.id ? { ...item, sentToCashier: true } : item),
    }));
    setConsultedOrderId(null);
    toast.success(`Caja avisada para cobrar el saldo del pedido ${order.id}`);
  };
  const downloadHistoryTicket = (entry: HistoryEntry) => {
    downloadOrderImage(resolveHistoryOrder(entry));
  };
  const currentBusinessDate = isoToday();
  const latestCashControl = useMemo(() => store.cashMovements.find(
    (movement) =>
      movement.date === currentBusinessDate &&
      ["apertura", "cierre", "reapertura"].includes(movement.type),
  ), [store.cashMovements, currentBusinessDate]);
  const cashOpen =
    latestCashControl?.type === "apertura" ||
    latestCashControl?.type === "reapertura";
  const todayPaid = useMemo(() => reportOrders.filter(
    (o) => o.status !== "pendiente" && o.date === currentBusinessDate,
  ), [reportOrders, currentBusinessDate]);
  const enterAccount = (value: string) => {
    const [next, name] = value.split(":") as [Role, string];
    if (saleNoteId) clearSale();
    setRole(next);
    setUser(name);
    setView(
      next === "gerencia" ? "gerencia" : next === "asesor"
        ? "venta"
        : next === "cajera"
          ? "pendientes"
          : "resumen",
    );
  };
  const switchAccount=(value:string)=>{if(value.startsWith("gerencia:")){setManagementPassword("");setManagementPasswordError("");setManagementAccessOpen(true);return;}enterAccount(value);};
  const chooseAccount=(value:string)=>{switchAccount(value);if(!value.startsWith("gerencia:"))setAccountChosen(true);};
  const unlockManagement=async()=>{if(managementAccessBusy)return;setManagementAccessBusy(true);setManagementPasswordError("");try{const response=await fetch('/api/management-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:managementPassword}),cache:'no-store'});const result=await response.json() as {ok?:boolean;error?:string};if(!response.ok||!result.ok){setManagementPasswordError(result.error||'Contraseña incorrecta.');setManagementPassword("");return;}enterAccount('gerencia:Gerencia');setAccountChosen(true);setManagementAccessOpen(false);setManagementPassword("");}catch{setManagementPasswordError('No se pudo verificar. Revisá la conexión e intentá de nuevo.');}finally{setManagementAccessBusy(false);}};
  const addProduct = (product: Product & { quantity?: number }) =>
    setCart((items) => {
      const current = product.name.trim() ? items.filter(item => item.name.trim() || item.price > 0) : items;
      const quantity = Math.max(1, Number(product.quantity) || 1);
      const found = current.find((i) => i.id === product.id);
      return found
        ? current.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i,
          )
        : [...current, { ...product, quantity }];
    });
  const updateQty = (id: number, delta: number) =>
    setCart((items) =>
      items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i,
      ),
    );
  const updatePrice = (id: number, price: number) =>
    setCart((items) =>
      items.map((i) => (i.id === id ? { ...i, price: Math.max(0, price) } : i)),
    );
  const updateName = (id: number, name: string) =>
    setCart((items) => items.map((i) => i.id === id ? { ...i, name, stockId:undefined } : i));
  const chooseProduct = useCallback((id: number, product: Product) =>
    setCart((items) => items.map((item) => item.id === id
      ? { ...item, name: product.name, price: product.price, category: product.category,stockId:product.stockId }
      : item)), []);
  const clearSale = () => {
    setSaleNoteId(undefined);
    setCart([]);
    setCustomer("Ocasional");
    setCustomerPhone("");
    setCustomerRuc("");
    setEditingOrderId(null);
    setEditingWorkOrderId(null);
  };
  const makeOrderFromNote = (note: WhatsAppNote) => {
    if (convertedNotes.has(note.id)) {
      toast.info("Esta nota ya se convirtió en un pedido");
      return;
    }
    if (saleNoteId !== note.id && (cart.some(item => item.name.trim() || item.price > 0) || editingOrderId || editingWorkOrderId ||
      customer && customer !== "Ocasional" || customerPhone || customerRuc) &&
      !window.confirm("Ya hay datos en Nuevo pedido. ¿Querés reemplazarlos con el nombre y teléfono de esta nota?")) return;
    clearSale();
    setSaleNoteId(note.id);
    setCustomer(note.name);
    setCustomerPhone(note.phone);
    setView("venta");
  };
  const canNotifyProduction=role==='asesor'&&['tahir','ricardo'].includes(user.trim().toLowerCase());
  const canManageProduction=role==='admin'||canNotifyProduction;
  const saveProduction=(draft:ProductionJob)=>{if(role!=='asesor'&&role!=='admin')return false;if(!validProduction(draft)){toast.error('Elegí Ricardo o Tahir y completá cantidad, descripción, fecha, hora y estado válidos');return false;}try{setStore(state=>{const previous=state.productionJobs?.find(job=>job.id===draft.id);if(previous&&(!canManageProduction&&previous.advisor!==user))throw new Error('Solo podés editar tus trabajos');const at=new Date().toISOString();const job=updateProductionJob({...draft,description:draft.description.trim(),orderNumber:draft.orderNumber?.trim()||undefined,advisor:previous?.advisor||user,createdAt:previous?.createdAt||at},previous,at,canNotifyProduction);return {...state,productionJobs:previous?(state.productionJobs||[]).map(item=>item.id===job.id?job:item):[job,...(state.productionJobs||[])]};});toast.success('Trabajo de Producción guardado');return true;}catch(error){toast.error(error instanceof Error?error.message:'No se pudo guardar');return false;}};
  const transferProductionResponsible=(id:string,responsible:'Ricardo'|'Tahir')=>{if(role!=='asesor'&&role!=='admin')return;try{setStore(state=>{const job=state.productionJobs?.find(item=>item.id===id);if(!job||(!canManageProduction&&job.advisor!==user))throw new Error('No podés transferir este trabajo');return {...state,productionJobs:state.productionJobs!.map(item=>item.id===id?transferProduction(item,responsible,new Date().toISOString()):item)};});toast.success(`Trabajo transferido a ${responsible}`);}catch(error){toast.error(error instanceof Error?error.message:'No se pudo transferir');}};
  const setProductionStatus=(id:string,status:ProductionJob['status'])=>{if(role!=='admin'&&role!=='asesor')return;if(!['Pendiente','En proceso','Listo'].includes(status))return;try{setStore(state=>{if(!state.productionJobs?.some(job=>job.id===id))throw new Error('Este trabajo ya no está disponible');return {...state,productionJobs:state.productionJobs.map(job=>job.id===id&&job.status!==status?updateProductionJob({...job,status},job,new Date().toISOString(),canNotifyProduction):job)};});toast.success('Estado de Producción actualizado');}catch(error){toast.error(error instanceof Error?error.message:'No se pudo actualizar el estado');}};
  const readProductionNotice = (id: string, readyAt: string) => {
    if (role !== 'asesor') return;
    try {
      setStore(state => ({
        ...state,
        productionJobs: state.productionJobs?.map(job =>
          job.id === id && readyProductionForAdvisor(job, user) && job.readyAt === readyAt
            ? { ...job, readySeenAt: readyAt }
            : job),
      }));
    } catch {
      toast.error('No se pudo marcar el aviso como leído. Intentá de nuevo.');
    }
  };
  const deleteProduction=(job:ProductionJob)=>{if(role!=='asesor'&&role!=='admin')return;setStore(state=>({...state,productionJobs:(state.productionJobs||[]).filter(item=>item.id!==job.id||(!canManageProduction&&item.advisor!==user))}));toast.success('Trabajo eliminado de Producción');};
  const undoAttendance=async(expectedId:string)=>{if(role!=='asesor')return;try{const response=await fetch('/api/time',{cache:'no-store'});if(!response.ok)throw new Error('No se pudo consultar la hora');const {now}=await response.json() as {now:string};if(!Number.isFinite(Date.parse(now)))throw new Error('Hora no disponible');setStore(state=>{const target=lastAttendanceMark(state.attendanceMarks||[],user,now);if(!target||target.id!==expectedId)throw new Error('La última marca cambió. Revisá la lista antes de corregir.');return {...state,attendanceMarks:[...(state.attendanceMarks||[]),{id:crypto.randomUUID(),advisor:user,at:now,kind:'correccion',corrects:target.id}]};});toast.success('Última marca anulada. Podés volver a marcar correctamente.');}catch(error){toast.error(error instanceof Error?error.message:'No se pudo corregir la marca');}};
  const markAttendance=async(kind:AttendanceKind)=>{if(role!=='asesor')return;try{const response=await fetch('/api/time',{cache:'no-store'});if(!response.ok)throw new Error('No se pudo consultar la hora. Intentá de nuevo.');const {now}=await response.json() as {now:string};if(!Number.isFinite(Date.parse(now)))throw new Error('Hora no disponible');setStore(state=>{if(!canMarkAttendance(state.attendanceMarks||[],user,kind,now))throw new Error('Esta marca ya está registrada o falta completar la anterior');return {...state,attendanceMarks:[...(state.attendanceMarks||[]),{id:crypto.randomUUID(),advisor:user,at:now,kind}]};});toast.success('Horario registrado');}catch(error){toast.error(error instanceof Error?error.message:'No se pudo registrar la marca');}};
  const saveSale = (details: SaleDetails, enteredPayments: SalePayment[], destination: "guardar" | "enviar" | "cobrar" | "actualizar" | "abonar") => {
    if (destination !== "guardar" && destination !== "actualizar" && !cashOpen) { toast.error("La caja debe estar abierta"); return false; }
    if (!cart.length || cart.some(item => !item.name.trim())) { toast.error("Completá los productos"); return false; }
    if (destination === "cobrar" && role !== "admin") return false;
    const previous = store.orders.find(order => order.id === (editingOrderId || editingWorkOrderId));
    if (previous && enteredPayments.some(payment => payment.amount > 0) && (destination === "actualizar" || destination === "enviar")) destination = "abonar";
    const previousWork = editingWorkOrderId ? store.workOrders.find(order => order.id === editingWorkOrderId) : undefined;
    const sourceNoteId = previous || previousWork ? undefined : saleNoteId;
    if (sourceNoteId && [...currentStore.current.orders, ...currentStore.current.workOrders].some(item => item.orderUid === sourceNoteId)) {
      toast.error("Esta nota ya se convirtió en un pedido");
      return false;
    }
    const created = orderCreationMoment(previous || previousWork);
    const order: Order = {
      ...(previousWork || {}),
      ...(previous || {}),
      ...(sourceNoteId ? { orderUid: sourceNoteId } : {}),
      id: previous?.id || previousWork?.id || nextOrderId([...currentStore.current.orders,...currentStore.current.workOrders],currentStore.current.orderSequence),
      advisorSection: destination === "guardar" ? "historial" : "ventas",
      customer: customer.trim() || "Ocasional",
      phone: customerPhone.trim() || undefined,
      ruc: customerRuc.trim() || undefined,
      advisor: previous?.advisor || previousWork?.advisor || details.advisor,
      invoice: details.invoice,
      invoiceRuc: details.invoice === "Con factura" ? details.invoiceRuc.trim() || undefined : undefined,
      invoiceName: details.invoice === "Con factura" ? details.invoiceName.trim() || undefined : undefined,
      invoiceAddress: details.invoice === "Con factura" ? details.invoiceAddress.trim() || undefined : undefined,
      notes: details.notes.trim() || undefined,
      deliveryDate: details.deliveryDate || undefined,
      deliveryTime: details.deliveryTime || undefined,
      createdAt: created.time,
      date: created.date,
      items: cart.map(item => ({ ...item })),
      total: cartTotal,
      status: previous?.status === "pendiente" ? "pendiente" : previous ? editedPaymentStatus(previous, cartTotal) : "pendiente",
      collectionLane: previous ? collectionLane(previous) : undefined,
      requestedPayments: enteredPayments.filter(payment => payment.amount > 0),
      cashierNotice: destination === "enviar" && previous && editedPaymentStatus(previous, cartTotal) === "pendiente" ? { by: user, at: new Date().toISOString(), reason: "actualizado" } : undefined,
    };
    if (destination === "abonar") {
      if (previous && role === "asesor") {
        if (cartTotal < paidAmount(previous)) { toast.error("El total no puede ser menor que lo ya abonado"); return false; }
        const updated = {...updateWithoutPayment(previous, order), requestedPayments: enteredPayments.filter(payment=>payment.amount>0), collectionLane: "senas" as const, cashierNotice: {by:user,at:new Date().toISOString(),reason:"actualizado" as const}};
        setStore(state=>({...state,orders:state.orders.map(item=>item.id===previous.id?updated:item),workOrders:state.workOrders.map(item=>item.id===previous.id?{...item,...updated,productionStatus:item.productionStatus,progress:item.progress}:item)}));
        clearSale(); setView("historial"); toast.success("Pedido guardado. Seña pendiente de registrar por Admi"); return true;
      }
      if (!previous || !["admin", "cajera", "asesor"].includes(role)) return false;
      if (cartTotal < paidAmount(previous)) { toast.error("El total no puede ser menor que lo ya abonado"); return false; }
      if (confirmInlinePayment(previous, enteredPayments, order, true) !== true) return false;
      clearSale(); setView(collectionLane(order)); return true;
    }
    if(destination==='actualizar'){if(!previous){toast.error('Seleccioná un pedido existente para actualizar');return false;}if(cartTotal<paidAmount(previous)){toast.error('El total no puede ser menor que lo ya abonado');return false;}const updated=updateWithoutPayment(previous,order);setStore(state=>({...state,orders:state.orders.map(item=>item.id===previous.id?updated:item),workOrders:state.workOrders.map(item=>item.id===previous.id?{...item,...updated,productionStatus:item.productionStatus,progress:item.progress}:item)}));clearSale();setView(role==='admin'||role==='cajera'?editingReturnView:advisorSection(updated,store.workOrders)==='ventas'?'ventas':'historial');toast.success('Pedido actualizado sin registrar ningún cobro');return true;}
    if (destination === "cobrar" && previous?.status === "pendiente" && cartTotal === paidAmount(previous)) { if(confirmInlinePayment(previous, [], order) !== true) return false; clearSale(); setView("pendientes"); return true; }
    if (destination === "cobrar" && (order.status === "devuelto" || cartTotal <= paidAmount(order))) { toast.error("Este pedido no tiene saldo para cobrar"); return false; }
    if (destination === "guardar" && previous) { toast.error("Este pedido ya está en caja. Usá Enviar a caja."); return false; }
    if (destination === "guardar") {
      if (previous?.paymentRecords?.length) { toast.error("Este pedido ya tiene cobros. Editalo desde Señas."); return false; }
      const work: WorkOrder = { ...order, productionStatus: previousWork?.productionStatus || "Pendiente", progress: previousWork?.progress || "Esperando", sentToCashier: true };
      setStore(state => ({ ...state,
        orders: [order, ...state.orders],
        workOrders: previousWork ? state.workOrders.map(item => item.id === work.id ? work : item) : [work, ...state.workOrders],
      }));
      toast.success(hasDepositRequest(order) ? "Pedido guardado y seña enviada a la Admi para confirmar" : order.requestedPayments?.length ? "Pedido guardado y pago enviado a caja" : "Pedido guardado en Pedidos y disponible en caja para cobrar");
    } else {
      setStore(state => ({ ...state,
        orders: previous ? state.orders.map(item => item.id === order.id ? order : item) : [order, ...state.orders],
        workOrders: previousWork ? state.workOrders.map(item => item.id === previousWork.id ? { ...item, ...order, productionStatus: item.productionStatus, progress: item.progress, sentToCashier: true } : item) : state.workOrders,
      }));
      if (destination !== "cobrar") toast.success(collectionLane(order) === "senas" ? "Seña enviada a la Admi para confirmar" : previous ? "Orden actualizada en caja" : "Enviado a caja para cobrar");
    }
    clearSale();
    if (destination === "cobrar") { setDirectCheckoutOrder(order); return true; }
    setView(role === "admin" && destination === "enviar" ? collectionLane(order) : role === "asesor" && destination === "enviar" ? "ventas" : "historial");
    return true;
  };
  const editWorkOrder = (order: WorkOrder) => {
    setSaleNoteId(undefined);
    const sent = store.orders.find(item => item.id === order.id);
    if (sent) return editPendingOrder(sent);
    setEditingWorkOrderId(order.id);
    setEditingOrderId(null);
    setCart(order.items.map(item => ({ ...item })));
    setCustomer(order.customer);
    setCustomerPhone(order.phone || "");
    setCustomerRuc(order.ruc || "");
    setView("venta");
  };
  const sendWorkOrder = (order: WorkOrder) => {
    if (!cashOpen) return toast.error("La caja debe estar abierta para enviar a cobrar");
    if (store.orders.some(item => item.id === order.id)) return toast.error("Este pedido ya está en caja");
    setStore(state => ({ ...state,
      orders: [{ ...order, advisorSection:"ventas", status: "pendiente", paymentRecords: [], payments: [] }, ...state.orders],
      workOrders: state.workOrders.map(item => item.id === order.id ? { ...item, advisorSection:"ventas", sentToCashier: true } : item),
    }));
    if(role==="asesor")setView("ventas");
    toast.success("Pedido enviado a caja para cobrar");
  };
  const chooseCustomer = (name: string) => {
    setCustomer(name);
  };
  const selectCustomer = (selected: Customer) => {
    setCustomer(selected.name);
    setCustomerPhone(selected.phone || "");
    setCustomerRuc(selected.ruc || "");
  };
  const sendOrder = () => {
    if (!cashOpen)
      return toast.error("La caja debe estar abierta antes de registrar ventas");
    if (!cart.length) return toast.error("Agregá al menos un producto");
    if (editingOrderId) {
      setStore((s) => ({
        ...s,
        orders: s.orders.map((order) =>
          order.id === editingOrderId
            ? {
                ...order,
                customer: customer.trim() || "Ocasional",
                phone: customerPhone.trim() || undefined,
                ruc: customerRuc.trim() || undefined,
                items: cart,
                total: cartTotal,
              }
            : order,
        ),
      }));
      setEditingOrderId(null);
      setCart([]);
      setView(editingReturnView);
      toast.success("Pedido actualizado y listo para cobrar");
      return;
    }
    const order: Order = {
      id: nextOrderId([...currentStore.current.orders,...currentStore.current.workOrders],currentStore.current.orderSequence),
      customer: customer.trim() || "Ocasional",
      phone: customerPhone.trim() || undefined,
      ruc: customerRuc.trim() || undefined,
      advisor: user,
      createdAt: new Date().toLocaleTimeString("es-PY", { hourCycle:"h23", timeZone:"America/Asuncion",
        hour: "2-digit",
        minute: "2-digit",
      }),
      date: isoToday(),
      items: cart,
      total: cartTotal,
      status: "pendiente",
    };
    setStore((s) => ({ ...s, orders: [order, ...s.orders] }));
    setCart([]);
    toast.success("Pedido enviado a caja");
  };
  const editPendingOrder = (order: Order) => {
    setSaleNoteId(undefined);
    setEditingOrderId(order.id);
    setEditingWorkOrderId(null);
    setEditingReturnView(collectionLane(order));
    setCart(order.items.map((item) => ({ ...item })));
    setCustomer(order.customer || "Ocasional");
    setCustomerPhone(order.phone || "");
    setCustomerRuc(order.ruc || "");
    setView("venta");
    toast.success("Pedido cargado para editar");
  };
  const paymentTotal = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const openPayment = (order: Order) => {
    if (!cashOpen)
      return toast.error("No se puede cobrar: la caja está cerrada");
    setPaymentOrder(order);
    setPayments([{ method: "Efectivo", amount: 0 }]);
  };
  const confirmPayment = () => {
    if(!paymentOrder)return;
    const latest=currentStore.current.orders.find(order=>order.id===(paymentOrder.sourceOrderId||paymentOrder.id));
    if(!latest){toast.error('Este pedido ya no está disponible. Actualizá el historial.');return;}
    if(paymentTotal<latest.total-paidAmount(latest)){toast.error('El pago todavía está incompleto');return;}
    if(confirmInlinePayment(latest,payments)===true)setPaymentOrder(null);
  };
  const confirmInlinePayment = (order: Order, inlinePayments: Payment[], draft?: Order, keepPending = false) => {
    const latest=currentStore.current.orders.find(item=>item.id===(order.sourceOrderId||order.id));
    if(!latest)return toast.error("Este pedido ya no está disponible. Actualizá el historial.");
    if(latest.status === "devuelto") return toast.error("Este pedido fue devuelto");
    if(draft && draft.total < paidAmount(latest)) return toast.error("El total no puede ser menor que lo ya abonado");
    order=draft ? updateWithoutPayment(latest, draft) : latest;
    if(inlinePayments.some(payment=>!Number.isFinite(payment.amount)||payment.amount<0))return toast.error("Ingresá montos válidos");
    if (!cashOpen)
      return toast.error("No se puede cobrar: la caja está cerrada");
    const receivedTotal = inlinePayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0,
    );

    const previousPaid = paidAmount(order);
    const outstanding = Math.max(0, order.total - previousPaid);
    if (!outstanding) {
      if (order.status !== "pendiente" || keepPending || receivedTotal > 0) return toast.error("Este pedido ya está pagado");
      setStore(state=>({...state,orders:state.orders.map(item=>item.id===order.id?{...item,status:"cobrado",requestedPayments:[],cashierNotice:undefined}:item)}));
      toast.success("Pago completo confirmado. Buscá el pedido en Cobrar para confirmar la entrega"); return true;
    }
    if (receivedTotal <= 0) return toast.error("Ingresá el monto recibido");
    const change = Math.max(0, receivedTotal - outstanding);
    if (change > inlinePayments.filter(payment => payment.method === "Efectivo").reduce((sum, payment) => sum + payment.amount, 0))
      return toast.error("El monto no puede superar el saldo salvo que sea efectivo");
    let changeRemaining = change;
    const storedPayments = inlinePayments.map((payment) => {
      if (changeRemaining > 0 && payment.method === "Efectivo") {
        const deduction = Math.min(changeRemaining, payment.amount);
        changeRemaining -= deduction;
        return {
          ...payment,
          received: payment.amount,
          amount: payment.amount - deduction,
        };
      }
      return payment;
    });
    const collected = Math.min(receivedTotal, outstanding);
    const kind: PaymentRecord["kind"] =
      collected < outstanding ? (previousPaid ? "Abono" : "Seña") : previousPaid ? "Pago de saldo" : "Cobro completo";
    const record: PaymentRecord = {
      id: `${order.id}-${crypto.randomUUID()}`,
      ...collectionMoment(),
      amount: collected,
      kind,
      payments: storedPayments,
      cashier: user,
    };
    const paidOrder: Order = {
      ...order,
      status: !keepPending && previousPaid + collected >= order.total ? "cobrado" : "pendiente",
      payments: [...(order.payments || []), ...storedPayments],
      paymentRecords: [...(order.paymentRecords?.length ? order.paymentRecords : previousPaid > 0 ? [{ id: `${order.id}-previo`, date: order.date || isoToday(), time: order.createdAt, amount: previousPaid, kind: "Seña" as const, payments: order.payments || [], cashier: order.cashier || user }] : []), record],
      cashier: user,
      requestedPayments: [],
      cashierNotice: undefined,
    };
    try{setStore((state) => ({
      ...state,
      orders: state.orders.map((item) => item.id === order.id ? paidOrder : item),
      workOrders: state.workOrders.map(item => item.id === order.id ? {...item,...paidOrder,productionStatus:item.productionStatus,progress:item.progress} : item),
    }));}catch(error){toast.error(error instanceof Error?error.message:'No se pudo confirmar la venta');return false;}
    if (!keepPending) setReceiptOrder({
      ...paidOrder,
      id: record.id,
      sourceOrderId: order.id,
      total: record.amount,
      payments: record.payments,
      date: record.date,
      createdAt: record.time,
      receiptKind: record.kind,
      collectionEntry: true,
      receiptSaleTotal: order.total,
      receiptPaidBefore: previousPaid,
      receiptPaidNow: collected,
      receiptPaidTotal: previousPaid + collected,
      receiptBalance: Math.max(0, order.total - previousPaid - collected),
      items: order.items,
    });
    if (kind === "Seña" || kind === "Abono") setView("senas");
    toast.success(keepPending ? "Pago guardado. El pedido sigue en caja hasta Cobrar completo" : kind === "Seña" || kind === "Abono" ? `${kind} registrada. El saldo sigue pendiente` : "Saldo cobrado. Ticket listo para imprimir");
    return true;
  };
  const confirmRefund = () => {
    if (!refundOrder || refundAmount <= 0 || refundAmount > refundOrder.total)
      return toast.error("Ingresá un importe válido");
    setStore((s) => ({
      ...s,
      orders: s.orders.map((o) =>
        o.id === refundOrder.id
          ? { ...o, status: "devuelto", refund: refundAmount }
          : o,
      ),
    }));
    setRefundOrder(null);
    setRefundAmount(0);
    toast.success("Devolución registrada sin borrar la venta original");
  };
  const redoPayment = () => {
    if (!redoOrder) return;
    setStore((s) => ({
      ...s,
      orders: s.orders.map((o) =>
        o.id === redoOrder.id
          ? {
              ...o,
              status: "pendiente",
              payments: undefined,
              cashier: undefined,
              refund: undefined,
            }
          : o,
      ),
    }));
    setRedoOrder(null);
    setView("pendientes");
    toast.success(
      "Cobro eliminado. La venta está lista para cobrar nuevamente",
    );
  };
  const returnToHistory=()=>{if(!returnHistoryOrder||role!=='asesor')return;try{const id=returnHistoryOrder.id;setStore(state=>{let next={orders:state.orders,workOrders:state.workOrders};for(const selectedId of bulkMoveIds.length?bulkMoveIds:[id])next=moveAdvisorSection(next.orders,next.workOrders,selectedId,user,moveSection);return {...state,...next};});setReturnHistoryOrder(null);setBulkMoveIds([]);setView(moveSection);toast.success(moveSection==='historial'?'Pedido movido a Pedidos':'Pedido movido a Ventas');}catch(error){toast.error(error instanceof Error?error.message:'No se pudo mover el pedido');}};

  const hideAdvisorHistory=()=>{if(!hideHistoryOrder||role!=='asesor')return;try{const id=hideHistoryOrder.sourceOrderId||hideHistoryOrder.id;setStore(state=>({...state,orders:hidePaidHistory(state.orders,id,user),workOrders:state.workOrders.map(order=>order.id===id?{...order,advisorHistoryHiddenFor:[...new Set([...(order.advisorHistoryHiddenFor||[]),user])]}:order)}));setHideHistoryOrder(null);toast.success('Pedido quitado de tu lista. El pago sigue registrado en caja.');}catch(error){toast.error(error instanceof Error?error.message:'No se pudo quitar el pedido');setHideHistoryOrder(null);}};
  const requestDeleteOrder = (entry: Order) => setDeleteOrder(resolveHistoryOrder(entry));
  const removeOrder = () => {
    if (!deleteOrder) return;
    const id = deleteOrder.sourceOrderId || deleteOrder.id;
    setStore(state => { const remaining = removeFromOrderHistories(state.orders, state.workOrders, id); return { ...state, ...remaining, creditPayments: reconcileCreditPayments(state.creditPayments,remaining.orders) }; });
    setDeleteOrder(null);
    toast.success("Pedido eliminado de caja y del historial del asesor");
  };
  const saveCustomer = () => {
    const name = newCustomer.name.trim();
    if (!name) return toast.error("Ingresá el nombre del cliente");
    const item: Customer = {
      id: Date.now(),
      name,
      phone: newCustomer.phone.trim(),
      ruc: newCustomer.ruc.trim() || undefined,
      discount: Number(newCustomer.discount) || 0,
      special: newCustomer.discount
        ? `${newCustomer.discount}% de descuento`
        : "Precio normal",
    };
    setStore((s) => ({ ...s, customers: [...s.customers, item] }));
    setCustomer(name);
    setCustomerPhone(item.phone);
    setCustomerRuc(item.ruc || "");
    setNewCustomer({ name: "", phone: "", ruc: "", discount: 0 });
    setCustomerOpen(false);
    toast.success("Cliente guardado");
  };
  const saveQuickCustomer = () => {
    const name = customer.trim();
    if (!name || name === "Ocasional")
      return toast.error("Escribí el nombre del cliente");
    const existing = store.customers.find(
      (item) =>
        item.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"),
    );
    if (existing) return toast.error("Ese cliente ya está registrado");
    const item: Customer = {
      id: Date.now(),
      name,
      phone: customerPhone.trim(),
      ruc: customerRuc.trim() || undefined,
      discount: 0,
      special: "Precio normal",
    };
    setStore((s) => ({ ...s, customers: [...s.customers, item] }));
    toast.success("Cliente guardado rápidamente");
  };
  const startAdminPayment = () => {
    if (!cashOpen)
      return toast.error("La caja debe estar abierta antes de registrar ventas");
    if (!cart.length) return toast.error("Agregá al menos un producto");
    const existing = editingOrderId
      ? store.orders.find((order) => order.id === editingOrderId)
      : undefined;
    const order: Order = existing
      ? {
          ...existing,
          customer: customer.trim() || "Ocasional",
          phone: customerPhone.trim() || undefined,
          ruc: customerRuc.trim() || undefined,
          items: cart,
          total: cartTotal,
        }
      : {
          id: nextOrderId([...currentStore.current.orders,...currentStore.current.workOrders],currentStore.current.orderSequence),
          customer: customer.trim() || "Ocasional",
          phone: customerPhone.trim() || undefined,
          ruc: customerRuc.trim() || undefined,
          advisor: user,
          createdAt: new Date().toLocaleTimeString("es-PY", { hourCycle:"h23", timeZone:"America/Asuncion",
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: isoToday(),
          items: cart,
          total: cartTotal,
          status: "pendiente",
        };
    setStore((s) => ({
      ...s,
      orders: existing
        ? s.orders.map((item) => (item.id === order.id ? order : item))
        : [order, ...s.orders],
    }));
    setEditingOrderId(null);
    setPaymentOrder(order);
    setPayments([{ method: "Efectivo", amount: 0 }]);
  };
  const removeCustomer = () => {
    if (!deleteCustomer) return;
    setStore((s) => ({
      ...s,
      customers: s.customers.filter((c) => c.id !== deleteCustomer.id),
    }));
    if (customer === deleteCustomer.name) {
      setCustomer("Ocasional");
      setCustomerPhone("");
      setCustomerRuc("");
    }
    setDeleteCustomer(null);
    toast.success("Cliente eliminado");
  };
  const saveEditedCustomer = () => {
    if (!editCustomer?.name.trim())
      return toast.error("Ingresá el nombre del cliente");
    const updated = {
      ...editCustomer,
      name: editCustomer.name.trim(),
      special: editCustomer.discount
        ? `${editCustomer.discount}% de descuento`
        : "Precio normal",
    };
    setStore((s) => ({
      ...s,
      customers: s.customers.map((c) => (c.id === updated.id ? updated : c)),
    }));
    if (customer === editCustomer.name) {
      setCustomer(updated.name);
      setCustomerPhone(updated.phone);
      setCustomerRuc(updated.ruc || "");
    }
    setEditCustomer(null);
    toast.success("Cliente actualizado");
  };
  const removeProduct = () => {
    if (!deleteProduct) return;
    setStore((s) => ({
      ...s,
      products: s.products.filter((p) => p.id !== deleteProduct.id),
      stockProducts:(s.stockProducts||[]).map(stock=>stock.id===deleteProduct.stockId?{...stock,archived:true}:stock),
    }));
    setCart((c) => c.filter((p) => p.id !== deleteProduct.id));
    toast.success("Producto eliminado");
    setDeleteProduct(null);
  };
  const saveProduct = () => {
    if (!editProduct?.name.trim() || editProduct.price < 0)
      return toast.error("Revisá el nombre y el precio");
    if((editProduct.purchasePrice??0)<0||!Number.isFinite(editProduct.purchasePrice??0)||!Number.isFinite(editProduct.price)||editProduct.stockQuantity!==undefined&&(!Number.isFinite(editProduct.stockQuantity)||editProduct.stockQuantity<0&&!store.stockProducts?.some(stock=>stock.id===editProduct.stockId&&stock.importedStock))||editProduct.vat!==null&&editProduct.vat!==undefined&&(!Number.isFinite(editProduct.vat)||editProduct.vat<0||editProduct.vat>100))return toast.error('Revisá stock, precios e IVA');
    try { setStore(s=>{const updated={...editProduct,code:resolveProductCode(s.products,editProduct.code,editProduct.id)};return {...s,products:s.products.map(product=>product.id===updated.id?updated:product),stockProducts:(s.stockProducts||[]).map(stock=>stock.id===updated.stockId?{...stock,name:updated.name,code:updated.code,category:updated.category,price:updated.price,purchasePrice:updated.purchasePrice,vat:updated.vat,baseQuantity:(updated.stockQuantity??(stock.baseQuantity-usedStock(s.orders,stock.id)))+usedStock(s.orders,stock.id)}:stock)};}); } catch(error){toast.error(error instanceof Error?error.message:'No se pudo guardar el producto');return;}
    setEditProduct(null);
    toast.success("Producto actualizado");
  };
  const importProducts = (items: Product[]) => {
    if (!items.length)
      return toast.error("El archivo no contiene productos válidos");
    setStore((s) => ({ ...s, products: [...s.products, ...items] }));
    toast.success(`${items.length} productos importados`);
  };
  const addCatalogProduct = (product: Product) => {
    if(!product.name.trim()||!Number.isFinite(product.price)||product.price<0||!Number.isFinite(product.purchasePrice??0)||(product.purchasePrice??0)<0||product.stockQuantity!==undefined&&(!Number.isFinite(product.stockQuantity)||product.stockQuantity<0)||product.vat!==null&&product.vat!==undefined&&(!Number.isFinite(product.vat)||product.vat<0||product.vat>100))return toast.error('Revisá nombre, stock, precios e IVA');
    try { const stockId=product.stockQuantity===undefined?undefined:crypto.randomUUID();setStore(state=>{const saved={...product,id:Math.max(Date.now(),...state.products.map(p=>p.id+1)),code:resolveProductCode(state.products,product.code),stockId};return {...state,products:[...state.products,saved].sort((a,b)=>a.name.localeCompare(b.name,'es')),stockProducts:stockId?[...(state.stockProducts||[]),{id:stockId,catalogProductId:saved.id,name:saved.name,category:saved.category,code:saved.code,price:saved.price,purchasePrice:saved.purchasePrice,vat:saved.vat,baseQuantity:saved.stockQuantity!}]:state.stockProducts};});toast.success('Producto agregado al catálogo');return true;}catch(error){toast.error(error instanceof Error?error.message:'No se pudo guardar el producto');return false;}

  };
  const updatePendingOrder = (order: Order) => {
    const total = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const updated = { ...order, total };
    setPaymentOrder(updated);
    setStore((s) => ({
      ...s,
      orders: s.orders.map((o) => (o.id === updated.id ? updated : o)),
    }));
  };
  const addCashMovement = (
    movement: Omit<CashMovement, "id" | "date" | "user">,
  ) => {
    if (movement.amount <= 0 && movement.type !== "reapertura")
      return toast.error("Ingresá un monto válido");
    setStore((s) => ({
      ...s,
      cashMovements: [
        {
          ...movement,
          id: Date.now(),
          date: isoToday(),
          user,
          createdAt: new Date().toLocaleTimeString("es-PY", { hourCycle:"h23", timeZone:"America/Asuncion",
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        ...s.cashMovements,
      ],
    }));
    toast.success(
      movement.type === "apertura"
        ? "Apertura de caja registrada"
        : movement.type === "reapertura"
          ? "Caja reabierta"
          : movement.type === "cierre"
            ? "Caja cerrada"
            : "Salida de caja registrada",
    );
  };
  const deleteCashMovement = (id: number) => {
    setStore((s) => ({
      ...s,
      cashMovements: s.cashMovements.filter((movement) => movement.id !== id),
    }));
    toast.success("Movimiento eliminado");
  };
  const updateCashMovement = (updated: CashMovement) => {
    setStore((s) => ({
      ...s,
      cashMovements: s.cashMovements.map((movement) =>
        movement.id === updated.id ? updated : movement,
      ),
    }));
    toast.success("Movimiento actualizado");
  };
  const addAdvisor = (name: string) => {
    const clean = name.trim();
    if(isRemovedAdvisor(clean))return toast.error("Ese asesor fue retirado. Sus registros corresponden a Admi.");
    if (!clean) return toast.error("Ingresá el nombre del asesor");
    if (
      store.advisors.some(
        (a) => a.toLocaleLowerCase("es") === clean.toLocaleLowerCase("es"),
      )
    )
      return toast.error("Ese asesor ya existe");
    setStore((s) => ({
      ...s,
      advisors: [...s.advisors, clean].sort((a, b) => a.localeCompare(b, "es")),
    }));
    toast.success("Asesor agregado");
  };
  const deleteAdvisor = (name: string) => {
    if (store.advisors.length === 1)
      return toast.error("Debe quedar al menos un asesor");
    setStore((s) => ({ ...s, advisors: s.advisors.filter((a) => a !== name) }));
    if (role === "asesor" && user === name) {
      const next = store.advisors.find((a) => a !== name) || "Aide";
      setUser(next);
    }
    toast.success("Asesor eliminado");
  };

  const saveStockProduct=(draft:{id?:string;name:string;price:number;quantity:number;mode?:'add'|'replace';code?:string})=>{if(role!=='admin')return false;try{setStore(state=>{const products=state.stockProducts||[],previous=products.find(product=>product.id===draft.id);if((!previous||previous.name.toLowerCase()!==draft.name.toLowerCase())&&products.some(product=>!product.archived&&product.id!==draft.id&&product.name.toLowerCase()===draft.name.toLowerCase()))throw new Error('Ya existe un producto con ese nombre en el inventario');const id=previous?.id||crypto.randomUUID(),catalogProductId=previous?.catalogProductId||Math.max(Date.now(),...state.products.map(product=>product.id+1));const code=resolveProductCode(state.products,draft.code,catalogProductId);const stock:StockProduct={...previous,id,catalogProductId,code,name:draft.name,price:draft.price,baseQuantity:previous?stockQuantityBase(previous,state.orders,draft.quantity,draft.mode):draft.quantity};const catalog:Product={...state.products.find(product=>product.id===catalogProductId),id:catalogProductId,code,name:draft.name,price:draft.price,category:previous?.category||'Inventario',stockId:id};return {...state,stockProducts:previous?products.map(product=>product.id===id?stock:product):[stock,...products],products:[catalog,...state.products.filter(product=>product.id!==catalogProductId)]};});toast.success(draft.mode==='add'?'Unidades agregadas al stock':'Producto guardado en inventario');return true;}catch(error){toast.error(error instanceof Error?error.message:'No se pudo guardar el producto');return false;}};
  const deleteStockProduct=(product:StockProduct)=>{if(role!=='admin')return;setStore(state=>({...state,stockProducts:(state.stockProducts||[]).map(item=>item.id===product.id?{...item,archived:true}:item),products:state.products.filter(item=>item.stockId!==product.id)}));toast.success('Producto eliminado del inventario');};
  const downloadAdvisorOrders=()=>{const rows=advisorHistory.filter(order=>advisorSection(order,store.workOrders)==='historial').map(entry=>resolveHistoryOrder(entry));if(!rows.length){toast.info('No hay pedidos para descargar');return;}const rowsById=[...new Map(rows.map(order=>[order.id,order])).values()];const data=rowsById.map(order=>{const records=order.paymentRecords||[],methods=records.length?records.flatMap(record=>record.payments||[]):order.status==='cobrado'?order.payments||[]:[];const by=(method:string)=>methods.filter(payment=>payment.method===method).reduce((sum,payment)=>sum+payment.amount,0);const paid=methods.reduce((sum,payment)=>sum+payment.amount,0);return {_id:order.importBackupSourceIds?.[0]||order.orderUid||order.id,_copyPrintId:order.id,_copyPrintTime:order.createdAt,_copyPrintPayments:records,orderNumber:Number(order.id.replace(/\D/g,'')),cliente:order.customer,telefono:order.phone||'',asesor:order.advisor,fechaRecepcion:order.date,fechaEntrega:order.deliveryDate||'',horaEntrega:order.deliveryTime||'',detallesAdicionales:order.notes||'',requiereFactura:order.invoice==='Con factura'?'si':'no',facturaNombre:order.invoiceName||'',facturaRuc:order.invoiceRuc||'',facturaDireccion:order.invoiceAddress||'',productos:order.items.map(item=>({cantidad:item.quantity,descripcion:item.name,precio:item.price,total:item.quantity*item.price})),costoTotal:order.total,saldo:order.total-paid,entregaEfectivo:by('Efectivo'),entregaTransferencia:by('Transferencia'),entregaQR:by('QR'),entregaTarjeta:by('POS/Tarjeta'),estado:order.productionStatus==='En proceso'?'PREPARANDO':order.productionStatus==='Listo'?'LISTO':order.productionStatus==='Entregado'?'ENTREGADO':'PENDIENTE'};});const url=URL.createObjectURL(new Blob([JSON.stringify({orders:data},null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`pedidos-${user.replace(/[^a-z0-9]/gi,'-')}-${businessToday()}.json`;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const importOrderBackup=(rows:BackupOrder[],deduplicate:boolean)=>{if(role!=='asesor')return false;try{const latest=currentStore.current,result=prepareOrderBackup(latest.orders,latest.workOrders,rows.map(row=>({...row,advisor:user})),latest.orderSequence,deduplicate);setStore({...latest,orders:result.orders.map(order=>result.added.some(added=>added.id===order.id)?{...order,advisorSection:"historial" as const}:order),orderSequence:result.orderSequence});toast.success(`${result.added.length} pedidos importados · ${result.skipped} registros ya cargados omitidos`);if(result.duplicatesOmitted||result.renumbered)toast.info(`${result.duplicatesOmitted} copias unificadas · ${result.renumbered} números repetidos reasignados`,{duration:10000});return true;}catch(error){toast.error(error instanceof Error?error.message:'No se pudo importar el respaldo');return false;}};
  const importCompleteCredits=(data:CompleteCreditData)=>{try{const latest=currentStore.current;const result=prepareCompleteCreditImport(latest.creditAccounts,latest.orders,latest.creditPayments,data,businessToday(),()=>crypto.randomUUID(),latest.orderSequence);setStore({...latest,creditAccounts:result.accounts,orders:result.orders,creditPayments:result.payments});toast.success(`${result.added} productos y ${result.paymentCount} pagos importados · ${result.skipped} filas duplicadas omitidas`);if(result.warnings.length)toast.warning('Diferencias en el archivo: '+result.warnings.join(' '),{duration:15000});return true;}catch(error){toast.error(error instanceof Error?error.message:'No se pudo importar');return false;}};
  const importCredits = (rows:CreditImportRow[]) => {
    try{const latest=currentStore.current;const result=prepareCreditImport(latest.creditAccounts,latest.orders,rows,businessToday(),new Date().toLocaleTimeString('es-PY',{hourCycle:'h23',timeZone:'America/Asuncion',hour:'2-digit',minute:'2-digit',second:'2-digit'}),()=>crypto.randomUUID(),latest.orderSequence);
    const next={...latest,creditAccounts:result.accounts,orders:result.orders};currentStore.current=next;setStore(next);toast.success(`${result.added} registros importados${result.skipped?` · ${result.skipped} filas ya importadas omitidas`:''}`);return true;}catch(error){toast.error(error instanceof Error?error.message:'No se pudo importar el CSV');return false;}
  };
  const deleteCreditAccount=(account:CreditAccount)=>{if(role==='asesor'){toast.error('No tenés permiso para eliminar cuentas');return;}setStore(state=>({...state,creditAccounts:state.creditAccounts.filter(item=>item.id!==account.id),orders:state.orders.filter(order=>order.creditAccountId!==account.id),creditPayments:state.creditPayments.filter(payment=>payment.accountId!==account.id)}));setCreditFocus(undefined);setCreditOrderFocus(undefined);toast.success('Cuenta eliminada');};
  const saveCreditAccount = (account: CreditAccount) => {
    setStore(state => ({...state,creditAccounts:state.creditAccounts.some(item=>item.id===account.id)?state.creditAccounts.map(item=>item.id===account.id?account:item):[account,...state.creditAccounts],orders:state.orders.map(order=>order.creditAccountId===account.id?{...order,customer:account.name,phone:account.phone,ruc:account.ruc}:order)}));
  };
  const saveCreditPurchase = (account: CreditAccount, draft: {id?:string;date:string;advisor:string;items:CartItem[];withdrawnBy:string;invoiceReference:string;dueDate:string}) => {
    const latest=currentStore.current, previous=latest.orders.find(order=>order.id===draft.id), total=itemTotal(draft.items);
    if(previous&&total<paidAmount(previous)){toast.error("El total no puede ser menor a lo ya abonado");return false;}

    const order:Order={...previous,id:previous?.id||nextOrderId([...latest.orders,...latest.workOrders],latest.orderSequence),creditAccountId:account.id,creditCode:previous?.creditCode||nextCreditCode(latest.orders),customer:account.name,phone:account.phone,ruc:account.ruc,advisor:previous?.advisor||draft.advisor,date:draft.date,createdAt:previous?.createdAt||new Date().toLocaleTimeString('es-PY',{hourCycle:'h23',timeZone:'America/Asuncion',hour:'2-digit',minute:'2-digit',second:'2-digit'}),items:draft.items,total,status:previous&&paidAmount(previous)>=total?'cobrado':'pendiente',paymentRecords:previous?.paymentRecords||[],payments:previous?.payments||[],withdrawnBy:draft.withdrawnBy,invoiceReference:draft.invoiceReference,dueDate:draft.dueDate,notes:[draft.invoiceReference?'Factura: '+draft.invoiceReference:'',draft.withdrawnBy?'Retira: '+draft.withdrawnBy:'',draft.dueDate?'Vencimiento: '+draft.dueDate:''].filter(Boolean).join(' · '),productionStatus:previous?.productionStatus||'Pendiente'};
    setStore(state=>({...state,orders:previous?state.orders.map(item=>item.id===order.id?order:item):[order,...state.orders]}));toast.success('Compra a crédito guardada');return true;
  };
  const payCredit = (draft:Omit<CreditPayment,'amount'|'allocations'>,previous?:CreditPayment) => {
    if(!previous&&!cashOpen){toast.error('Se necesita una caja abierta para registrar pagos');return false;}
    try{const latest=currentStore.current;const result=applyCreditPayment(latest.orders,{...draft,...creditPaymentMoment(draft,!!previous),cashier:user},previous?latest.creditPayments.find(payment=>payment.id===previous.id):undefined);setStore(state=>({...state,orders:result.orders,creditPayments:[result.payment,...state.creditPayments.filter(payment=>payment.id!==result.payment.id)]}));toast.success(result.change?`Pago registrado. Vuelto: ${money(result.change)}`:'Pago registrado en caja');return true;}catch(error){toast.error(error instanceof Error?error.message:'No se pudo registrar el pago');return false;}
  };
  const deleteCreditPayment = (payment:CreditPayment) => {
    setStore(state=>({...state,orders:removeCreditPayment(state.orders,payment),creditPayments:state.creditPayments.filter(item=>item.id!==payment.id)}));toast.success('Pago eliminado y saldo actualizado');
  };
  const importQuotes=(rows:Quote[])=>{try{const latest=currentStore.current;const result=mergeQuoteImport(latest.quotes,rows,()=>crypto.randomUUID());const next={...latest,quotes:result.quotes};currentStore.current=next;setStore(next);toast.success(`${result.added} presupuestos importados · ${result.skipped} duplicados omitidos`);return true;}catch(error){toast.error(error instanceof Error?error.message:'No se pudo importar');return false;}};
  const saveQuote = (quote:Quote) => setStore(state=>{const previous=state.quotes.find(item=>item.id===quote.id);return {...state,quotes:previous?state.quotes.map(item=>item.id===quote.id?{...quote,advisor:previous.advisor,orderId:previous.orderId}:item):[quote,...state.quotes]};});
  const creditShareLink = async (account:CreditAccount) => {
    if(!await synchronizer.current?.flush())throw new Error('Esperá a que la cuenta termine de guardarse en línea.');
    const response=await fetch('/api/credit-share',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({accountId:account.id}),
    });
    const result=await response.json() as {path?:string;error?:string};
    if(!response.ok||!result.path)throw new Error(result.error||'No se pudo generar el enlace.');
    return new URL(result.path,window.location.origin).href;
  };
  const quoteShareLink = async (quote:Quote) => {
    if(!await synchronizer.current?.flush())throw new Error("El presupuesto sigue pendiente de guardarse en línea");
    return `${window.location.origin}/presupuesto/${quote.id}`;
  };
  const convertQuote = (quote:Quote) => {
    const latest=currentStore.current, saved=latest.quotes.find(item=>item.id===quote.id);if(!saved||saved.orderId||saved.status!=='Aprobado'){toast.info('El presupuesto debe estar aprobado y sin convertir');return;}
    const order:Order={id:nextOrderId([...currentStore.current.orders,...currentStore.current.workOrders],currentStore.current.orderSequence),quoteId:saved.id,customer:saved.customer,phone:saved.phone,ruc:saved.ruc,advisor:saved.advisor,date:businessToday(),createdAt:new Date().toLocaleTimeString('es-PY',{hourCycle:'h23',timeZone:'America/Asuncion',hour:'2-digit',minute:'2-digit'}),items:saved.items.map(item=>({...item})),total:saved.total,status:'pendiente',payments:[],paymentRecords:[],productionStatus:'Pendiente',notes:[saved.deliveryTerms,saved.notes].filter(Boolean).join('\n')};
    const next={...latest,orders:[order,...latest.orders],quotes:latest.quotes.map(item=>item.id===saved.id?{...item,orderId:order.id}:item)};currentStore.current=next;setStore(next);toast.success('Presupuesto convertido en pedido, pendiente de cobro');setView(role==='asesor'?'historial':'pendientes');
  };
  if(syncStatus==='loading')return <main className="store-loading" aria-busy="true"><RefreshCw size={24}/><p>Cargando pedidos y caja…</p><small>Esperá un momento antes de registrar.</small></main>;
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Toaster richColors position="top-center" />
      <ChristmasTop>
      <header className={`app-header redesigned-header sticky top-0 z-40 flex h-[68px] items-center border-b px-4 backdrop-blur md:px-7 ${role==='asesor'?'with-attendance':''}`}>
        <div className="flex min-w-0 items-center">
          <img
            className="system-logo"
            src="/copy-print-logo.svg"
            alt="Copy Print"
          />
        </div>
        <nav className="ml-auto flex items-center gap-2">
          {role==='asesor'&&<ProductionNotices key={user} jobs={store.productionJobs||[]} user={user} onRead={readProductionNotice}/>}
          <Select value={`${role}:${user}`} onValueChange={switchAccount}>
            <SelectTrigger className="user-icon-button" title={`Usuario: ${user}`} aria-label={`Cambiar usuario. Usuario actual: ${user}`}>
              <UserRound className="account-user-symbol" size={20} />
              <span className="sr-only"><SelectValue /></span>
            </SelectTrigger>
            <SelectContent
              className="compact-user-menu"
              position="popper"
              side="bottom"
              sideOffset={7}
              align="end"
              avoidCollisions
            >
              <SelectItem value="admin:Admi">Admi</SelectItem>
              <SelectItem value="gerencia:Gerencia">Gerencia</SelectItem>
              {store.advisors.map((name) => (
                <SelectItem key={name} value={`asesor:${name}`}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </nav>
      </header>
      <div className="utility-row redesigned-utility"><div className="utility-status-group"><div className={`store-sync-status ${syncStatus}`} role="status" aria-live="polite">{syncStatus==='saved'?<Check size={15}/>:<RefreshCw size={15}/>}<span>{syncStatus==='saved'?'Guardado':syncStatus==='saving'?'Guardando…':syncStatus==='offline'?'Guardado en este equipo · pendiente de conexión':'Guardado en este equipo · pendiente en línea'}</span>{syncStatus==='error'&&<button onClick={()=>void synchronizer.current?.flush()}>Reintentar</button>}</div><HeaderProductSearch products={store.products} onConsult={query=>{setConsultQuery(query);setView("consulta-productos");}}/></div>{role==='asesor'&&<AttendanceToolbar marks={store.attendanceMarks||[]} user={user} onMark={markAttendance} onUndo={undoAttendance}/>}{role!=="gerencia"&&<QueueBar />}</div></ChristmasTop>{syncStatus==='error'&&<div className="store-sync-error" role="alert">{syncMessage||'No se pudo confirmar el guardado en línea.'} Tu registro se conserva en este equipo; no lo vuelvas a cargar.</div>}
      <div className="app-shell">
        <aside className="side-nav">
          <p className="side-label">Principal</p>
          {role === "asesor" && (
            <>
              <Nav
                active={view === "venta"}
                onClick={() => setView("venta")}
                icon={<ShoppingCart />}
                label="Nuevo pedido"
              />
              <Nav
                active={view === "historial"}
                onClick={() => setView("historial")}
                icon={<ReceiptText />}
                label="Pedidos"
              />
              <Nav active={view === "ventas"} onClick={() => setView("ventas")} icon={<ShoppingCart />} label="Ventas"/>
            </>
          )}
          {(role === "cajera" || role === "admin") && (
            <>
              <Nav
                active={view === "venta"}
                onClick={() => setView("venta")}
                icon={<Plus />}
                label="Nuevo pedido"
              />
              <Nav
                active={view === "pendientes" || view === "senas"}
                onClick={() => setView("pendientes")}
                icon={<ReceiptText />}
                label="Cobrar"
                count={pending.length}
              />
              <Nav
                active={view === "resumen"}
                onClick={() => setView("resumen")}
                icon={<LayoutDashboard />}
                label="Caja"
              />
              <Nav
                active={view === "ventas"}
                onClick={() => setView("ventas")}
                icon={<WalletCards />}
                label="Historial"
              />
            </>
          )}
          {role==="asesor"&&<Nav active={view==="produccion"} onClick={()=>setView("produccion")} icon={<PackageSearch/>} label="Producción"/>}
          {role==="gerencia"&&<Nav active={view==="gerencia"} onClick={()=>setView("gerencia")} icon={<BarChart3/>} label="Gerencia"/>}
          {role!=="gerencia"&&<Popover open={managementMenuOpen} onOpenChange={setManagementMenuOpen}><PopoverTrigger asChild><button type="button" className="nav-button management-menu-trigger">Gestionar ▾</button></PopoverTrigger><PopoverContent align="end" side="bottom" className="management-menu-list" onClick={event=>{if((event.target as HTMLElement).closest('button,a'))setManagementMenuOpen(false);}}>

            <Nav active={view==="inventario"} onClick={()=>setView("inventario")} icon={<PackageSearch/>} label="Inventario"/>
            <Nav active={view==="creditos"} onClick={()=>{setCreditFocus(undefined);setCreditOrderFocus(undefined);setView("creditos");}} icon={<CreditCard/>} label="Créditos"/>
            <Nav active={view==="presupuestos"} onClick={()=>setView("presupuestos")} icon={<ReceiptText/>} label="Presupuestos"/>
            {role==="admin"&&<><Nav active={view==="produccion"} onClick={()=>setView("produccion")} icon={<PackageSearch/>} label="Producción"/><Nav active={view==="rendimiento"} onClick={()=>setView("rendimiento")} icon={<BarChart3/>} label="Rendimiento"/></>}

          <Nav
            active={view === "clientes"}
            onClick={() => setView("clientes")}
            icon={<Users />}
            label="Clientes"
          />
          <Nav
            active={view === "productos"}
            onClick={() => setView("productos")}
            icon={<PackageSearch />}
            label="Productos"
          />
          {role === "admin" && (
            <Nav
              active={view === "ajustes"}
              onClick={() => setView("ajustes")}
              icon={<Settings />}
              label="Ajustes"
            />
          )}
          <a className="nav-button management-tool" href="https://copyprint-wrap-studio.allacces.chatgpt.site" target="_blank" rel="noreferrer"><PackageSearch size={18}/><span>Wrap Studio</span></a>
          <a className="nav-button management-tool" href="https://numerador-impresion.allacces.chatgpt.site" target="_blank" rel="noreferrer"><Pencil size={18}/><span>Editor</span></a>
          <a className="nav-button management-tool" href="https://copyprint-wrap-studio.allacces.chatgpt.site/admin/calculadora" target="_blank" rel="noreferrer"><Calculator size={18}/><span>Calculadora</span></a>
          </PopoverContent></Popover>}
          {role !== "gerencia" && <Nav active={view === "notas"} onClick={() => setView("notas")} icon={<StickyNote />} label="Notas" />}
          <div className="user-card">
            <div className="user-avatar">{user[0]}</div>
            <div>
              <strong>{user}</strong>
              <span>{role}</span>
            </div>
            <LogOut size={17} />
          </div>
        </aside>
        <section className="workspace">
          {role==="gerencia"&&view==="gerencia"&&<ManagementView orders={store.orders} workOrders={store.workOrders} movements={store.cashMovements} advisors={store.advisors} jobs={store.productionJobs||[]} marks={store.attendanceMarks||[]} accounts={store.creditAccounts} creditPayments={store.creditPayments}/>}

          {view === "notas" && role !== "gerencia" && <WhatsAppNotes
            key={`${role}:${user}`}
            owner={`${role}:${user}`}
            user={user}
            converted={convertedNotes}
            makeOrder={makeOrderFromNote}
          />}

          {view === "venta" && (
            <NewSaleView
              key={editingWorkOrderId || editingOrderId || "new"}
              initialOrder={editingOrderId ? store.orders.find(order => order.id === editingOrderId) : editingWorkOrderId ? store.workOrders.find(order => order.id === editingWorkOrderId) : undefined}
              onlySend={!!editingOrderId}
              cashOpen={cashOpen}
              canPrint={role === "admin"}
              canRegisterPayment={role === "admin" || role === "cajera" || role === "asesor"}
              directCheckout={role === "admin"}
              saveCustomer={saveQuickCustomer}
              advisor={user}
              advisors={store.advisors}
              editing={!!editingOrderId || !!editingWorkOrderId}
              products={store.products}
              category={category}
              setCategory={setCategory}
              cart={cart}
              total={cartTotal}
              customer={customer}
              setCustomer={chooseCustomer}
              selectCustomer={selectCustomer}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              customerRuc={customerRuc}
              setCustomerRuc={setCustomerRuc}
              customers={store.customers}
              add={addProduct}
              updateQty={updateQty}
              updatePrice={updatePrice}
              updateName={updateName}
              chooseProduct={chooseProduct}
              remove={(id: number) =>
                setCart((c) => c.filter((i) => i.id !== id))
              }
              save={saveSale}
              clear={clearSale}
            />
          )}{" "}
          {(view === "pendientes" || view === "senas") && (role === "admin" || role === "cajera") && (
            <DepositsView
              orders={pending}
              searchOrders={store.orders}
              confirmPickup={confirmPickup}
              cashOpen={cashOpen}
              editOrder={editPendingOrder}
              onTicket={openHistoryTicket}
              onDownload={downloadHistoryTicket}
              onDelete={role === "admin" ? requestDeleteOrder : undefined}
              confirmPayment={confirmInlinePayment}
              onPrintDeposit={role === "admin" ? (order, record) => setReceiptOrder(depositTicket(order, record)) : undefined}
            />
          )}{" "}
          {view === "resumen" && (
            <CashReportControl
              orders={reportOrders}
              movements={store.cashMovements}
              onMovement={addCashMovement}
              onDeleteMovement={deleteCashMovement}
              onUpdateMovement={updateCashMovement}
              onEditOrder={editHistoryOrder}
              onViewOrder={openHistoryTicket}
              onDownloadOrder={downloadHistoryTicket}
              onDeleteOrder={requestDeleteOrder}
              onPrint={() => window.print()}
            />
          )}{" "}
          {view === "ventas" && role !== "asesor" && (
            <SalesHistory
              title="Historial y reporte de ventas"
              searchAllDates={role === "admin"}
              showSorting={role === "admin"}
              orders={reportOrders}
              onTicket={openHistoryTicket}
              onEdit={editHistoryOrder}
              onDownload={downloadHistoryTicket}
              onProductionChange={updateProductionStatus}
              canPrintReport={role === "admin"}
              onRefund={(o) => {
                setRefundOrder(o);
                setRefundAmount(o.total);
              }}
              onRedo={role === "admin" ? order => { const source=resolveHistoryOrder(order); if(source.creditAccountId){setCreditFocus(source.creditAccountId);setCreditOrderFocus(undefined);setView("creditos");toast.info("Editá o eliminá el pago desde Créditos");}else setRedoOrder(order); } : undefined}
              onDelete={role === "admin" ? requestDeleteOrder : undefined}
            />
          )}{" "}
          {role==="asesor"&&view==="historial"&&<div className="advisor-data-tools"><OrderBackupImport onImport={importOrderBackup}/><Button size="sm" variant="outline" onClick={downloadAdvisorOrders}><Download size={15}/>Descargar pedidos</Button></div>}
          {(view === "historial" || role === "asesor" && view === "ventas") && (
            <SalesHistory
              key={view}
              title={`${view === "ventas" ? "Ventas" : role === "asesor" ? "Pedidos" : "Historial"} de ${user}`}
              orders={role==="asesor"?advisorHistory.filter(order=>advisorSection(order,store.workOrders)===(view === "ventas"?"ventas":"historial")):advisorHistory}
              onReturnSaved={role==="asesor"?entry=>{setBulkMoveIds([]);setMoveSection(view==="ventas"?"historial":"ventas");setReturnHistoryOrder(resolveHistoryOrder(entry as Order));}:undefined}
              onMoveMany={role==="asesor"?ids=>{const first=advisorHistory.find(order=>order.id===ids[0]);if(!first)return;setBulkMoveIds(ids);setMoveSection(view==="ventas"?"historial":"ventas");setReturnHistoryOrder(resolveHistoryOrder(first));}:undefined}
              moveLabel={view==="ventas"?"Mover a Pedidos":"Mover a Ventas"}
              onHidePaid={role==="asesor"?order=>setHideHistoryOrder(resolveHistoryOrder(order as Order)):undefined}
              advisorFilter={user}
              personalAdvisorOnly
              lookupOrders={view === "historial" && role === "asesor" ? otherAdvisorOrders : undefined}
              searchAndDatesOnly={role === "asesor"}
              disableDateFilter={role === "asesor" && view === "historial"}
              orderSummary
              onEdit={editHistoryOrder}
              onTicket={o => setConsultedOrderId(o.sourceOrderId || o.id)}
              onNotify={notifyCashier}
              onDownload={downloadHistoryTicket}
              onProductionChange={updateProductionStatus}
              showAllDates
              onEditSaved={(o) => editWorkOrder(store.workOrders.find(item => item.id === o.id)!)}
              onSendSaved={(o) => sendWorkOrder(store.workOrders.find(item => item.id === o.id)!)}
              canPrintReport={false}
            />
          )}{" "}
          {view==="produccion"&&(role==="asesor"||role==="admin")&&<ProductionView jobs={store.productionJobs||[]} user={user} admin={canManageProduction} onSave={saveProduction} onDelete={deleteProduction} onStatus={setProductionStatus} onTransfer={transferProductionResponsible}/>}
          {view === "creditos" && <CreditsView accounts={store.creditAccounts} orders={store.orders} payments={store.creditPayments} products={store.products} advisors={store.advisors} user={user} admin={role!=="asesor"} cashOpen={cashOpen} focusAccount={creditFocus} focusOrder={creditOrderFocus} onShareLink={creditShareLink} onImport={importCredits} onImportComplete={importCompleteCredits} onAccount={saveCreditAccount} onDeleteAccount={deleteCreditAccount} onPurchase={saveCreditPurchase} onPay={payCredit} onDeleteOrder={order=>requestDeleteOrder(order as Order)} onDeletePayment={deleteCreditPayment}/>}
          {view === "presupuestos" && <QuotesView quotes={store.quotes} products={store.products} advisors={store.advisors} user={user} admin={role!=="asesor"} onImport={importQuotes} onSave={saveQuote} onShareLink={quoteShareLink} onDelete={id=>setStore(state=>({...state,quotes:state.quotes.filter(quote=>quote.id!==id)}))} onConvert={convertQuote}/>}
          {view === "rendimiento" && role === "admin" && <AdvisorPerformanceView orders={store.orders} advisors={store.advisors} attendanceMarks={store.attendanceMarks||[]}/>}
          {view === "clientes" && (
            <CustomersView
              customers={store.customers}
              onNew={() => setCustomerOpen(true)}
              onEdit={setEditCustomer}
              onDelete={setDeleteCustomer}
            />
          )}{" "}
          {view==="consulta-productos"&&<ProductConsult key={consultQuery} initialQuery={consultQuery} products={store.products} stocks={store.stockProducts||[]} orders={store.orders}/>}
          {view==="inventario"&&<InventoryView products={store.stockProducts||[]} orders={store.orders} admin={role==="admin"} onSave={saveStockProduct} onDelete={deleteStockProduct}/>}
          {view === "productos" && (
            <CatalogView
              BaseView={ProductCatalog}
              stocks={store.stockProducts||[]} orders={store.orders}
              products={store.products}
              onAdd={addCatalogProduct}
              onDelete={setDeleteProduct}
              onEdit={setEditProduct}
              onImport={importProducts}
            />
          )}{" "}
          {view === "ajustes" && (
            <SettingsView
              advisors={store.advisors}
              onAdd={addAdvisor}
              onDelete={deleteAdvisor}
            />
          )}
        </section>
      </div>
      <PaymentDialog
        open={!!paymentOrder}
        order={paymentOrder}
        payments={payments}
        setPayments={setPayments}
        paid={paymentTotal}
        close={() => setPaymentOrder(null)}
        confirm={confirmPayment}
      />
      <ReceiptDialog order={role === "admin" ? receiptOrder : null} close={() => setReceiptOrder(null)} />
      <SalePreviewDialog
        confirmLabel={role === "admin" ? "Cobrar ahora" : "Enviar a cobrar"}
        open={salePreviewOpen}
        customer={customer}
        phone={customerPhone}
        ruc={customerRuc}
        items={cart}
        total={cartTotal}
        close={() => setSalePreviewOpen(false)}
        confirm={() => {
          setSalePreviewOpen(false);
          if (role === "admin") startAdminPayment();
          else sendOrder();
        }}
      />
      <Dialog
        open={!!refundOrder}
        onOpenChange={(o) => !o && setRefundOrder(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar devolución</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="soft-panel">
              <p className="text-sm text-slate-500">Venta {refundOrder?.id}</p>
              <strong className="text-xl">
                {money(refundOrder?.total || 0)}
              </strong>
            </div>
            <label className="field-label">
              Importe a devolver
              <Input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
              />
            </label>
            <label className="field-label">
              Motivo
              <Input placeholder="Ej.: cobro duplicado" />
            </label>
            <label className="field-label">
              Medio de devolución
              <Select defaultValue="Efectivo">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="QR">QR</SelectItem>
                  <SelectItem value="POS/Tarjeta">POS / Tarjeta</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <Button
              className="w-full bg-rose-600 hover:bg-rose-700"
              onClick={confirmRefund}
            >
              <RotateCcw />
              Confirmar devolución
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={customerOpen} onOpenChange={setCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo cliente frecuente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Input
              placeholder="Nombre o empresa"
              value={newCustomer.name}
              onChange={(e) =>
                setNewCustomer((v) => ({ ...v, name: e.target.value }))
              }
            />
            <Input
              placeholder="Teléfono"
              value={newCustomer.phone}
              onChange={(e) =>
                setNewCustomer((v) => ({ ...v, phone: e.target.value }))
              }
            />
            <Input
              placeholder="CI o RUC"
              value={newCustomer.ruc}
              onChange={(e) =>
                setNewCustomer((v) => ({ ...v, ruc: e.target.value }))
              }
            />
            <Input
              placeholder="Descuento general (%)"
              type="number"
              value={newCustomer.discount}
              onChange={(e) =>
                setNewCustomer((v) => ({
                  ...v,
                  discount: Number(e.target.value),
                }))
              }
            />
            <Button onClick={saveCustomer}>Guardar cliente</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editCustomer}
        onOpenChange={(open) => !open && setEditCustomer(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente frecuente</DialogTitle>
          </DialogHeader>
          {editCustomer && (
            <div className="grid gap-4">
              <label className="field-label">
                Nombre o empresa
                <Input
                  value={editCustomer.name}
                  onChange={(e) =>
                    setEditCustomer({ ...editCustomer, name: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Celular
                <Input
                  value={editCustomer.phone}
                  onChange={(e) =>
                    setEditCustomer({ ...editCustomer, phone: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                CI o RUC
                <Input
                  value={editCustomer.ruc || ""}
                  onChange={(e) =>
                    setEditCustomer({ ...editCustomer, ruc: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Descuento general (%)
                <Input
                  type="number"
                  value={editCustomer.discount}
                  onChange={(e) =>
                    setEditCustomer({
                      ...editCustomer,
                      discount: Number(e.target.value),
                    })
                  }
                />
              </label>
              <Button onClick={saveEditedCustomer}>Guardar cambios</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!directCheckoutOrder} onOpenChange={open => { if (!open) setDirectCheckoutOrder(null); }}>
        <DialogContent className="direct-checkout-dialog sm:max-w-[540px]">
          <DialogHeader><DialogTitle>Cobrar completo</DialogTitle></DialogHeader>
          {directCheckoutOrder && <div className="pending-compact direct-checkout-panel"><InlinePendingPayment key={directCheckoutOrder.id} fullPaymentOnly order={directCheckoutOrder} cashOpen={cashOpen} editOrder={editPendingOrder} confirm={(order, payments) => { if (payments.reduce((sum, payment) => sum + payment.amount, 0) < order.total - paidAmount(order)) return; if (confirmInlinePayment(order, payments) === true) setDirectCheckoutOrder(null); }}/></div>}
        </DialogContent>
      </Dialog>
      <OrderDetails
        key={consultedOrderId}
        order={consultedOrder}
        cashOpen={cashOpen}
        close={() => setConsultedOrderId(null)}
        edit={consultingAnotherAdvisor ? undefined : () => { if (consultedOrder) editHistoryOrder(consultedOrder); setConsultedOrderId(null); }}
        notify={consultingAnotherAdvisor ? undefined : () => { if (consultedOrder) notifyCashier(consultedOrder); }}
        onConfirmPickup={consultingAnotherAdvisor && storedConsultedOrder ? () => confirmPickup(storedConsultedOrder) : undefined}
      >
        {consultedOrder && <ThermalReceipt order={consultedOrder} orderPreview />}
      </OrderDetails>
      <AlertDialog
        open={!!deleteCustomer}
        onOpenChange={(open) => !open && setDeleteCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará “{deleteCustomer?.name}” de clientes frecuentes. Las
              ventas anteriores no se modificarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={removeCustomer}
            >
              Eliminar cliente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={!!redoOrder}
        onOpenChange={(open) => !open && setRedoOrder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Eliminar este cobro y rehacerlo?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La venta {redoOrder?.id} volverá a Pedidos para cobrar. Se
              borrarán sus medios de pago anteriores, pero conservará el cliente
              y todos los productos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={redoPayment}
            >
              Eliminar cobro y rehacer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!returnHistoryOrder} onOpenChange={open=>{if(!open)setReturnHistoryOrder(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{moveSection==="historial"?"Mover a Pedidos":"Mover a Ventas"}</AlertDialogTitle><AlertDialogDescription>{bulkMoveIds.length?`${bulkMoveIds.length} pedidos seleccionados aparecerán en`:`El pedido ${returnHistoryOrder?.id} aparecerá en`} {moveSection==="historial"?"Pedidos":"Ventas"}. Solo cambia la solapa del asesor. Sus pagos, stock y estado en caja se conservan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={returnToHistory}>{moveSection==="historial"?"Mover a Pedidos":"Mover a Ventas"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!hideHistoryOrder} onOpenChange={open=>{if(!open)setHideHistoryOrder(null);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar de mi lista</AlertDialogTitle><AlertDialogDescription>El pedido {hideHistoryOrder?.id} dejará de aparecer en tu lista personal. Sus pagos y la venta seguirán registrados en caja y en el historial de administración.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={hideAdvisorHistory}>Eliminar de mi lista</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog
        open={!!deleteOrder}
        onOpenChange={(open) => !open && setDeleteOrder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
{deleteOrder?.creditAccountId?"¿Eliminar esta deuda?":"¿Eliminar este pedido?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteOrder?.creditAccountId?`La deuda ${deleteOrder.creditCode||deleteOrder.id} y los importes de pagos aplicados a ella se eliminarán de Crédito y de caja. Los pagos de otras deudas se conservarán.`:<>El pedido {deleteOrder?.id}, sus señas y abonos se eliminarán de caja y del historial del asesor.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={removeOrder}
            >
              {deleteOrder?.creditAccountId?"Eliminar deuda":"Eliminar pedido"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={!!editProduct}
        onOpenChange={(open) => !open && setEditProduct(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          {editProduct && (
            <div className="grid gap-4">
              <label className="field-label">Código (manual o automático)<Input placeholder="Vacío: generar automáticamente" value={editProduct.code||''} onChange={e=>setEditProduct({...editProduct,code:e.target.value})}/></label>
              <label className="field-label">Cantidad de stock<Input type="number" step="any" value={editProduct.stockQuantity??''} onChange={e=>setEditProduct({...editProduct,stockQuantity:e.target.value===''?undefined:Number(e.target.value)})}/></label>
              <label className="field-label">Precio de compra (Gs.)<Input type="number" min="0" value={editProduct.purchasePrice??0} onChange={e=>setEditProduct({...editProduct,purchasePrice:Number(e.target.value)})}/></label>
              <label className="field-label">IVA (%)<Input type="number" min="0" max="100" placeholder="Sin especificar" value={editProduct.vat??''} onChange={e=>setEditProduct({...editProduct,vat:e.target.value===''?null:Number(e.target.value)})}/></label>
              <label className="field-label">
                Nombre
                <Input
                  value={editProduct.name}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, name: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Categoría
                <Input
                  value={editProduct.category}
                  onChange={(e) =>
                    setEditProduct({ ...editProduct, category: e.target.value })
                  }
                />
              </label>
              <label className="field-label">
                Precio de venta
                <Input
                  type="number"
                  value={editProduct.price}
                  onChange={(e) =>
                    setEditProduct({
                      ...editProduct,
                      price: Number(e.target.value),
                    })
                  }
                />
              </label>
              <Button onClick={saveProduct}>Guardar cambios</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={!!deleteProduct}
        onOpenChange={(open) => !open && setDeleteProduct(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará “{deleteProduct?.name}” del catálogo. Las ventas
              anteriores conservarán su información.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={removeProduct}
            >
              Eliminar producto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={managementAccessOpen} onOpenChange={open=>{if(managementAccessBusy)return;setManagementAccessOpen(open);if(!open){setManagementPassword("");setManagementPasswordError("");}}}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Acceso a Gerencia</DialogTitle></DialogHeader>
          <form className="management-access-form" onSubmit={event=>{event.preventDefault();void unlockManagement();}}>
            <label htmlFor="management-password">Contraseña de Gerencia</label>
            <Input id="management-password" autoFocus type="password" autoComplete="current-password" value={managementPassword} onChange={event=>{setManagementPassword(event.target.value);setManagementPasswordError("");}} disabled={managementAccessBusy} maxLength={64} aria-invalid={!!managementPasswordError} aria-describedby={managementPasswordError?"management-access-error":undefined}/>
            {managementPasswordError&&<p id="management-access-error" role="alert" className="amount-red">{managementPasswordError}</p>}
            <div className="business-actions"><Button type="button" variant="outline" disabled={managementAccessBusy} onClick={()=>{setManagementAccessOpen(false);setManagementPassword("");setManagementPasswordError("");}}>Cancelar</Button><Button type="submit" disabled={managementAccessBusy||!managementPassword}>{managementAccessBusy?'Verificando…':'Ingresar a Gerencia'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!accountChosen&&!managementAccessOpen}>
        <DialogContent
          showCloseButton={false}
          className="account-picker sm:max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Elegir usuario</DialogTitle>
          </DialogHeader>
          <p>Seleccioná quién va a utilizar el sistema.</p>
          <div className="account-options">
            <button onClick={()=>chooseAccount("gerencia:Gerencia")}><span className="account-avatar"><BarChart3 size={20}/></span><span><strong>Gerencia</strong><small>Consultas y reportes generales</small></span><ChevronRight/></button>
            <button onClick={() => chooseAccount("admin:Admi")}>
              <span className="account-avatar">A</span>
              <span>
                <strong>Admi</strong>
                <small>Administración y caja</small>
              </span>
              <ChevronRight />
            </button>
            <div className="advisor-picker-field">
              <label htmlFor="entry-advisor">Seleccionar asesor</label>
              <Select value={selectedAdvisor} onValueChange={setSelectedAdvisor}>
                <SelectTrigger id="entry-advisor"><SelectValue placeholder="Elegí un asesor"/></SelectTrigger>
                <SelectContent position="popper">{store.advisors.map(name=><SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
              </Select>
              <Button disabled={!selectedAdvisor} onClick={()=>chooseAccount(`asesor:${selectedAdvisor}`)}>Ingresar como asesor</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Nav({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && <b>{count}</b>}
    </button>
  );
}
function SaleViewEnhanced(props: any) {
  const {
    products,
    search,
    setSearch,
    category,
    setCategory,
    cart,
    total,
    customer,
    setCustomer,
    customerPhone,
    setCustomerPhone,
    customerRuc,
    setCustomerRuc,
    customers,
    add,
    updateQty,
    updatePrice,
    remove,
    send,
  } = props;
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: "", price: 0 });
  const categories = [
    "Todos",
    "Impresiones",
    "Diseño",
    "Personalizados",
    "DTF",
  ];
  const addManual = () => {
    if (!manual.name.trim())
      return toast.error("Escribí el nombre del producto");
    add({
      id: Date.now(),
      name: manual.name.trim(),
      price: Number(manual.price) || 0,
      category: "Manual",
    });
    setManual({ name: "", price: 0 });
    setManualOpen(false);
    toast.success("Producto manual agregado");
  };
  return (
    <div className="sale-grid">
      <section className="min-w-0">
        <div className="section-head">
          <div>
            <span className="eyebrow">NUEVO REGISTRO</span>
            <h1>Generar venta</h1>
            <p>Cliente y productos editables antes de guardar para cobrar.</p>
          </div>
          <Badge className="status-badge">Borrador local</Badge>
        </div>
        <div className="client-panel">
          <div className="client-panel-title">
            <UserRound />
            <strong>Información del cliente</strong>
            <small>Opcional</small>
          </div>
          <div className="client-fields">
            <label>
              Nombre
              <Input
                list="frequent-customers"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Ocasional"
              />
              <datalist id="frequent-customers">
                {customers.map((c: Customer) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </label>
            <label>
              Celular
              <Input
                placeholder="Ej.: 0994 711 183"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </label>
            <label>
              CI o RUC
              <Input
                placeholder="Opcional"
                value={customerRuc}
                onChange={(e) => setCustomerRuc(e.target.value)}
              />
            </label>
          </div>
        </div>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto o servicio…"
            />
          </div>
          <Button variant="outline" onClick={() => setManualOpen(true)}>
            <Plus />
            Producto manual
          </Button>
        </div>
        <div className="sale-product-list">
          {products.length === 0 ? (
            <div className="empty-state">
              <Search />
              <h2>Sin resultados</h2>
              <p>Probá escribiendo otro nombre.</p>
            </div>
          ) : (
            products.map((p: Product) => (
              <button
                className="sale-product-row"
                key={p.id}
                onClick={() => add(p)}
              >
                <span className="product-icon">
                  <Printer />
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.category}</small>
                </span>
                <b>{money(p.price)}</b>
                <span className="list-add">
                  <Plus />
                </span>
              </button>
            ))
          )}
        </div>
      </section>
      <aside className="cart-panel">
        <div className="cart-title">
          <div>
            <span className="eyebrow">VENTA ACTUAL</span>
            <h2>{customer}</h2>
          </div>
          <Badge variant="secondary">{cart.length} productos</Badge>
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart />
              <strong>No hay productos</strong>
              <span>Seleccioná uno o agregalo manualmente.</span>
            </div>
          ) : (
            cart.map((item: CartItem) => (
              <div className="editable-cart-line" key={item.id}>
                <div className="editable-name">
                  <strong>{item.name}</strong>
                  <button className="trash" onClick={() => remove(item.id)}>
                    <Trash2 />
                  </button>
                </div>
                <div className="editable-values">
                  <label>
                    Cantidad
                    <div className="qty">
                      <button onClick={() => updateQty(item.id, -1)}>
                        <Minus />
                      </button>
                      <b>{item.quantity}</b>
                      <button onClick={() => updateQty(item.id, 1)}>
                        <Plus />
                      </button>
                    </div>
                  </label>
                  <label>
                    Precio unitario
                    <Input
                      type="number"
                      min="0"
                      value={item.price}
                      onChange={(e) =>
                        updatePrice(item.id, Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    Total<strong>{money(item.price * item.quantity)}</strong>
                  </label>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="cart-bottom">
          <div className="total-row">
            <span>Total de la venta</span>
            <strong>{money(total)}</strong>
          </div>
          <div className="payment-hint">
            <Banknote />
            <span>
              El método de pago se selecciona al cobrar: efectivo, QR,
              POS/tarjeta o transferencia.
            </span>
          </div>
          <Button size="lg" className="send-button" onClick={send}>
            <Send />
            Guardar para cobrar
          </Button>
        </div>
      </aside>
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar producto manual</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <label className="field-label">
              Descripción
              <Input
                placeholder="Nombre del producto o servicio"
                value={manual.name}
                onChange={(e) =>
                  setManual((v) => ({ ...v, name: e.target.value }))
                }
              />
            </label>
            <label className="field-label">
              Precio unitario
              <Input
                type="number"
                value={manual.price || ""}
                onChange={(e) =>
                  setManual((v) => ({ ...v, price: Number(e.target.value) }))
                }
              />
            </label>
            <Button onClick={addManual}>Agregar a la venta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function SaleView({
  products,
  search,
  setSearch,
  category,
  setCategory,
  cart,
  total,
  customer,
  setCustomer,
  customers,
  add,
  updateQty,
  remove,
  send,
}: any) {
  const categories = [
    "Todos",
    "Impresiones",
    "Diseño",
    "Personalizados",
    "DTF",
  ];
  return (
    <div className="sale-grid">
      <section className="min-w-0">
        <div className="section-head">
          <div>
            <span className="eyebrow">ASESOR · AIDE</span>
            <h1>Nueva venta</h1>
            <p>Prepará el pedido y envialo directo a caja.</p>
          </div>
          <Badge className="status-badge">Borrador local</Badge>
        </div>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto o servicio…"
            />
          </div>
          <Select value={customer} onValueChange={setCustomer}>
            <SelectTrigger className="customer-select">
              <UserRound />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c: Customer) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                  {c.discount ? ` · ${c.discount}%` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="category-row">
          {categories.map((c) => (
            <button
              className={`chip ${category === c ? "active" : ""}`}
              key={c}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {products.map((p: Product) => (
            <button className="product-card" key={p.id} onClick={() => add(p)}>
              <span className="product-icon">
                <Printer />
              </span>
              <small>{p.category}</small>
              <strong>{p.name}</strong>
              <b>{money(p.price)}</b>
              <span className="add-circle">
                <Plus />
              </span>
            </button>
          ))}
        </div>
      </section>
      <aside className="cart-panel">
        <div className="cart-title">
          <div>
            <span className="eyebrow">PEDIDO ACTUAL</span>
            <h2>{customer}</h2>
          </div>
          <Badge variant="secondary">{cart.length} ítems</Badge>
        </div>
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingCart />
              <strong>El pedido está vacío</strong>
              <span>Seleccioná productos para comenzar.</span>
            </div>
          ) : (
            cart.map((item: CartItem) => (
              <div className="cart-line" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{money(item.price)} c/u</span>
                </div>
                <div className="qty">
                  <button onClick={() => updateQty(item.id, -1)}>
                    <Minus />
                  </button>
                  <b>{item.quantity}</b>
                  <button onClick={() => updateQty(item.id, 1)}>
                    <Plus />
                  </button>
                </div>
                <strong>{money(item.price * item.quantity)}</strong>
                <button className="trash" onClick={() => remove(item.id)}>
                  <Trash2 />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="cart-bottom">
          <div className="total-row">
            <span>Total</span>
            <strong>{money(total)}</strong>
          </div>
          <Button size="lg" className="send-button" onClick={send}>
            <Send />
            Enviar a caja
          </Button>
          <p>
            <Clock3 /> Aparecerá inmediatamente en la cuenta de la cajera
          </p>
        </div>
      </aside>
    </div>
  );
}
function PendingView({
  orders,
  openPayment,
}: {
  orders: Order[];
  openPayment: (o: Order) => void;
}) {
  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">ACTUALIZACIÓN EN TIEMPO REAL</span>
          <h1>Pedidos para cobrar</h1>
          <p>Recibidos de todos los asesores.</p>
        </div>
        <Badge className="live-badge">
          <span /> {orders.length} pendientes
        </Badge>
      </div>
      <div className="queue">
        {orders.length === 0 ? (
          <div className="empty-state">
            <Check />
            <h2>Todo al día</h2>
            <p>No hay pedidos esperando cobro.</p>
          </div>
        ) : (
          orders.map((o) => (
            <article className="order-card" key={o.id}>
              <div className="order-accent" />
              <div className="order-main">
                <div className="order-top">
                  <div>
                    <Badge variant="secondary">{o.id}</Badge>
                    <span>{displayTime(o.createdAt)}</span>
                  </div>
                  <Badge className="pending-badge">Esperando cobro</Badge>
                </div>
                <h2>{o.customer}</h2>
                <p>
                  Enviado por <strong>{o.advisor}</strong>
                </p>
                <div className="mini-items">
                  {o.items.map((i) => (
                    <span key={i.id}>
                      {i.quantity} × {i.name}
                      <b>{money(i.price * i.quantity)}</b>
                    </span>
                  ))}
                </div>
              </div>
              <div className="order-action">
                <small>Total</small>
                <strong>{money(o.total)}</strong>
                <Button onClick={() => openPayment(o)}>
                  Cobrar <ChevronRight />
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
function PaymentDialog({
  open,
  order,
  payments,
  setPayments,
  paid,
  close,
  confirm,
}: any) {
  const total = order?.total || 0;
  const remaining = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);
  const methods = ["Efectivo", "QR", "POS/Tarjeta", "Transferencia"];
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Cobrar {order?.id}</DialogTitle>
        </DialogHeader>
        {order && (
          <div>
            <div className="payment-overview">
              <div>
                <span>Total a cobrar</span>
                <strong>{money(total)}</strong>
              </div>
              <div>
                <span>Monto que da el cliente</span>
                <strong>{money(paid)}</strong>
              </div>
              <div className={change > 0 ? "change-card" : ""}>
                <span>Vuelto</span>
                <strong>{money(change)}</strong>
              </div>
            </div>
            <div className="payment-layout">
              <div>
                <div className="soft-panel">
                  <span>Cliente</span>
                  <strong>{order.customer}</strong>
                </div>
                <h3 className="subheading">Métodos de pago</h3>
                {payments.map((p: Payment, index: number) => (
                  <div className="payment-row" key={index}>
                    <label>
                      <span>Medio de pago</span>
                      <Select
                        value={p.method}
                        onValueChange={(v) =>
                          setPayments((ps: Payment[]) => {
                            const otherPaid = ps.reduce(
                              (sum, item, i) =>
                                i === index ? sum : sum + Number(item.amount || 0),
                              0,
                            );
                            return ps.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    method: v,
                                    amount:
                                      v === "Efectivo"
                                        ? 0
                                        : Math.max(0, total - otherPaid),
                                  }
                                : x,
                            );
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {methods.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                    {p.method === "Efectivo" ? (
                      <label className="amount-field">
                        <span>Monto que entrega el cliente</span>
                        <Input
                          aria-label="Monto que entrega el cliente"
                          placeholder="Ej.: 100000"
                          type="number"
                          min="0"
                          value={p.amount || ""}
                          onChange={(e) =>
                            setPayments((ps: Payment[]) =>
                              ps.map((x, i) =>
                                i === index
                                  ? { ...x, amount: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                        />
                      </label>
                    ) : (
                      <div className="automatic-payment">
                        <span>Monto exacto automático</span>
                        <strong>{money(p.amount)}</strong>
                      </div>
                    )}
                    {payments.length > 1 && (
                      <button
                        className="trash payment-remove"
                        aria-label="Quitar método de pago"
                        onClick={() =>
                          setPayments((ps: Payment[]) =>
                            ps.filter((_: Payment, i: number) => i !== index),
                          )
                        }
                      >
                        <X />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  className="add-payment"
                  onClick={() =>
                    setPayments((p: Payment[]) => [
                      ...p,
                      { method: "QR", amount: remaining },
                    ])
                  }
                >
                  <Plus />
                  Agregar otro medio de pago
                </button>
              </div>
              <aside className="payment-summary">
                <span>Resumen del cobro</span>
                <strong>{money(total)}</strong>
                <div>
                  <p>
                    Monto recibido <b>{money(paid)}</b>
                  </p>
                  <p className={remaining ? "warning" : "success"}>
                    Falta cobrar <b>{money(remaining)}</b>
                  </p>
                  <p className="change">
                    <span>Vuelto</span>
                    <b>{money(change)}</b>
                  </p>
                </div>
                <Button
                  className="send-button"
                  onClick={confirm}
                  disabled={remaining > 0}
                >
                  <Check />
                  Confirmar cobro
                </Button>
                <small>
                  Ejemplo: si el total es 50.000 Gs. y recibe 100.000 Gs., el
                  vuelto será 50.000 Gs.
                </small>
              </aside>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
const safeText = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char] || char,
  );
async function downloadOrderImage(order: Omit<Order, "status">) {
  const container = document.createElement("div");
  Object.assign(container.style, { position: "fixed", left: "-10000px", top: "0", width: "800px", pointerEvents: "none" });
  container.setAttribute("aria-hidden", "true");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    flushSync(() => root.render(<OrderSummary order={order}/>));
    await document.fonts.ready;
    const receipt = container.querySelector<HTMLElement>(".order-document");
    if (!receipt) throw new Error("Pedido no disponible");
    const blob = await orderDocumentImageBlob(receipt);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `orden-${order.id}.png`;
    link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    toast.error("No se pudo descargar el pedido. Intentá de nuevo.");
  } finally {
    root.unmount(); container.remove();
  }
}
function printThermalReceipt(order: Order) {
  const summary = receiptSummary(order);
  const collectionSummary = `${summary.before > 0 ? `<p><span>ABONADO ANTES</span><b>${safeText(money(summary.before))}</b></p>` : ""}<p class="payment-heading"><span>${safeText(summary.label)}</span><b>${safeText(money(summary.current))}</b></p>`;
  const items = order.items
    .map(
      (item) =>
        `<div class="item"><strong>${safeText(item.name)}</strong><div><span>${item.quantity} x ${safeText(money(item.price))}</span><b>${safeText(money(item.price * item.quantity))}</b></div></div>`,
    )
    .join("");
  const payments = summary.methods.map(payment => `<p class="payment-method"><span>${safeText(payment.method)}</span><b>${safeText(money(payment.amount))}</b></p>`).join("");
  const balanceSummary = `${summary.change > 0 ? `<p class="payment-method"><span>Vuelto</span><b>${safeText(money(summary.change))}</b></p>` : ""}<p class="change"><span>FALTA COBRAR</span><b>${safeText(money(summary.balance))}</b></p>`;
  const popup = window.open("", "_blank", "width=360,height=720");
  if (!popup) {
    toast.error("El navegador bloqueó la ventana de impresión");
    return;
  }
  const writeTicket = popup.document.write.bind(popup.document);
  popup.document.write = (html: string) =>
    writeTicket(
      html.replace(
        'font-family:"Courier New",monospace',
        "font-family:Arial,sans-serif",
      ),
    );
  popup.document.open();
  popup.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>Ticket ${safeText(ticketLabel(order))}</title><style id="page-size">@page{size:80mm 120mm;margin:0}</style><style>*{box-sizing:border-box}html,body{width:80mm;height:auto;margin:0;padding:0;background:#fff;color:#000;font-family:"Courier New",monospace;overflow:visible}main{width:72mm;margin:0 auto;padding:3mm 0 3mm;font-size:8.5pt;line-height:1.22;break-inside:avoid}.brand{text-align:center}.brand p{margin:.35mm 0;font-size:7.6pt}.logo{display:block;width:52mm;height:auto;margin:0 auto 2mm}.rule{margin:2.5mm 0;border-top:.25mm dashed #000}.bold{border-top:.6mm solid #000}.data p,.payments p{display:grid;grid-template-columns:19mm 1fr;gap:1mm;margin:.7mm 0}.data b,.payments b{text-align:right;overflow-wrap:anywhere}.item{padding:1.5mm 0;border-bottom:.2mm dotted #777}.item strong{display:block;font-size:8.2pt}.item div{display:flex;justify-content:space-between;margin-top:.6mm}.total{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1mm;font:bold 9.5pt Arial,sans-serif}.total span,.total b{white-space:nowrap}.payments p{grid-template-columns:minmax(0,1fr) auto;gap:1mm}.payments b{white-space:nowrap;overflow-wrap:normal}.payment-heading{font-weight:bold;margin-top:1mm!important}.payment-method{padding-left:2mm;font-size:8pt}.payments .change{margin-top:2mm;padding-top:2mm}.change{padding-top:1mm;border-top:.2mm solid #000;font-weight:bold}.footer{text-align:center;margin-top:4mm}.footer p{font:bold 9pt Arial,sans-serif}.footer small{font-size:7pt}</style></head><body><main><div class="brand"><img class="logo" src="/copy-print-logo.svg" alt="Copy Print"><p>Gral. Elizardo Aquino · Limpio</p><p>Tel. (0994) 711-183</p><p>copyprint896@gmail.com</p></div><div class="rule"></div><div class="data"><p><span>Ticket</span><b>${safeText(ticketLabel(order))}</b></p>${order.receiptKind ? `<p><span>Concepto</span><b>${safeText(order.receiptKind)}</b></p>` : ""}<p><span>Cliente</span><b>${safeText(order.customer)}</b></p>${order.phone ? `<p><span>Celular</span><b>${safeText(order.phone)}</b></p>` : ""}${order.ruc ? `<p><span>CI/RUC</span><b>${safeText(order.ruc)}</b></p>` : ""}${order.invoice === "Con factura" ? `<p><span>Factura a</span><b>${safeText(order.invoiceName || "—")}</b></p><p><span>RUC factura</span><b>${safeText(order.invoiceRuc || "—")}</b></p><p><span>Dirección</span><b>${safeText(order.invoiceAddress || "—")}</b></p>` : ""}<p><span>Asesor</span><b>${safeText(order.advisor)}</b></p><p><span>Cajera</span><b>${safeText(order.cashier || "—")}</b></p><p><span>Fecha</span><b>${safeText(displayDate(order.date || businessToday()))}</b></p><p><span>Hora</span><b>${safeText(displayTime(order.createdAt))}</b></p></div><div class="rule"></div>${items}<div class="rule bold"></div><div class="total"><span>COSTO TOTAL</span><b>${safeText(money(summary.total))}</b></div><div class="rule"></div><div class="payments">${collectionSummary}${payments}${balanceSummary}</div><div class="footer"><p>¡Muchas gracias por tu compra!</p><small>Conservá este ticket para cambios o devoluciones.</small></div></main><script>const fitTicket=()=>{const ticket=document.querySelector("main");const heightMm=Math.ceil(Math.max(ticket.getBoundingClientRect().height,ticket.scrollHeight)*25.4/96)+1;document.getElementById("page-size").textContent="@page{size:80mm "+heightMm+"mm;margin:0}";};window.addEventListener("beforeprint",fitTicket);window.onload=async()=>{await document.fonts.ready;await Promise.all(Array.from(document.images,img=>img.decode().catch(()=>{})));requestAnimationFrame(()=>{fitTicket();requestAnimationFrame(()=>window.print());});};window.onafterprint=()=>window.close();<\/script></body></html>`,
  );
  popup.document.close();
}
function ThermalReceipt({ order, orderPreview = false }: { order: Order; orderPreview?: boolean }) {
  const paid = orderPreview ? paidAmount(order) : 0;
  const summary = receiptSummary(orderPreview ? {
    total: order.total,
    payments: order.paymentRecords?.length ? order.paymentRecords.flatMap(record => record.payments || []) : order.payments,
    receiptPaidNow: paid,
    receiptBalance: Math.max(0, order.total - paid),
  } : order);
  return (
        <div className="thermal-receipt">
          <div className="ticket-brand">
            <img
              className="ticket-brand-logo"
              src="/copy-print-logo.svg"
              alt="Copy Print"
            />
            <p>Gral. Elizardo Aquino</p>
            <p>Limpio · Paraguay</p>
            <p>Tel. (0994) 711-183</p>
            <p>copyprint896@gmail.com</p>
          </div>
          <div className="ticket-rule" />
          <div className="ticket-data">
            <p>
              <span>Ticket</span>
              <b>{ticketLabel(order)}</b>
            </p>
            {order.receiptKind && (
              <p>
                <span>Concepto</span>
                <b>{order.receiptKind}</b>
              </p>
            )}
            <p>
              <span>Cliente</span>
              <b>{order.customer}</b>
            </p>
            {order.phone && (
              <p>
                <span>Celular</span>
                <b>{order.phone}</b>
              </p>
            )}
            {order.ruc && (
              <p>
                <span>CI/RUC</span>
                <b>{order.ruc}</b>
              </p>
            )}
            {order.invoice === "Con factura" && (
              <>
                <p><span>Factura a</span><b>{order.invoiceName || "—"}</b></p>
                <p><span>RUC factura</span><b>{order.invoiceRuc || "—"}</b></p>
                <p><span>Dirección</span><b>{order.invoiceAddress || "—"}</b></p>
              </>
            )}
            <p>
              <span>Asesor</span>
              <b>{order.advisor}</b>
            </p>
            <p>
              <span>Cajera</span>
              <b>{order.cashier || "—"}</b>
            </p>
            <p>
              <span>Fecha</span>
              <b>{displayDate(order.date || (orderPreview ? undefined : businessToday()))}</b>
            </p>
            <p>
              <span>Hora</span>
              <b>{displayTime(order.createdAt)}</b>
            </p>
            {orderPreview && (order.deliveryDate || order.deliveryTime) && (
              <p><span>Entrega prevista</span><b>{[order.deliveryDate && displayDate(order.deliveryDate), order.deliveryTime && displayTime(order.deliveryTime)].filter(Boolean).join(" · ")}</b></p>
            )}
          </div>
          <div className="ticket-rule" />
          <div className="ticket-items">
            {order.items.map((item) => (
              <div className="ticket-item" key={item.id}>
                <strong>{item.name}</strong>
                <small>{money(item.price)} c/u</small>
                <span>{item.quantity}</span>
                <b>{money(item.price * item.quantity)}</b>
              </div>
            ))}
          </div>
          {orderPreview && order.notes && <p className="ticket-order-notes"><b>Observaciones</b><br/>{order.notes}</p>}
          <div className="ticket-rule bold" />
          <div className="ticket-total">
            <p>
              <span>COSTO TOTAL</span>
              <b>{money(summary.total)}</b>
            </p>
          </div>
          <div className="ticket-payments">
            {summary.before > 0 && <p><span>ABONADO ANTES</span><b>{money(summary.before)}</b></p>}
            <p className="ticket-payment-heading"><span>{summary.label}</span><b>{money(summary.current)}</b></p>
            {summary.methods.map(payment => <p className="ticket-payment-method" key={payment.method}><span>{payment.method}</span><b>{money(payment.amount)}</b></p>)}
            {summary.change > 0 && <p className="ticket-payment-method"><span>Vuelto</span><b>{money(summary.change)}</b></p>}
            <p className="ticket-change"><span>FALTA COBRAR</span><b>{money(summary.balance)}</b></p>
          </div>
          <div className="ticket-footer">
            <p>¡Muchas gracias por tu compra!</p>
            <small>Conservá este ticket para cambios o devoluciones.</small>
            <div className="ticket-code">* {ticketLabel(order)} *</div>
          </div>
        </div>
  );
}
function ReceiptDialog({
  order,
  close,
}: {
  order: Order | null;
  close: () => void;
}) {
  if (!order) return null;
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && close()}>
      <DialogContent className="receipt-dialog sm:max-w-[430px]">
        <DialogHeader className="no-print">
          <DialogTitle>Vista previa · ticket 80 mm</DialogTitle>
        </DialogHeader>
        <ThermalReceipt order={order}/>
        <div className="receipt-actions no-print">
          <Button variant="outline" onClick={close}>
            Cerrar
          </Button>
          <Button onClick={() => printThermalReceipt(order)}>
            <Printer />
            Imprimir ticket de 80 mm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
function OrdersTable({
  title,
  orders,
  onRefund,
  onRedo,
  onDelete,
}: {
  title: string;
  orders: Order[];
  onRefund?: (o: Order) => void;
  onRedo?: (o: Order) => void;
  onDelete?: (o: Order) => void;
}) {
  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">HISTORIAL</span>
          <h1>{title}</h1>
          <p>Consulta todos los movimientos registrados.</p>
        </div>
      </div>
      <div className="table-card">
        <div className="table-head">
          <span>Ticket / hora</span>
          <span>Cliente</span>
          <span>Asesor</span>
          <span>Pago</span>
          <span>Total</span>
          <span>Estado</span>
          <span />
        </div>
        {orders.map((o) => (
          <div className="table-row" key={o.id}>
            <span>
              <b>{ticketLabel(o)}</b>
              <small>{displayTime(o.createdAt)}</small>
            </span>
            <span>{o.customer}</span>
            <span>{o.advisor}</span>
            <span>{o.payments?.map((p) => p.method).join(" + ") || "—"}</span>
            <strong>{money(o.total - (o.refund || 0))}</strong>
            <Badge
              className={
                o.status === "cobrado"
                  ? "paid-badge"
                  : o.status === "devuelto"
                    ? "refund-badge"
                    : "pending-badge"
              }
            >
              {o.status}
            </Badge>
            <span className="sale-actions">
              {onRefund && o.status === "cobrado" ? (
                <Button variant="outline" size="sm" onClick={() => onRefund(o)}>
                  <RotateCcw />
                  Devolver
                </Button>
              ) : null}
              {onRedo && o.status === "cobrado" ? (
                <Button
                  className="quick-delete"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRedo(o)}
                >
                  <RefreshCw />
                  Rehacer
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  className="quick-delete"
                  variant="ghost"
                  size="icon"
                  title={`Eliminar venta ${o.id}`}
                  onClick={() => onDelete(o)}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
function CashSummary({
  orders,
  onPrint,
}: {
  orders: Order[];
  onPrint: () => void;
}) {
  const [counted, setCounted] = useState(0);
  const [difference, setDifference] = useState<number | null>(null);
  const [closed, setClosed] = useState(false);
  const paid = orders.filter((o) => o.status !== "pendiente");
  const by = (m: string) =>
    paid.reduce(
      (s, o) =>
        s +
        (o.payments || [])
          .filter((p) => p.method === m)
          .reduce((a, p) => a + p.amount, 0),
      0,
    );
  const refunds = paid.reduce((s, o) => s + (o.refund || 0), 0);
  const gross = paid.reduce((s, o) => s + o.total, 0);
  const compare = () => {
    const value = counted - by("Efectivo");
    setDifference(value);
    toast[value === 0 ? "success" : "warning"](
      value === 0 ? "La caja coincide" : `Diferencia: ${money(value)}`,
    );
  };
  const closeCash = () => {
    setClosed(true);
    toast.success("Caja cerrada y resumen guardado");
  };
  return (
    <div className="print-area">
      <div className="section-head">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN · ADMI</span>
          <h1>Control de caja</h1>
          <p>Resumen del día y cierre de caja.</p>
        </div>
        <div className="head-actions">
          <Button
            variant="outline"
            onClick={() => {
              toast.success(
                "Elegí Guardar como PDF en la ventana de impresión",
              );
              onPrint();
            }}
          >
            <FileDown />
            Descargar A4
          </Button>
          <Button onClick={onPrint}>
            <Printer />
            Imprimir
          </Button>
        </div>
      </div>
      <div className="metric-grid">
        <Metric icon={<Banknote />} label="Efectivo" value={by("Efectivo")} />
        <Metric icon={<QrCode />} label="QR" value={by("QR")} />
        <Metric
          icon={<CreditCard />}
          label="POS / Tarjeta"
          value={by("POS/Tarjeta")}
        />
        <Metric
          icon={<Smartphone />}
          label="Transferencia"
          value={by("Transferencia")}
        />
      </div>
      <div className="summary-grid">
        <section className="report-card">
          <div className="report-title">
            <h2>Resumen del día</h2>
            <Badge className={closed ? "refund-badge" : "paid-badge"}>
              {closed ? "Caja cerrada" : "Caja abierta"}
            </Badge>
          </div>
          <dl>
            <div>
              <dt>Ventas brutas</dt>
              <dd>{money(gross)}</dd>
            </div>
            <div>
              <dt>Devoluciones</dt>
              <dd className="negative">− {money(refunds)}</dd>
            </div>
            <div className="grand">
              <dt>Ventas netas</dt>
              <dd>{money(gross - refunds)}</dd>
            </div>
            {difference !== null && (
              <div>
                <dt>Diferencia de efectivo</dt>
                <dd className={difference === 0 ? "" : "negative"}>
                  {money(difference)}
                </dd>
              </div>
            )}
          </dl>
          <div className="cash-count">
            <label>
              Efectivo contado
              <Input
                type="number"
                placeholder="Ingresar monto"
                value={counted || ""}
                onChange={(e) => setCounted(Number(e.target.value))}
              />
            </label>
            <Button variant="outline" onClick={compare}>
              Comparar caja
            </Button>
          </div>
        </section>
        <section className="report-card">
          <h2>Actividad</h2>
          <div className="activity-bars">
            <Bar label="Cobros realizados" value={paid.length} width="78%" />
            <Bar
              label="Pedidos pendientes"
              value={orders.filter((o) => o.status === "pendiente").length}
              width="34%"
            />
            <Bar
              label="Devoluciones"
              value={orders.filter((o) => o.status === "devuelto").length}
              width="18%"
            />
          </div>
          <Button className="close-cash" onClick={closeCash} disabled={closed}>
            <CircleDollarSign />
            {closed ? "Caja cerrada" : "Cerrar caja del día"}
          </Button>
        </section>
      </div>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="metric">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{money(value)}</strong>
      </div>
    </div>
  );
}
function Bar({
  label,
  value,
  width,
}: {
  label: string;
  value: number;
  width: string;
}) {
  return (
    <div>
      <p>
        <span>{label}</span>
        <b>{value}</b>
      </p>
      <i>
        <em style={{ width }} />
      </i>
    </div>
  );
}
function CustomersView({
  customers,
  onNew,
  onEdit,
  onDelete,
}: {
  customers: Customer[];
  onNew: () => void;
  onEdit: (c: Customer) => void;
  onDelete: (c: Customer) => void;
}) {
  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">CLIENTES FRECUENTES</span>
          <h1>Clientes</h1>
          <p>
            Las tarifas se aplican automáticamente al seleccionar al cliente.
          </p>
        </div>
        <Button onClick={onNew}>
          <Plus />
          Nuevo cliente
        </Button>
      </div>
      <div className="customer-grid">
        {customers.map((c) => (
          <article className="customer-card" key={c.id}>
            <div className="customer-avatar">{c.name[0]}</div>
            <div>
              <h2>{c.name}</h2>
              <p>
                {c.phone || "Sin teléfono"}
                {c.ruc ? ` · CI/RUC ${c.ruc}` : ""}
              </p>
              <Badge variant="secondary">{c.special}</Badge>
            </div>
            <div className="customer-actions">
              <Button
                variant="ghost"
                size="icon"
                title="Editar cliente"
                onClick={() => onEdit(c)}
              >
                <Pencil />
              </Button>
              <Button
                className="quick-delete"
                variant="ghost"
                size="icon"
                title="Eliminar cliente"
                onClick={() => onDelete(c)}
              >
                <Trash2 />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
function ProductsView({
  products,
  onDelete,
  onEdit,
  onImport,
}: {
  products: Product[];
  onDelete: (p: Product) => void;
  onEdit: (p: Product) => void;
  onImport: (p: Product[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("es");
  const results = [...products]
    .filter(
      (p) =>
        !normalized ||
        p.name.toLocaleLowerCase("es").includes(normalized) ||
        p.category.toLocaleLowerCase("es").includes(normalized) ||
        String(p.price).includes(normalized),
    )
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  const readFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result || "")
        .split(/\r?\n/)
        .filter(Boolean);
      const imported = lines
        .map((line, index) => {
          const parts = line.split(/[;,\t]/);
          const name = (parts[0] || "").trim();
          const price = Number(String(parts[1] || "").replace(/[^0-9]/g, ""));
          return name && Number.isFinite(price)
            ? {
                id: Date.now() + index,
                name:
                  name.charAt(0).toUpperCase() + name.slice(1).toLowerCase(),
                price,
                category: (parts[2] || "Importados").trim(),
              }
            : null;
        })
        .filter(Boolean) as Product[];
      onImport(imported);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  };
  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Productos</h1>
          <p>{products.length} productos guardados.</p>
          <a href="/catalogo" target="_blank" rel="noopener noreferrer">Ver catálogo público de productos y precios ↗</a>
        </div>
        <>
          <input
            ref={fileRef}
            className="hidden"
            type="file"
            accept=".csv,.txt,.tsv"
            onChange={(e) => readFile(e.target.files?.[0])}
          />
          <Button onClick={() => fileRef.current?.click()}>
            <FileDown />
            Subir lista de productos
          </Button>
        </>
      </div>
      <div className="catalog-search">
        <div className="search-box">
          <Search />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, precio o categoría…"
          />
        </div>
        <Badge variant="secondary">{results.length} resultados</Badge>
        {query && (
          <Button variant="ghost" onClick={() => setQuery("")}>
            <X />
            Limpiar
          </Button>
        )}
      </div>
      <div className="table-card">
        {results.length === 0 ? (
          <div className="empty-state">
            <Search />
            <h2>Sin resultados</h2>
            <p>Probá con otro nombre o precio.</p>
          </div>
        ) : (
          results.map((p) => (
            <div className="product-row" key={p.id}>
              <span className="product-icon">
                <PackageSearch />
              </span>
              <div>
                <strong>{p.name}</strong>
                <small>{p.category}</small>
              </div>
              <b>{money(p.price)}</b>
              <div className="product-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${p.name}`}
                  title="Editar producto"
                  onClick={() => onEdit(p)}
                >
                  <Pencil />
                </Button>
                <Button
                  className="quick-delete"
                  variant="ghost"
                  size="icon"
                  aria-label={`Eliminar ${p.name}`}
                  title="Eliminar producto"
                  onClick={() => onDelete(p)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
function SettingsView({
  advisors,
  onAdd,
  onDelete,
}: {
  advisors: string[];
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const add = () => {
    onAdd(name);
    setName("");
  };
  return (
    <div>
      <div className="section-head">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1>Configuración</h1>
          <p>Usuarios, permisos e integraciones.</p>
        </div>
      </div>
      <div className="settings-grid">
        <article className="report-card advisor-card">
          <Users />
          <h2>Asesores</h2>
          <p>Agregá o eliminá los usuarios que pueden preparar ventas.</p>
          <div className="advisor-add">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Nombre del asesor"
            />
            <Button onClick={add}>
              <Plus />
              Agregar
            </Button>
          </div>
          <div className="advisor-list">
            {advisors.map((advisor) => (
              <div key={advisor}>
                <span className="customer-avatar">{advisor[0]}</span>
                <strong>{advisor}</strong>
                <Button
                  className="quick-delete"
                  variant="ghost"
                  size="icon"
                  title={`Eliminar a ${advisor}`}
                  onClick={() => onDelete(advisor)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </article>
        <article className="report-card">
          <RefreshCw />
          <h2>Integración Hércules</h2>
          <p>
            La aplicación seleccionada todavía no habilita acciones para enviar
            ventas.
          </p>
          <Badge className="refund-badge">Conexión no disponible</Badge>
        </article>
        <article className="report-card">
          <Calculator />
          <h2>Calculadora de precios</h2>
          <p>Acceso directo y envío de presupuestos a caja.</p>
          <a
            href="https://copyprint-wrap-studio.allacces.chatgpt.site/admin/calculadora"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="outline">Abrir calculadora</Button>
          </a>
        </article>
      </div>
    </div>
  );
}
