export default function PublicLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent" />
        <p className="text-sm text-[#999999]">로딩 중...</p>
      </div>
    </div>
  );
}
