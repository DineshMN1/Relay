'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Package, Route, LayoutDashboard, LogOut, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Home',    icon: LayoutDashboard },
  { href: '/send',      label: 'Send',    icon: Package },
  { href: '/travel',    label: 'Travel',  icon: Route },
  { href: '/profile',   label: 'Profile', icon: UserCircle },
]

export default function Navbar({ userName }: { userName: string }) {
  const router   = useRouter()
  const pathname = usePathname()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-5 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <Link href="/dashboard" className="text-xl font-black text-orange-500 tracking-tight">
          Relay
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/profile" className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <UserCircle size={16} />
            {userName}
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Bottom nav — mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex sm:hidden z-20">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href} href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium transition-colors',
              pathname.startsWith(href) && href !== '/dashboard'
                ? 'text-orange-500'
                : pathname === href
                  ? 'text-orange-500'
                  : 'text-gray-400'
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
