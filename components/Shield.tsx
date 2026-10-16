export function Shield({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 72" aria-hidden="true">
      <path d="M32 2 58 12v24c0 18-12 30-26 34C18 66 6 54 6 36V12L32 2z" fill="#8D1D2C" />
      <path d="M32 8.5 51 16.5v18.2c0 14.2-9.2 23.6-19 27.6-9.8-4-19-13.4-19-27.6V16.5L32 8.5z" fill="#202124" />
      <path d="M32 18c6 4 10 4 10 4v8c0 7-4.2 12-10 14-5.8-2-10-7-10-14v-8s4 0 10-4z" fill="#8D1D2C" />
      <text x="32" y="62" textAnchor="middle" fill="#F4EFE6" fontSize="11" fontFamily="Arial Narrow, sans-serif" fontWeight="700">
        1888
      </text>
    </svg>
  );
}
