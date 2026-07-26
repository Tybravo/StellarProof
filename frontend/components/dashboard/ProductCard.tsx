"use client";

import { DigitalProduct } from "@/services/productMock";
import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  product: DigitalProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-darkblue shadow-sm hover:shadow-md transition-all">
      <div className="relative h-48 w-full">
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {product.name}
        </h3>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {product.description}
        </p>

        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-medium">Creator:</span> {product.creator}
          </p>

          <p>
            <span className="font-medium">Status:</span>{" "}
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                product.status === "verified"
                  ? "bg-green-100 text-green-700"
                  : product.status === "pending"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
              }`}
            >
              {product.status}
            </span>
          </p>

          <p>
            <span className="font-medium">Created:</span>{" "}
            {new Date(product.createdAt).toLocaleDateString()}
          </p>
        </div>

        <Link
          href={`/product/${product.id}`}
          className="mt-5 block w-full rounded-lg bg-primary py-2 text-center text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
