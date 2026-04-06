export default function ParcelLoading() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-0 animate-pulse">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-100 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-gray-100 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-20" />
          </div>
          <div className="h-6 w-20 bg-gray-100 rounded-full" />
        </div>

        {/* Status stepper */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-24" />

        {/* Map */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-52" />

        {/* Locations */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 h-28" />

        {/* Details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl h-16" />
            <div className="bg-gray-50 rounded-xl h-16" />
          </div>
          <div className="bg-orange-50 rounded-xl h-12" />
        </div>

      </div>
    </div>
  )
}
