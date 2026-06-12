import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="text-sm font-bold text-[#0b6b43]">404</p>
      <h1 className="mt-3 text-3xl font-extrabold text-[#16231d]">페이지를 찾을 수 없습니다</h1>
      <p className="mt-4 text-[#647067]">지역 또는 카테고리 주소가 바뀌었을 수 있습니다.</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-[#0b6b43] px-5 text-sm font-bold text-white"
      >
        홈으로 이동
      </Link>
    </main>
  );
}
