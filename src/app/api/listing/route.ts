import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key_for_build" });

export async function POST(req: Request) {
  try {
    const { title, author, isbn, suggestedPrice } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "No title provided" }, { status: 400 });
    }

    const prompt = `
      You are an expert copywriter for an eBay book seller. Write a highly optimized product listing for the following book:
      Title: ${title}
      Author: ${author}
      ISBN: ${isbn || "N/A"}
      Suggested Price: $${suggestedPrice || "N/A"}

      Output the response strictly as a JSON object with the following keys:
      - "listingTitle": A catchy, SEO-optimized title for the eBay listing (MAXIMUM 80 characters).
      - "description": A professional, engaging 2-3 paragraph description for a used book in Good/Very Good condition. Include a call to action.
      - "tags": A comma-separated string of 10 highly relevant search keywords/tags.

      Only return the JSON object, do not use markdown blocks like \`\`\`json.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    });

    let text = response.text || "{}";
    
    if (text.startsWith("```json")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    let listing = {};
    try {
      listing = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", text);
      listing = {
        listingTitle: `${title} by ${author} - Good Condition`,
        description: `This is a used copy of ${title} by ${author}. It is in good overall condition with some minor wear to the cover and pages. Ships quickly and securely!`,
        tags: `${title}, ${author}, book, paperback, hardcover, reading, literature, used book`
      };
    }

    return NextResponse.json(listing);
  } catch (error: any) {
    console.error("Listing generation error:", error);
    // Fallback for UI testing
    return NextResponse.json({
      listingTitle: "Excellent Book - Must Read",
      description: "A great book in very good condition. Perfect for your collection. Order today!",
      tags: "book, reading, fiction, non-fiction"
    });
  }
}
