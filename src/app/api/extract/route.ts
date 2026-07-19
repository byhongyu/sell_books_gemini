import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy_key_for_build" });

export async function POST(req: Request) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert base64 data URL to raw base64 string
    const base64Data = image.split(",")[1];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Analyze this image. Identify all the books you can see. Return a JSON array of objects. Each object should have a 'title' (string) and 'author' (string). If you cannot see the author, put 'Unknown'. Only return the JSON array, no markdown formatting." },
            {
              inlineData: {
                data: base64Data,
                mimeType: "image/jpeg",
              }
            }
          ]
        }
      ]
    });

    let text = response.text || "[]";
    
    // Clean up potential markdown formatting from Gemini
    if (text.startsWith("```json")) {
      text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    let books = [];
    try {
      books = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON:", text);
      books = [{ title: "Unknown Book", author: "Unknown" }];
    }

    return NextResponse.json(books);
  } catch (error: any) {
    console.error("Extraction error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
