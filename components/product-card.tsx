import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  rating: number;
  stock: number;
  weight?: string;
  onAddToCart?: () => void;
}

export default function ProductCard({
  name,
  slug,
  price,
  image,
  rating,
  stock,
  weight,
  onAddToCart,
}: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image Container */}
      <Link href={`/shop/products/${slug}`}>
        <div className="relative w-full h-48 bg-gray-100 overflow-hidden group">
          <div className="w-full h-full bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-400">
            <span className="text-sm">Product Image</span>
          </div>
          {stock === 0 && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-semibold">Out of Stock</span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/shop/products/${slug}`}>
          <h3 className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-2 mb-2">
            {name}
          </h3>
        </Link>
        {weight && (
          <p className="text-sm text-gray-500 mb-2">{weight}</p>
        )}

        {/* Rating */}
        <div className="flex items-center mb-2">
          <div className="text-yellow-400 text-sm">
            {"★".repeat(Math.round(rating))}
            {"☆".repeat(5 - Math.round(rating))}
          </div>
          <span className="text-gray-600 text-xs ml-2">({rating}/5)</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          <p className="text-2xl font-bold text-gray-900">
            ৳{price.toFixed(2)}
          </p>
        </div>

        {/* Button */}
        <Button
          onClick={onAddToCart}
          disabled={stock === 0}
          className="w-full"
          variant={stock > 0 ? "default" : "outline"}
        >
          {stock > 0 ? "Add to Cart" : "Out of Stock"}
        </Button>
      </div>
    </div>
  );
}
