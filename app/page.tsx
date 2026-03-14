import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Package, Route, Wallet } from 'lucide-react'
import { getSession } from '@/lib/auth'

export default async function Home() {
  const session = await getSession()
  if (session) redirect('/dashboard')
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-5xl mx-auto px-6 py-20 flex flex-col items-center text-center">

        <div className="mb-3">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
            Crowd-sourced delivery
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-gray-900 mt-4 leading-tight">
          Relay
        </h1>
        <p className="text-xl text-gray-500 mt-4 max-w-xl">
          Send parcels with people already travelling your route. Earn money on every trip you take.
        </p>

        <Link href="/login" className="btn-primary mt-10 text-base px-10 py-3">
          Get started
        </Link>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="card p-6">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
              <Package size={20} className="text-orange-500" />
            </div>
            <div className="font-bold text-gray-900">Send</div>
            <p className="text-sm text-gray-500 mt-1">Post a parcel. A traveller on the same route picks it up and delivers it.</p>
          </div>
          <div className="card p-6">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
              <Route size={20} className="text-orange-500" />
            </div>
            <div className="font-bold text-gray-900">Travel</div>
            <p className="text-sm text-gray-500 mt-1">Post your route. We match parcels along your path automatically.</p>
          </div>
          <div className="card p-6">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center mb-4">
              <Wallet size={20} className="text-orange-500" />
            </div>
            <div className="font-bold text-gray-900">Earn</div>
            <p className="text-sm text-gray-500 mt-1">Get paid directly to your Relay wallet for every delivery you complete.</p>
          </div>
        </div>

      </div>
    </main>
  )
}
