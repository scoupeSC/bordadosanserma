import {
  Banknote,
  Boxes,
  Columns3,
  FlaskConical,
  LayoutDashboard,
  LineChart,
  Package,
  Receipt,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const navIcons = {
  inicio: LayoutDashboard,
  productos: Package,
  inventario: Boxes,
  insumos: FlaskConical,
  ventas: Receipt,
  pedidos: Columns3,
  pagos: Wallet,
  clientes: Users,
  gastos: Banknote,
  finanzas: LineChart,
} satisfies Record<string, LucideIcon>;

export type NavIconKey = keyof typeof navIcons;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
  hint: string;
};

export const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Operación",
    items: [
      { href: "/", label: "Inicio", icon: "inicio", hint: "Resumen y accesos" },
      { href: "/ventas", label: "Ventas", icon: "ventas", hint: "Registrar y consultar" },
      { href: "/pedidos", label: "Pedidos", icon: "pedidos", hint: "Tablero por etapa" },
      { href: "/insumos", label: "Insumos", icon: "insumos", hint: "Materiales por pedido" },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/productos", label: "Productos", icon: "productos", hint: "Catálogo y precios" },
      { href: "/inventario", label: "Inventario", icon: "inventario", hint: "Stock y movimientos" },
    ],
  },
  {
    label: "Dinero",
    items: [
      { href: "/pagos", label: "Pagos", icon: "pagos", hint: "Abonos y fiados" },
      { href: "/gastos", label: "Gastos", icon: "gastos", hint: "Salidas de dinero" },
      { href: "/finanzas", label: "Finanzas", icon: "finanzas", hint: "Ventas vs gastos" },
    ],
  },
  {
    label: "Personas",
    items: [{ href: "/clientes", label: "Clientes", icon: "clientes", hint: "Directorio y saldos" }],
  },
];

export const allNavItems: NavItem[] = navGroups.flatMap((g) => g.items);

export const mobileTabHrefs = ["/", "/ventas", "/pedidos", "/productos"] as const;

export function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
