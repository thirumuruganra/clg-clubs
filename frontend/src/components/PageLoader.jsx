export default function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-[#1E1E24] border-t-[#EEFF00] rounded-full animate-spin"></div>
        <p className="text-[#A1A1AA] text-sm font-medium animate-pulse tracking-wide">Loading content...</p>
      </div>
    </div>
  );
}
