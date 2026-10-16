import {
  Activity, BarChart3, Boxes, FileText, LayoutDashboard,
  Package, Settings, ShieldCheck, ShoppingCart, SlidersHorizontal, Truck,
  UsersRound, Warehouse,
} from 'lucide-react';

const definitions = {
  Dashboard: { label: 'Dashboard', icon: LayoutDashboard, group: 'OVERVIEW' },
  Products: { label: 'Products', icon: Package, group: 'MASTER DATA' },
  Customers: { label: 'Customers', icon: UsersRound, group: 'MASTER DATA' },
  Suppliers: { label: 'Suppliers', icon: Truck, group: 'MASTER DATA' },
  'Sales & Transactions': { label: 'Sales & Transactions', icon: ShoppingCart, group: 'OPERATIONS' },
  Inventory: { label: 'Inventory', icon: Warehouse, group: 'OPERATIONS' },
  Procurement: { label: 'Procurement', icon: Boxes, group: 'OPERATIONS' },
  'Records Management': { label: 'Records Management', icon: FileText, group: 'RECORDS & REPORTS' },
  Reports: { label: 'Reports', icon: BarChart3, group: 'RECORDS & REPORTS' },
  'User Management': { label: 'User Management', icon: ShieldCheck, group: 'ADMINISTRATION' },
  'Role & Permissions': { label: 'Role & Permissions', icon: SlidersHorizontal, group: 'ADMINISTRATION' },
  Settings: { label: 'Settings', icon: Settings, group: 'ACCOUNT' },
};

const byRole = {
  Administrator: Object.keys(definitions),
  'Manager/Owner': ['Dashboard', 'Sales & Transactions', 'Inventory', 'Procurement', 'Records Management', 'Reports', 'Settings'],
  Staff: ['Dashboard', 'Sales & Transactions', 'Inventory', 'Procurement', 'Records Management', 'Settings'],
};

export function getNavigationGroups(role, permissions) {
  const pages = permissions?.[role]
    ? Object.keys(definitions).filter((page) => permissions[role][page] !== false)
    : (byRole[role] || ['Dashboard', 'Settings']);
  const grouped = new Map();
  pages.forEach((page) => {
    if (permissions?.[role] && permissions[role][page] === false) return;
    const item = definitions[page];
    if (!item) return;
    if (!grouped.has(item.group)) grouped.set(item.group, []);
    grouped.get(item.group).push(item);
  });
  return [...grouped.entries()].map(([label, items]) => ({ label, items }));
}

export function getAllowedPages(role, permissions) {
  return getNavigationGroups(role, permissions).flatMap((group) => group.items.map((item) => item.label));
}

export function getPageIcon(role, page, permissions) {
  return getNavigationGroups(role, permissions)
    .flatMap((group) => group.items)
    .find((item) => item.label === page)?.icon ?? Activity;
}
