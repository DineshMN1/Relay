export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0 animate-pulse">
      {/* Navbar skeleton */}
      <div className="h-14 bg-white border-b border-gray-100" />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Wallet card skeleton */}
        <div className="bg-orange-400 rounded-2xl p-6 h-32" />

        {/* Quick actions skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl h-28 border border-gray-100" />
          <div className="bg-white rounded-2xl h-28 border border-gray-100" />
        </div>

        {/* Parcel list skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3.5 flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
              <div className="h-6 w-20 bg-gray-100 rounded-full" />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
