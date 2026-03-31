import { getProducts, getCategories } from "@/lib/data";
import ShopClient from "@/components/shop-client";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Shop | Parle Bangladesh",
  description: "Browse our premium range of Parle biscuits and snacks. Fast delivery across Bangladesh.",
};

export const revalidate = 60; // Refresh data every minute

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);

  // Serialize IDs for client-side usage
  const serializedProducts = products.map((p: any) => ({
    ...JSON.parse(JSON.stringify(p)),
    id: p._id.toString()
  }));

  const serializedCategories = categories.map((c: any) => ({
    ...JSON.parse(JSON.stringify(c)),
    id: c._id.toString()
  }));

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-red-100 selection:text-red-900">
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* Primary Header Layer */}
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-4 animate-fade-in">
             <span className="w-8 h-1 bg-red-600 rounded-full"></span>
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Our Products</span>
             <span className="w-8 h-1 bg-red-600 rounded-full"></span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 uppercase tracking-tight leading-none mb-4">
            Shop All
          </h1>
          <p className="text-base text-gray-500 font-medium max-w-xl leading-relaxed">
            Browse our selection of premium Parle biscuits and snacks.
          </p>
        </div>

        <Suspense fallback={<div>Loading shop...</div>}>
          <ShopClient 
            initialProducts={serializedProducts} 
            categories={serializedCategories} 
          />
        </Suspense>
      </main>
    </div>
  );
}
