import { getProducts, getCategories } from "@/lib/data";
import ShopClient from "@/components/shop-client";
import { Metadata } from "next";
import { Suspense } from "react";
import { PromoPoster } from "@/lib/models";
import dbConnect from "@/lib/db";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Shop | Parle Bangladesh",
  description: "Browse our premium range of Parle biscuits and snacks. Fast delivery across Bangladesh.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0; // Ensure fresh data on every request

export default async function ShopPage({
  searchParams
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams;
  await dbConnect();
  const [products, categories, promoPosters] = await Promise.all([
    getProducts(),
    getCategories(),
    PromoPoster.find({ isActive: true }).sort({ order: 1 }).lean()
  ]);

  const activeCategory = categories.find((c: any) => c.slug === params.category);
  const pageTitle = activeCategory ? activeCategory.name : "Shop All";
  const pageDescription = activeCategory
    ? activeCategory.description || `Browse our premium range of ${activeCategory.name}.`
    : "Browse our selection of premium Parle biscuits and snacks.";

  // Serialize IDs for client-side usage
  const serializedProducts = products.map((p: any) => ({
    ...JSON.parse(JSON.stringify(p)),
    id: p._id.toString()
  }));

  const serializedCategories = categories.map((c: any) => ({
    ...JSON.parse(JSON.stringify(c)),
    id: c._id.toString()
  }));

  const serializedPromos = promoPosters.map((p: any) => ({
    _id: p._id.toString(),
    imageUrl: p.imageUrl,
    link: p.link,
    altText: p.altText,
    isActive: p.isActive,
    placement: p.placement || 'slider',
    buttonText: p.buttonText || 'Shop Now'
  }));

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-red-100 selection:text-red-900">
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-16 lg:pt-8 lg:pb-24">
        {/* Primary Header Layer */}
        <div key={activeCategory?.slug || 'all'} className="relative w-full h-[180px] md:h-[220px] rounded-[2rem] overflow-hidden mb-6 flex bg-slate-50 shadow-xl border border-slate-100 group animate-in fade-in duration-700">
          {/* Right Image Container - Expanded to 2/3 width */}
          <div className="absolute inset-y-0 right-0 w-2/3 md:w-[65%] flex items-center justify-end pr-3 md:pr-8 pointer-events-none">
            {/* The scaling wrapper with right-side origin to push growth inward */}
            <div className="relative w-full h-full flex items-center justify-end transition-transform duration-1000 group-hover:scale-[1.04] origin-right">
              <Image
                src={activeCategory?.image || (activeCategory ? `/images/${activeCategory.slug}/${activeCategory.slug}-cover.webp` : "/images/parle-cover.webp")}
                alt={pageTitle}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 66vw"
                className="object-contain object-right opacity-95 drop-shadow-2xl scale-[1.2] md:scale-[1.4] origin-right"
              />
            </div>
          </div>

          {/* Left Text Container - Restricted safely to 1/3 */}
          <div className="relative z-10 flex flex-col items-start justify-center text-left px-6 md:px-12 w-[70%] md:w-[45%] lg:w-[40%] h-full bg-gradient-to-r from-slate-50 via-slate-50/90 to-transparent pointer-events-none">
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-3 italic drop-shadow-sm whitespace-nowrap">
              {pageTitle}
            </h1>
            <p className="text-[10px] md:text-sm text-gray-500 font-bold max-w-[200px] md:max-w-[280px] leading-relaxed uppercase tracking-widest line-clamp-2">
              {pageDescription}
            </p>
          </div>
        </div>

        <Suspense fallback={<div>Loading shop...</div>}>
          <ShopClient
            initialProducts={serializedProducts}
            categories={serializedCategories}
            promoPosters={serializedPromos}
          />
        </Suspense>
      </main>
    </div>
  );
}
