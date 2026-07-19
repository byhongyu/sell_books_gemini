"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Loader2, BookOpen, DollarSign, Tag, RefreshCw, Copy, ExternalLink, X, Check } from "lucide-react";

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
    isMock?: {
      amazon: boolean;
      ebay: boolean;
      buyback: boolean;
    };
  };
};

export default function BookScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [books, setBooks] = useState<ScannedBook[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listing Modal State
  const [listingBook, setListingBook] = useState<ScannedBook | null>(null);
  const [listingContent, setListingContent] = useState<{ listingTitle: string, description: string, tags: string } | null>(null);
  const [isGeneratingListing, setIsGeneratingListing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleListNow = async (book: ScannedBook) => {
    setListingBook(book);
    setListingContent(null);
    setIsGeneratingListing(true);
    
    try {
      const res = await fetch("/api/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          suggestedPrice: book.suggestedPrice
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setListingContent(data);
      }
    } catch (err) {
      console.error("Failed to generate listing:", err);
    } finally {
      setIsGeneratingListing(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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
                        {book.prices?.buyback !== undefined 
                          ? `$${book.prices.buyback.toFixed(2)}${book.prices.isMock?.buyback ? ' (Mock)' : ''}` 
                          : "Checking..."}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">eBay Avg Price</span>
                      <span className="font-semibold text-white">
                        {book.prices?.ebay !== undefined 
                          ? `$${book.prices.ebay.toFixed(2)}${book.prices.isMock?.ebay ? ' (Mock)' : ''}` 
                          : "Checking..."}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-neutral-400">Amazon Marketplace</span>
                      <span className="font-semibold text-white">
                        {book.prices?.amazon !== undefined 
                          ? `$${book.prices.amazon.toFixed(2)}${book.prices.isMock?.amazon ? ' (Mock)' : ''}` 
                          : "Checking..."}
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

      {/* Listing Automation Modal */}
      {listingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Tag className="text-blue-400 w-6 h-6" /> 
                Automate Listing for "{listingBook.title}"
              </h3>
              <button onClick={() => setListingBook(null)} className="p-2 hover:bg-neutral-800 rounded-full transition-colors text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex-grow">
              {isGeneratingListing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin mb-4" />
                  <p className="text-lg text-neutral-300">AI is writing your optimized listing...</p>
                  <p className="text-sm text-neutral-500 mt-2">Analyzing title, author, and market trends...</p>
                </div>
              ) : listingContent ? (
                <div className="space-y-6">
                  {/* Title Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-neutral-400">Optimized Title (max 80 chars)</label>
                      <button 
                        onClick={() => copyToClipboard(listingContent.listingTitle, 'title')}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {copiedField === 'title' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'title' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-lg text-white font-medium">
                      {listingContent.listingTitle}
                    </div>
                  </div>

                  {/* Description Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-neutral-400">Professional Description</label>
                      <button 
                        onClick={() => copyToClipboard(listingContent.description, 'description')}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {copiedField === 'description' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'description' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-lg text-white text-sm whitespace-pre-wrap">
                      {listingContent.description}
                    </div>
                  </div>

                  {/* Tags Field */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-neutral-400">Search Tags</label>
                      <button 
                        onClick={() => copyToClipboard(listingContent.tags, 'tags')}
                        className="text-xs flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {copiedField === 'tags' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'tags' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-lg text-white text-sm">
                      {listingContent.tags}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="py-12 text-center text-red-400">
                  Failed to generate listing. Please try again.
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 sticky bottom-0 space-y-3">
              <a 
                href={`https://sellercentral.amazon.com/product-search/search?q=${encodeURIComponent(listingBook.isbn || listingContent?.listingTitle || listingBook.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
                  listingContent ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-lg shadow-amber-900/20' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed pointer-events-none'
                }`}
              >
                Continue to Amazon Marketplace
                <ExternalLink className="w-5 h-5" />
              </a>
              <a 
                href={`https://www.ebay.com/sl/prelist/suggest?sr=SellHub&kw=${encodeURIComponent(listingContent?.listingTitle || listingBook.title)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
                  listingContent ? 'bg-neutral-800 hover:bg-neutral-700 text-white' : 'bg-neutral-800 text-neutral-500 cursor-not-allowed pointer-events-none'
                }`}
              >
                Continue to eBay
                <ExternalLink className="w-5 h-5" />
              </a>
              <p className="text-xs text-center text-neutral-500 pt-2">
                Clicking a link will open the marketplace in a new tab. Paste your copied description there!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
