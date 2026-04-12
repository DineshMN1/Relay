export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="bg-orange-500 rounded-2xl p-6 animate-pulse">
          <div className="h-4 w-28 bg-orange-400/70 rounded" />
          <div className="h-3 w-40 bg-orange-400/60 rounded mt-2" />
          <div className="h-10 w-36 bg-orange-400/70 rounded mt-5" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="card p-5 animate-pulse">
            <div className="w-9 h-9 bg-gray-100 rounded-lg" />
            <div className="h-4 w-24 bg-gray-200 rounded mt-3" />
            <div className="h-3 w-28 bg-gray-100 rounded mt-2" />
          </div>
          <div className="card p-5 animate-pulse">
            <div className="w-9 h-9 bg-gray-100 rounded-lg" />
            <div className="h-4 w-24 bg-gray-200 rounded mt-3" />
            <div className="h-3 w-28 bg-gray-100 rounded mt-2" />
          </div>
        </div>

        <div className="card p-4 space-y-4 animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded" />
          <div className="h-14 w-full bg-gray-100 rounded-xl" />
          <div className="h-14 w-full bg-gray-100 rounded-xl" />
          <div className="h-14 w-full bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
