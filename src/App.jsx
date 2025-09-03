import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Helper Components for Icons ---
const SearchIcon = ({ className = "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);

const BookIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-500 mr-3"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>
);

const SparklesIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9 1.9 5.8 1.9-5.8 5.8-1.9-5.8-1.9z"></path></svg>
);

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"></path></svg>
);

// --- Main App Component ---
export default function App() {
  const [allSlides, setAllSlides] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAutocompleteVisible, setIsAutocompleteVisible] = useState(false);
  
  const [aiQuery, setAiQuery] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [Fuse, setFuse] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const searchWrapperRef = useRef(null);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js';
    script.async = true;
    script.onload = () => setFuse(() => window.Fuse);
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  const fuse = useMemo(() => {
    if (allSlides.length === 0 || !Fuse) return null;
    return new Fuse(allSlides, {
      keys: ['text', 'notes', 'category'],
      includeScore: true,
      includeMatches: true,
      threshold: 0.4,
      minMatchCharLength: 2,
    });
  }, [allSlides, Fuse]);

  // --- NEW: Multi-deck data loading logic ---
  useEffect(() => {
    async function fetchAllDecks() {
      try {
        // 1. Fetch the master list of decks
        const decksResponse = await fetch('/decks.json');
        if (!decksResponse.ok) throw new Error('Could not load decks.json configuration.');
        const decks = await decksResponse.json();

        // 2. Fetch all individual slide decks in parallel
        const slidePromises = decks.map(deck =>
          fetch(`/${deck.fileName}`)
            .then(res => res.ok ? res.json() : Promise.reject(`Failed to load ${deck.fileName}`))
            .then(deckData => {
              const slides = deckData.slides || [];
              return slides.map(slide => ({
                ...slide,
                deckDisplayName: deck.displayName, // Add display name to each slide
                presentationId: deck.presentationId, // Add presentation ID to each slide
              }));
            })
        );

        const slidesByDeck = await Promise.all(slidePromises);
        const combinedSlides = slidesByDeck.flat().map(slide => {
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

        setAllSlides(combinedSlides);
        setResults(combinedSlides.slice(0, 10).map(item => ({ item })));

      } catch (err) {
        console.error("Error loading decks:", err);
        setError(err.message || 'Failed to load slide decks. Check the console for details.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchAllDecks();
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setIsAutocompleteVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchWrapperRef]);

  const handleSearch = (newQuery) => {
    setQuery(newQuery);
    applyFilters(newQuery, selectedCategory);
  };

  const applyFilters = (searchQuery, category) => {
    let filteredSlides = allSlides;
    
    // Filter by category first
    if (category !== 'All') {
      filteredSlides = allSlides.filter(slide => slide.category === category);
    }
    
    if (!searchQuery.trim()) {
      setResults(filteredSlides.slice(0, 10).map(item => ({ item })));
      setSuggestions([]);
      return;
    }
    
    if (fuse) {
      const searchResults = fuse.search(searchQuery, { limit: 50 });
      // If category is selected, filter search results too
      const finalResults = category !== 'All' 
        ? searchResults.filter(result => result.item.category === category)
        : searchResults;
      
      setResults(finalResults);
      const autocompleteSuggestions = finalResults.slice(0, 5).map(res => res.matches[0].value.substring(0, 60) + '...');
      setSuggestions([...new Set(autocompleteSuggestions)]);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    applyFilters(query, category);
  };

  const handleAutocompleteClick = (suggestion) => {
    const cleanSuggestion = suggestion.replace('...', '');
    handleSearch(cleanSuggestion);
    setQuery(cleanSuggestion);
    setIsAutocompleteVisible(false);
  };
  
  const highlightText = (text = '', highlight = '') => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight.split(' ').join('|')})`, 'gi');
    return <span>{text.split(regex).map((part, i) => regex.test(part) ? <mark key={i} className="bg-yellow-200 px-1 rounded-sm">{part}</mark> : part)}</span>;
  };

  const handleAiSearch = async () => {
    if (!aiQuery.trim() || allSlides.length === 0) return;
    setIsAiLoading(true);
    setAiError(null);
    setResults([]);
    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiQuery }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.statusText}`);
      }
      const result = await response.json();
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No content received from AI.");
      
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonResponse = JSON.parse(cleanedText);
      
      if (jsonResponse.relevantSlides && Array.isArray(jsonResponse.relevantSlides)) {
        const relevantSlides = jsonResponse.relevantSlides.map(info => {
            return allSlides.find(slide => 
                slide.slideNumber === info.slideNumber && slide.deckDisplayName === info.deckDisplayName
            );
        }).filter(Boolean); // Filter out any undefined if slide not found
        
        setResults(relevantSlides.map(item => ({ item })));
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      setAiError(err.message || "Failed to get a response from the AI assistant.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-800">
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900">Knowledge Base Search</h1>
          <p className="text-slate-600 mt-2">Instantly search across all your presentations.</p>
        </header>

        <div className="relative mb-8" ref={searchWrapperRef}>
          <SearchIcon />
          <input type="text" value={query} onChange={(e) => handleSearch(e.target.value)} onFocus={() => setIsAutocompleteVisible(true)} placeholder={`Search across ${allSlides.length} slides by content, category, or topic...`} className="w-full pl-12 pr-4 py-3 text-lg border-2 border-slate-300 rounded-full focus:ring-4 focus:ring-blue-200 focus:border-blue-500 outline-none transition-shadow"/>
          {isAutocompleteVisible && suggestions.length > 0 && query.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden">
              <ul>{suggestions.map((s, i) => (<li key={i} onClick={() => handleAutocompleteClick(s)} className="px-4 py-2 hover:bg-slate-100 cursor-pointer text-slate-700">{highlightText(s, query)}</li>))}</ul>
            </div>
          )}
        </div>
        
        <div className="bg-white/60 border border-blue-200 rounded-xl p-5 mb-10 shadow-sm">
             <div className="flex items-center mb-3"><SparklesIcon className="h-6 w-6 text-blue-500 mr-3"/><h2 className="text-xl font-bold text-slate-800">AI Assistant</h2></div>
            <p className="text-slate-600 mb-4 text-sm">Ask a question to find relevant slides from all decks.</p>
            <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} placeholder="e.g., 'show case studies for content marketing'" className="flex-grow pl-4 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-200 outline-none" onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}/>
                <button onClick={handleAiSearch} disabled={isAiLoading || !Fuse} className="bg-blue-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center">
                    {isAiLoading ? (<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>) : 'Find Slides'}
                </button>
            </div>
            {aiError && <p className="text-red-500 text-sm mt-2">{aiError}</p>}
        </div>

        {isLoading && <div className="text-center text-slate-500">Loading knowledge base...</div>}
        {error && <div className="text-center text-red-500 bg-red-100 p-4 rounded-lg">{error}</div>}

        {!isLoading && allSlides.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Category</h3>
            <div className="flex flex-wrap gap-2">
              {['All', ...Array.from(new Set(allSlides.map(slide => slide.category))).sort()].map(category => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {category} ({category === 'All' ? allSlides.length : allSlides.filter(slide => slide.category === category).length})
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {!isAiLoading && results.length > 0 ? (
            <div className="mb-4">
              <p className="text-sm text-slate-600">
                Showing {results.length} result{results.length !== 1 ? 's' : ''}
                {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
                {query ? ` for "${query}"` : ''}
              </p>
            </div>
          ) : null}
          {!isAiLoading && results.length > 0 ? (
            results.map(({ item, score }, idx) => {
                const slideUrl = item.presentationId && !item.presentationId.includes("YOUR_PRESENTATION_ID") ? `https://docs.google.com/presentation/d/${item.presentationId}/edit#slide=id.${item.slideId}` : null;
                return (
                  <div key={`${item.id}-${idx}`} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
                    <div className="flex items-center mb-3">
                      <BookIcon />
                      <h3 className="text-lg font-bold text-slate-900">{item.deckDisplayName} - Slide {item.slideNumber}</h3>
                      <div className="ml-auto flex items-center gap-4">
                        {score && (<span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Match: {((1 - score) * 100).toFixed(0)}%</span>)}
                        {slideUrl && (<a href={slideUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors" title="Open in Google Slides"><LinkIcon/></a>)}
                      </div>
                    </div>
                    {item.content && (<div className="mb-2"><p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Content</p><p className="text-slate-700 whitespace-pre-wrap">{highlightText(item.content, query)}</p></div>)}
                    {item.notes && (<div className="mt-3 pt-3 border-t border-slate-100"><p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p><p className="text-slate-600 italic whitespace-pre-wrap">{highlightText(item.notes, query)}</p></div>)}
                  </div>
                )
            })
          ) : ( !isLoading && !isAiLoading && <p className="text-center text-slate-500 mt-10">No results found.</p>)}
        </div>
      </main>
    </div>
  );
}

