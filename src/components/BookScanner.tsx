"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, BookOpen, DollarSign, Tag, RefreshCw } from "lucide-react";

type ScannedBook = {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  condition?: string;
  suggestedPrice?: number;
  prices?: {
    amazon?: number;
    ebay?: number;
    buyback?: number;
  };
};

export default function BookScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [books, setBooks] = useState<ScannedBook[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        processImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64Image: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      // Step 1: Extract Books using Gemini Vision API
      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Image }),
      });

      if (!extractRes.ok) throw new Error("Failed to extract books from image.");
      
      const extractedBooks = await extractRes.json();
      setBooks(extractedBooks.map((b: any, i: number) => ({ ...b, id: i.toString() })));

      // Step 2: For each book, fetch pricing info
      await Promise.all(
        extractedBooks.map(async (book: any, i: number) => {
          try {
            const priceRes = await fetch("/api/price", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title: book.title, author: book.author }),
            });
            if (priceRes.ok) {
              const priceData = await priceRes.json();
              setBooks((prev) =>
                prev.map((b) =>
                  b.id === i.toString()
                    ? { ...b, isbn: priceData.isbn, prices: priceData.prices, suggestedPrice: priceData.suggestedPrice }
                    : b
                )
              );
            }
          } catch (err) {
            console.error("Error fetching price for", book.title, err);
          }
        })
      );
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleListNow = (book: ScannedBook) => {
    alert(`Listing functionality triggered for ${book.title}. (Would open automation script)`);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Upload/Camera Section */}
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl text-center">
        {image ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-6 bg-neutral-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Scanned books" className="object-cover w-full h-full opacity-80" />
            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                <p className="text-lg font-medium text-white">Analyzing books & fetching prices...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6">
            <div className="w-24 h-24 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-neutral-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Capture Book Covers or Spines</h3>
            <p className="text-neutral-500 mb-6">Take a photo of a single book or a whole stack to begin.</p>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          className="hidden"
          onChange={handleImageCapture}
        />

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white px-6 py-3 rounded-lg font-medium shadow-lg shadow-blue-900/20"
          >
            {image ? <RefreshCw className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            {image ? "Retake Photo" : "Take Photo"}
          </button>
          {!image && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 transition-colors text-white px-6 py-3 rounded-lg font-medium"
            >
              <Upload className="w-5 h-5" />
              Upload Image
            </button>
          )}
        </div>
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>

      {/* Results Section */}
      {books.length > 0 && (
        <div className="w-full mt-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-400" />
            Identified Books ({books.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {books.map((book) => (
              <div key={book.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 line-clamp-2">{book.title}</h3>
                  <p className="text-neutral-400 mb-4">{book.author}</p>
                  
                  {book.isbn && (
                    <div className="text-xs bg-neutral-800 px-3 py-1 rounded-full w-fit mb-4 text-neutral-300">
                      ISBN: {book.isbn}
                    </div>
                  )}

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">Buyback Offer (BookScouter)</span>
                      <span className="font-semibold text-white">
                        {book.prices?.buyback !== undefined ? `$${book.prices.buyback.toFixed(2)}` : "Checking..."}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">eBay Avg Price</span>
                      <span className="font-semibold text-white">
                        {book.prices?.ebay !== undefined ? `$${book.prices.ebay.toFixed(2)}` : "Checking..."}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">Amazon Marketplace</span>
                      <span className="font-semibold text-white">
                        {book.prices?.amazon !== undefined ? `$${book.prices.amazon.toFixed(2)}` : "Checking..."}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-4 mb-4">
                    <p className="text-emerald-400 text-sm font-medium mb-1">Suggested Selling Price</p>
                    <p className="text-3xl font-bold text-white">
                      {book.suggestedPrice !== undefined ? `$${book.suggestedPrice.toFixed(2)}` : "..."}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => handleListNow(book)}
                    disabled={!book.suggestedPrice}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-neutral-200 transition-colors px-4 py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Tag className="w-5 h-5" />
                    Automate Listing
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
