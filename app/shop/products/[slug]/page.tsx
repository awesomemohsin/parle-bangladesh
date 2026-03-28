"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";

type Product = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  stock: number;
  description?: string;
};

export default function ProductDetailsPage() {
  const params = useParams();
  const slug = String(params.slug || "");
  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {product.name}
              </h1>
              <p className="text-gray-600 mb-4">
                {product.description || "No description available."}
              </p>

              <div className="flex items-center gap-4 mb-6">
                <p className="text-3xl font-bold text-gray-900">
                  ৳{product.price.toFixed(2)}
                </p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    product.stock > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {product.stock > 0
                    ? `In Stock (${product.stock})`
                    : "Out of Stock"}
                </span>
              </div>

              <Button
                disabled={product.stock === 0}
                onClick={() =>
                  addItem({
                    productId: product.id,
                    productSlug: product.slug,
                    productName: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: 1,
                  })
                }
              >
                {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
              </Button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
