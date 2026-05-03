import { getProductBySlug, getProducts, getCategoryBySlug } from "@/lib/data";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductDetailsClient from "@/components/product-details-client";
import { Metadata } from "next";
import Link from "next/link";
import { sanitizeProductImagePath } from "@/lib/utils";

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  
  if (!product) {
    return {
      title: "Product Not Found | Parle Bangladesh",
    };
  }

  const defaultVariation = product.variations?.find((v: any) => v.isDefault) || product.variations?.[0];
  const mainImage = sanitizeProductImagePath(defaultVariation?.image || "");

  return {
    title: `${product.name} | Parle Bangladesh`,
    description: product.description || `Premium Parle product: ${product.name}`,
    openGraph: {
      title: `${product.name} | Parle Bangladesh`,
      description: product.description,
      images: [mainImage],
    }
  };
}

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product: any) => ({
    slug: product.slug,
  }));
}

export default async function ProductDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Fetch category to get name (if slug is different from name or to ensure formatting)
  const category = await getCategoryBySlug(product.category);

  // Serialize product for client component (handling _id as string)
  const serializedProduct = {
    ...JSON.parse(JSON.stringify(product)),
    id: product._id?.toString() || ""
  };

  const variationImages = product.variations?.map((v: any) => v.image).filter(Boolean) || [];
  
  // Robust image deduplication: normalize and sanitize paths
  const uniqueImagesMap = new Map();
  variationImages.forEach((img: any) => {
    if (img) {
      const sanitized = sanitizeProductImagePath(img);
      if (!uniqueImagesMap.has(sanitized)) {
        uniqueImagesMap.set(sanitized, sanitized);
      }
    }
  });
  
  const images = Array.from(uniqueImagesMap.values());

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb / Navigation Context */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <span className="w-1 h-5 bg-red-600 rounded-full"></span>
             <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none flex items-center gap-1">
               <Link href="/shop" className="hover:text-red-600 transition-colors">Shop</Link>
               <span className="text-gray-300">/</span>
               <Link 
                href={`/shop?category=${product.category}`} 
                className="hover:text-red-600 transition-colors"
               >
                 {category?.name || product.category}
               </Link>
             </h2>
          </div>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center py-32 bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Loading Product Details...</p>
            </div>
          </div>
        }>
          <ProductDetailsClient product={serializedProduct} images={images} />
        </Suspense>
      </main>
    </div>
  );
}
