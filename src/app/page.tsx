import BookScanner from "@/components/BookScanner";

export default function Home() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white p-4 font-sans">
      <div className="max-w-4xl mx-auto py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Book Selling Assistant
          </h1>
          <p className="text-neutral-400 mt-2">
            Snap photos of your books, get prices, and list them with ease.
          </p>
        </header>

        <BookScanner />
      </div>
    </main>
  );
}
