/* eslint-disable @next/next/no-img-element */
export function CoinImage({ src, symbol, size = 48 }: { src: string | null; symbol: string; size?: number }) {
  if (src)
    return <img src={src} alt={symbol} width={size} height={size} className="shrink-0 rounded-xl object-cover" style={{ width: size, height: size }} />;
  return (
    <div className="grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet to-lime font-black text-ink" style={{ width: size, height: size, fontSize: size / 3 }}>
      {symbol.slice(0, 2)}
    </div>
  );
}
