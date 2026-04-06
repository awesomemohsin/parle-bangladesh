import { getProductBySlug, getProducts, getCategoryBySlug } from "@/lib/data";
import { notFound } from "next/navigation";
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
  return products.map((product) => ({
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
  variationImages.forEach(img => {
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

        <ProductDetailsClient product={serializedProduct} images={images} />

        {/* Product Details Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 lg:p-12 mt-12 relative overflow-hidden border border-gray-100">
          <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 flex items-center justify-center rounded-bl-3xl">
             <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">info</span>
          </div>
          
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="md:w-1/3">
               <h2 className="text-xl font-bold text-gray-900 leading-none mb-4 flex items-center gap-2">
                 <span className="w-6 h-1 bg-black rounded-full"></span> 
                 PRODUCT INFO
               </h2>
               <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-6">Details & Specifications</p>
               
               <div className="grid grid-cols-1 gap-4">
                 <div className="p-4 bg-slate-50/50 rounded-xl border border-gray-50">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Product Code</span>
                    <span className="text-sm font-bold text-gray-900">{product.slug.toUpperCase()}</span>
                 </div>
                 <div className="p-4 bg-slate-50/50 rounded-xl border border-gray-50">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Weight</span>
                    <span className="text-sm font-bold text-gray-900">{product.variations?.[0]?.weight || "N/A"}</span>
                 </div>
               </div>
            </div>

            <div className="md:w-2/3 md:pl-10">
               <div className="prose prose-slate max-w-none">
                 <p className="text-gray-600 font-medium leading-relaxed text-base">
                   {product.description || "High quality Parle product. Guaranteed fresh and delicious for your enjoyment."}
                 </p>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
