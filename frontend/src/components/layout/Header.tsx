import { AlertTriangle,Bell,LayoutDashboard,LogOut,Menu,Truck,User } from 'lucide-react';
import { useEffect,useRef,useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/helpers';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Menu button & Logo */}
        <div className="flex items-center gap-3">
            <button
            onClick={onMenuClick}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            aria-label="Open menu"
            >
            <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-900 flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-primary-900">RouteWise</span>
            </div>
        </div>

        {/* Right side - notifications, profile */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          {isAdmin && (
            <Link
              to="/alerts"
              aria-label="Open notifications"
              title="Open alerts"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Bell className="w-5 h-5" />
            </Link>
          )}

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 sm:gap-3 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="User menu"
            >
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center ring-2 ring-primary-50">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-900 leading-none">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{user?.role}</p>
              </div>
            </button>

            {/* Dropdown menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                  <span className={cn(
                    'inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
                    isAdmin ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-600'
                  )}>
                    {user?.role === 'admin' ? 'Administrator' : 'Customer'}
                  </span>
                </div>

                <Link
                  to="/dashboard"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <LayoutDashboard className="w-4 h-4 text-gray-400" />
                  Dashboard
                </Link>

                {isAdmin && (
                  <Link
                    to="/alerts"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <AlertTriangle className="w-4 h-4 text-gray-400" />
                    Alerts
                  </Link>
                )}

                <div className="border-t border-gray-100 my-1" />

                <button
                  onClick={() => { logout(); setDropdownOpen(false); }}
                  className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
