import { getProductBySlug, getProducts } from "@/lib/data";
import { notFound } from "next/navigation";
import ProductDetailsClient from "@/components/product-details-client";
import { Metadata } from "next";

export const revalidate = 60; // ISR: Revalidate every 60 seconds

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  
  if (!product) {
    return {
      title: "Product Not Found | Parle Bangladesh",
    };
  }

  return {
    title: `${product.name} | Parle Bangladesh`,
    description: product.description || `Premium Parle product: ${product.name}`,
    openGraph: {
      title: `${product.name} | Parle Bangladesh`,
      description: product.description,
      images: [product.image || ""],
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

  // Serialize product for client component (handling _id as string)
  const serializedProduct = {
    ...JSON.parse(JSON.stringify(product)),
    id: product._id?.toString() || ""
  };

  const images = [product.image, ...(product.images || [])].filter(Boolean);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb / Navigation Context */}
        <div className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <span className="w-1.5 h-6 bg-red-600"></span>
             <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">Global Logistics Center / {product.category}</h2>
          </div>
        </div>

        <ProductDetailsClient product={serializedProduct} images={images} />

        {/* Product Technical Specifications / Intelligence Layer */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 lg:p-16 mt-16 relative overflow-hidden border border-gray-100">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-bl-full flex items-center justify-center p-4">
             <span className="text-[10px] font-black text-gray-200 uppercase rotate-45 select-none translate-x-3 translate-y-[-10px] tracking-widest">TECHNICAL LOGS</span>
          </div>
          
          <div className="flex flex-col md:flex-row gap-12 items-start">
            <div className="md:w-1/3">
               <h2 className="text-2xl font-black text-gray-900 leading-none tracking-tighter mb-4 flex items-center gap-3">
                 <span className="w-8 h-1 bg-black"></span> 
                 PRODUCT INTEL
               </h2>
               <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">System Manifest & Description</p>
               
               <div className="grid grid-cols-1 gap-6">
                 <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Stocking SKU</span>
                    <span className="text-sm font-bold text-gray-900">{product.slug.toUpperCase()}</span>
                 </div>
                 <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Global Weight</span>
                    <span className="text-sm font-bold text-gray-900">{product.variations?.[0]?.weight || "N/A"}</span>
                 </div>
               </div>
            </div>

            <div className="md:w-2/3 border-l-0 md:border-l-4 md:border-gray-50 md:pl-12">
               <div className="prose prose-lg max-w-none">
                 <p className="text-gray-500 font-medium leading-[1.8] text-lg">
                   {product.description || "The requested item is part of Parle Bangladesh's premium inventory. Our quality assurance team maintains high-level standards for every unit dispatched to our redistribution points."}
                 </p>
               </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
