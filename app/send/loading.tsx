export default function SendLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0 animate-pulse">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-gray-100 rounded-full" />
          <div className="space-y-1.5">
            <div className="h-4 bg-gray-100 rounded w-28" />
            <div className="h-3 bg-gray-100 rounded w-36" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-gray-100 rounded-xl" />
            <div className="h-12 bg-gray-100 rounded-xl" />
          </div>
          <div className="h-12 bg-orange-100 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
