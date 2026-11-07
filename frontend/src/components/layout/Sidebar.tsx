import {
LogOut,
MapPin,
Ship,
Truck,
User,
Users,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/helpers';

type UserRole = 'admin' | 'customer';

const NAV_ITEMS = [
  {path:'/track',label:'Track Shipment',icon:MapPin,roles:['admin','customer'] as UserRole[]},
  { path: '/shipments', label: 'Shipments', icon: Truck, roles: ['admin'] as UserRole[] },
  { path: '/customers', label: 'Customers', icon: Users, roles: ['admin'] as UserRole[] },
  { path: '/carriers', label: 'Carriers', icon: Ship, roles: ['admin'] as UserRole[] },
  { path: '/routes', label: 'Routes', icon: MapPin, roles: ['admin'] as UserRole[] },
] as const;

export function Sidebar({ sidebarOpen = false, onSidebarClose }: { sidebarOpen?: boolean; onSidebarClose?: () => void }) {
  const { user, logout } = useAuth();

  const filteredItems = NAV_ITEMS.filter((item) =>
    user && item.roles.includes(user.role as UserRole)
  );

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 bg-[#0E0E12] border-r border-[#1C1C24] flex flex-col transition-transform duration-300 ease-in-out text-white rounded-r-[24px]',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{
        background: 'linear-gradient(180deg, #0E0E12 0%, #1C1C24 100%)'
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#242432]">
        <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
          <Truck className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-white">RouteWise</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onSidebarClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-[#242432] transition-colors',
                isActive && 'bg-[#2E2E40] text-white font-semibold'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-[#242432]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-[#2E2E40] flex items-center justify-center">
            <User className="w-5 h-5 text-accent-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-danger-400 hover:bg-[#2E2E40] rounded-xl transition-colors text-sm font-medium"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          Logout
        </button>
      </div>
    </aside>
  );
}