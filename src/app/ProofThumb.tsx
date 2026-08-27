// 付款/收款截图缩略图：点击在新标签打开原图。无截图时显示占位符。
export default function ProofThumb({ proof, alt }: { proof: string | null; alt: string }) {
  if (!proof) return <span className="text-slate-300 dark:text-slate-600">—</span>;
  return (
    <a href={`/api/files/${proof}`} target="_blank" rel="noreferrer" title="点击查看大图">
      <img
        src={`/api/files/${proof}`}
        alt={alt}
        className="h-10 w-10 rounded border border-slate-200 object-cover transition hover:scale-125 hover:shadow-md dark:border-slate-700"
      />
    </a>
  );
}
