"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            padding: "1rem",
            textAlign: "center",
            fontFamily: "sans-serif",
          }}
        >
          <h1>문제가 발생했습니다</h1>
          <p>페이지를 새로고침해주세요.</p>
          <button type="button" onClick={reset}>
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
