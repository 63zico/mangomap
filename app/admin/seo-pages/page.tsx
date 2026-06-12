import type { Metadata } from "next";

import { SeoPagesAdmin } from "@/components/seo-pages-admin";

export const metadata: Metadata = {
  title: "SEO Pages Admin | Mango Vietnam",
  description: "Generated SEO landing page quality control dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SeoPagesAdminPage() {
  return (
    <main className="bg-[#f4f5f7] px-4 py-10 text-neutral-950 md:px-8 lg:px-12">
      <div className="mx-auto max-w-[1680px]">
        <SeoPagesAdmin />
      </div>
    </main>
  );
}
