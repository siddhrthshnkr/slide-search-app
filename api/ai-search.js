import path from 'path';
import fs from 'fs/promises';

// --- NEW: Helper function to load all slide data from the public directory ---
async function loadAllSlideData() {
  const publicDir = path.join(process.cwd(), 'public');
  
  // 1. Read the master deck configuration file
  const decksConfigFile = await fs.readFile(path.join(publicDir, 'decks.json'), 'utf8');
  const decks = JSON.parse(decksConfigFile);

  // 2. Read each individual slide deck file
  const allSlidesPromises = decks.map(async (deck) => {
    const filePath = path.join(publicDir, deck.fileName);
    const fileContents = await fs.readFile(filePath, 'utf8');
    const deckData = JSON.parse(fileContents);
    
    // 3. Extract slides array and augment each slide with deck info
    const slides = deckData.slides || [];
    return slides.map(slide => ({
      ...slide,
      deckDisplayName: deck.displayName,
      presentationId: deck.presentationId
    }));
  });

  const slidesByDeck = await Promise.all(allSlidesPromises);
  const combinedSlides = slidesByDeck.flat();
  
  // Extract text from elements and add categories
  return combinedSlides.map(slide => {
    // Extract text from all elements
    const extractedText = slide.elements
      ? slide.elements
          .filter(element => element.text && element.text.trim())
          .map(element => element.text)
          .join(' ')
      : '';
    
    // Simple category detection based on content
    const categorizeSlide = (text, notes) => {
      const content = (text + ' ' + (notes || '')).toLowerCase();
      if (content.includes('pricing') || content.includes('cost') || content.includes('$') || content.includes('price')) return 'Pricing';
      if (content.includes('feature') || content.includes('capability') || content.includes('functionality')) return 'Features';
      if (content.includes('case study') || content.includes('client') || content.includes('customer') || content.includes('testimonial')) return 'Case Studies';
      if (content.includes('demo') || content.includes('example') || content.includes('showcase')) return 'Demos';
      if (content.includes('contact') || content.includes('email') || content.includes('phone') || content.includes('@')) return 'Contact';
      if (content.includes('problem') || content.includes('solution') || content.includes('challenge')) return 'Solutions';
      if (content.includes('benefit') || content.includes('advantage') || content.includes('roi')) return 'Benefits';
      if (content.includes('team') || content.includes('about') || content.includes('company')) return 'About Us';
      return 'General';
    };

    return {
      ...slide,
      text: extractedText,
      category: categorizeSlide(extractedText, slide.notes)
    };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { aiQuery } = req.body;
    if (!aiQuery || typeof aiQuery !== 'string') {
      return res.status(400).json({ error: 'AI query is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set on the server.');
      return res.status(500).json({ error: 'Server configuration error.' });
    }

    // Load all slide data from all decks
    const allSlides = await loadAllSlideData();
    
    // --- NEW: Updated system prompt for enhanced search ---
    const systemPrompt = `You are an intelligent presentation assistant. The user will provide a query. Your task is to analyze the following JSON data which contains slides from MULTIPLE presentations and identify the slides that are most relevant to the user's query.

Each slide now has:
- text: extracted content from all slide elements
- category: automatically detected category (Pricing, Features, Case Studies, etc.)
- notes: speaker notes
- deckDisplayName: the presentation deck name
- slideNumber: the slide number

Respond with ONLY a JSON object containing a single key "relevantSlides". This key should hold an array of objects, where each object has two keys: "slideNumber" (the number of the relevant slide) and "deckDisplayName" (the name of the deck the slide belongs to).

Prioritize slides based on:
1. Direct text content matches
2. Category relevance to the query
3. Context from notes

It is crucial that you identify the correct source deck for each slide.

Do not add any explanation or introductory text. Only the JSON object is required. If no slides are relevant, return an empty array.

Example response: {"relevantSlides": [{"slideNumber": 15, "deckDisplayName": "Master Sales Deck"}, {"slideNumber": 8, "deckDisplayName": "Global Case Studies"}]}`;
    
    const userPrompt = `User Query: "${aiQuery}"\n\nAll Slide Data:\n${JSON.stringify(allSlides.map(slide => ({ 
      slideNumber: slide.slideNumber, 
      deckDisplayName: slide.deckDisplayName, 
      text: slide.text, 
      category: slide.category, 
      notes: slide.notes 
    })))}`;
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        }),
    });

    if (!geminiResponse.ok) {
      const errorBody = await geminiResponse.text();
      console.error("Gemini API Error:", errorBody);
      throw new Error(`Gemini API responded with status: ${geminiResponse.status}`);
    }

    const result = await geminiResponse.json();
    res.status(200).json(result);

  } catch (error) {
    console.error('Error in /api/ai-search:', error);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
}

