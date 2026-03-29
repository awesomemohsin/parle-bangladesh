"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

type Variation = {
  weight?: string;
  flavor?: string;
  price: number;
  stock?: number;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  weight?: string;
  flavor?: string;
  variations?: Variation[];
  image: string;
  rating: number;
  stock: number;
  description?: string;
};

export default function ProductDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug || "");
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVarIndex, setSelectedVarIndex] = useState<number>(0);

  const selectedVariation = product?.variations?.[selectedVarIndex];
  const displayPrice = selectedVariation ? selectedVariation.price : (product?.price || 0);
  const displayStock = selectedVariation ? (selectedVariation.stock ?? 0) : (product?.stock || 0);

  const handleAddToCart = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      price: displayPrice,
      image: product.image,
      quantity: 1,
      weight: selectedVariation?.weight || product.weight || "",
      flavor: selectedVariation?.flavor || product.flavor || "",
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/shop/checkout");
  };

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`/api/products/${slug}`);
        if (!response.ok) {
          setProduct(null);
          return;
        }

        const data = await response.json();
        setProduct(data.product || null);
      } catch (error) {
        console.error("Failed to load product details:", error);
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      loadProduct();
    }
  }, [slug]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/shop"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Shop
        </Link>

        {isLoading ? (
          <p className="text-gray-600 mt-6">Loading product...</p>
        ) : !product ? (
          <div className="mt-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Product Not Found
            </h1>
            <p className="text-gray-600 mt-2">
              The product you requested does not exist.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="w-full h-80 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-500">Product Image</span>
            </div>

            <div>
              <p className="text-sm uppercase tracking-wide text-blue-700 font-semibold mb-2">
                {product.category}
              </p>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {product.weight && (
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm border border-gray-200">
                    Weight: {product.weight}
                  </span>
                )}
                {product.flavor && (
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-sm border border-gray-200">
                    Flavor: {product.flavor}
                  </span>
                )}
              </div>

              <p className="text-gray-600 mb-6">
                {product.description || "No description available."}
              </p>

              {product.variations && product.variations.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Variation:</h3>
                  <div className="flex flex-col gap-2">
                    {product.variations.map((v, i) => (
                      <button 
                        key={i} 
                        onClick={() => setSelectedVarIndex(i)}
                        className={`p-3 border rounded-lg flex justify-between items-center transition-all ${
                          selectedVarIndex === i 
                            ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600" 
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <div className="text-left">
                          <span className="font-medium text-sm">
                            {[v.weight, v.flavor].filter(Boolean).join(" - ")}
                            {(!v.weight && !v.flavor) && "Original"}
                          </span>
                        </div>
                        <p className={`font-bold ${selectedVarIndex === i ? "text-blue-700" : "text-gray-900"}`}>
                          ৳{v.price.toFixed(2)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mb-8">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-medium">Price</span>
                  <p className="text-4xl font-extrabold text-blue-700">
                    ৳{displayPrice.toFixed(2)}
                  </p>
                </div>
                <div className="pt-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      displayStock > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {displayStock > 0
                      ? `In Stock (${displayStock})`
                      : "Out of Stock"}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  className="flex-1 h-12 text-lg"
                  disabled={displayStock === 0}
                  onClick={handleAddToCart}
                >
                  {displayStock > 0 ? "Add to Cart" : "Out of Stock"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-lg border-blue-600 text-blue-700 hover:bg-blue-50"
                  disabled={displayStock === 0}
                  onClick={handleBuyNow}
                >
                  Buy Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
