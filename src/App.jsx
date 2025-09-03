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
  const [selectedDeck, setSelectedDeck] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedOffice, setSelectedOffice] = useState('All');
  const [selectedClient, setSelectedClient] = useState('All');
  const [selectedBusinessType, setSelectedBusinessType] = useState('All');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [expandedSlides, setExpandedSlides] = useState(new Set());
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
      keys: [
        { name: 'enrichedText', weight: 0.5 },
        { name: 'text', weight: 0.3 },
        { name: 'client', weight: 0.2 },
        { name: 'industry', weight: 0.15 },
        { name: 'category', weight: 0.1 },
        { name: 'indexService', weight: 0.1 },
        { name: 'businessType', weight: 0.1 },
        { name: 'office', weight: 0.05 },
        { name: 'deckDisplayName', weight: 0.05 },
        { name: 'notes', weight: 0.05 }
      ],
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

        // 2. Load index data for global case studies if available
        let indexData = null;
        try {
          const indexResponse = await fetch('/global-case-studies-index.json');
          if (indexResponse.ok) {
            indexData = await indexResponse.json();
          }
        } catch (err) {
          console.log('No index file found, proceeding without index data');
        }

        // 3. Fetch all individual slide decks in parallel
        const slidePromises = decks.map(deck =>
          fetch(`/${deck.fileName}`)
            .then(res => res.ok ? res.json() : Promise.reject(`Failed to load ${deck.fileName}`))
            .then(deckData => {
              const slides = deckData.slides || [];
              return slides.map(slide => {
                // Find corresponding index data for this slide
                let slideIndex = null;
                if (indexData && deck.fileName === 'global-case-studies.json') {
                  slideIndex = indexData.find(index => index.slide_number === slide.slideNumber);
                }
                
                return {
                  ...slide,
                  deckDisplayName: deck.displayName,
                  presentationId: deck.presentationId,
                  // Add index metadata if available
                  ...(slideIndex && {
                    office: slideIndex.office,
                    client: slideIndex.client,
                    indexService: slideIndex.service, // Rename to avoid conflict with extracted services
                    businessType: slideIndex.type,
                    industry: slideIndex.industry,
                    indexNotes: slideIndex.notes
                  })
                };
              });
            })
        );

        const slidesByDeck = await Promise.all(slidePromises);
        const combinedSlides = slidesByDeck.flat().map(slide => {
          // Extract text from all elements with better structure
          const textElements = slide.elements
            ? slide.elements.filter(element => element.text && element.text.trim() && element.text !== '')
            : [];
          
          const extractedText = textElements.map(element => element.text).join(' ');
          
          // Enhanced categorization with index data integration
          const categorizeSlide = (text, notes, deckName, elements, indexData) => {
            const content = (text + ' ' + (notes || '') + ' ' + deckName).toLowerCase();
            
            // Use index data for more accurate categorization if available
            if (indexData) {
              if (indexData.businessType === 'eCommerce') return 'eCommerce';
              if (indexData.businessType === 'Lead Generation') return 'Lead Generation';
              if (indexData.industry && indexData.industry.toLowerCase().includes('case stud')) return 'Case Studies';
            }
            
            // Deck-based categorization
            if (deckName.toLowerCase().includes('case stud')) return 'Case Studies';
            if (deckName.toLowerCase().includes('sales')) {
              if (content.includes('pricing') || content.includes('cost') || content.includes('$') || content.includes('price')) return 'Pricing';
              if (content.includes('contact') || content.includes('email') || content.includes('phone') || content.includes('@')) return 'Contact';
            }
            
            // Content-based categorization
            if (content.includes('case stud') || content.includes('client') || content.includes('customer') || content.includes('testimonial') || content.includes('result') || content.includes('success')) return 'Case Studies';
            if (content.includes('pricing') || content.includes('cost') || content.includes('$') || content.includes('price') || content.includes('plan') || content.includes('subscription')) return 'Pricing';
            if (content.includes('feature') || content.includes('capability') || content.includes('functionality') || content.includes('benefit')) return 'Features';
            if (content.includes('demo') || content.includes('example') || content.includes('showcase') || content.includes('overview')) return 'Demos';
            if (content.includes('contact') || content.includes('email') || content.includes('phone') || content.includes('@') || content.includes('reach') || content.includes('get in touch')) return 'Contact';
            if (content.includes('problem') || content.includes('solution') || content.includes('challenge') || content.includes('solve')) return 'Solutions';
            if (content.includes('team') || content.includes('about') || content.includes('company') || content.includes('founder')) return 'About Us';
            if (content.includes('index') || content.includes('table of content') || content.includes('overview')) return 'Navigation';
            
            // Special handling for metrics and data
            const hasMetrics = elements && elements.some(el => 
              el.text && /\d+/.test(el.text) && (el.text.includes('%') || el.text.includes('rating') || el.text.includes('month'))
            );
            if (hasMetrics) return 'Metrics & Results';
            
            return 'General';
          };
          
          // Extract key metrics and structured data
          const extractMetrics = (elements) => {
            if (!elements) return [];
            return elements
              .filter(el => el.text && /\d+/.test(el.text))
              .map(el => ({ text: el.text, type: el.type }))
              .slice(0, 3); // Limit to top 3 metrics
          };
          
          // Extract services from case studies
          const extractServices = (elements) => {
            if (!elements) return [];
            const servicesText = elements.find(el => el.text && el.text.includes('Services Used:'))?.text;
            if (!servicesText) return [];
            
            const servicesString = servicesText.replace('Services Used:', '').trim();
            return servicesString.split(/[|,&]/).map(s => s.trim()).filter(s => s);
          };
          
          // Create enriched text for better searchability
          const enrichText = (baseText, slide) => {
            let enriched = baseText;
            if (slide.client) enriched += ` ${slide.client}`;
            if (slide.industry) enriched += ` ${slide.industry}`;
            if (slide.indexService) enriched += ` ${slide.indexService}`;
            if (slide.businessType) enriched += ` ${slide.businessType}`;
            if (slide.office) enriched += ` ${slide.office}`;
            return enriched;
          };

          const enrichedText = enrichText(extractedText, slide);
          
          // Create a more structured slide object
          const enhancedSlide = {
            ...slide,
            text: extractedText,
            enrichedText: enrichedText, // For search purposes
            category: categorizeSlide(extractedText, slide.notes, slide.deckDisplayName, slide.elements, slide),
            metrics: extractMetrics(slide.elements),
            services: extractServices(slide.elements),
            elementCount: textElements.length,
            hasImages: slide.elements ? slide.elements.some(el => el.type === 'IMAGE') : false,
            hasTables: slide.elements ? slide.elements.some(el => el.type === 'TABLE') : false
          };
          
          return enhancedSlide;
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
    applyFilters(newQuery, selectedCategory, selectedDeck, selectedService, selectedOffice, selectedClient, selectedBusinessType, selectedIndustry);
  };

  const applyFilters = (searchQuery, category, deck, service, office, client, businessType, industry) => {
    let filteredSlides = allSlides;
    
    // Apply all filters
    if (category !== 'All') {
      filteredSlides = filteredSlides.filter(slide => slide.category === category);
    }
    if (deck !== 'All') {
      filteredSlides = filteredSlides.filter(slide => slide.deckDisplayName === deck);
    }
    if (service !== 'All') {
      filteredSlides = filteredSlides.filter(slide => slide.services && slide.services.includes(service));
    }
    if (office !== 'All') {
      filteredSlides = filteredSlides.filter(slide => slide.office === office);
    }
    if (client !== 'All') {
      filteredSlides = filteredSlides.filter(slide => slide.client === client);
    }
    if (businessType !== 'All') {
      filteredSlides = filteredSlides.filter(slide => slide.businessType === businessType);
    }
    if (industry !== 'All') {
      filteredSlides = filteredSlides.filter(slide => slide.industry && slide.industry.toLowerCase().includes(industry.toLowerCase()));
    }
    
    if (!searchQuery.trim()) {
      setResults(filteredSlides.slice(0, 10).map(item => ({ item })));
      setSuggestions([]);
      return;
    }
    
    if (fuse) {
      const searchResults = fuse.search(searchQuery, { limit: 50 });
      // Apply filters to search results
      let finalResults = searchResults;
      
      if (category !== 'All') {
        finalResults = finalResults.filter(result => result.item.category === category);
      }
      if (deck !== 'All') {
        finalResults = finalResults.filter(result => result.item.deckDisplayName === deck);
      }
      if (service !== 'All') {
        finalResults = finalResults.filter(result => result.item.services && result.item.services.includes(service));
      }
      if (office !== 'All') {
        finalResults = finalResults.filter(result => result.item.office === office);
      }
      if (client !== 'All') {
        finalResults = finalResults.filter(result => result.item.client === client);
      }
      if (businessType !== 'All') {
        finalResults = finalResults.filter(result => result.item.businessType === businessType);
      }
      if (industry !== 'All') {
        finalResults = finalResults.filter(result => result.item.industry && result.item.industry.toLowerCase().includes(industry.toLowerCase()));
      }
      
      setResults(finalResults);
      const autocompleteSuggestions = finalResults.slice(0, 5).map(res => res.matches[0].value.substring(0, 60) + '...');
      setSuggestions([...new Set(autocompleteSuggestions)]);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    applyFilters(query, category, selectedDeck, selectedService, selectedOffice, selectedClient, selectedBusinessType, selectedIndustry);
  };
  
  const handleDeckChange = (deck) => {
    setSelectedDeck(deck);
    applyFilters(query, selectedCategory, deck, selectedService, selectedOffice, selectedClient, selectedBusinessType, selectedIndustry);
  };
  
  const handleServiceChange = (service) => {
    setSelectedService(service);
    applyFilters(query, selectedCategory, selectedDeck, service, selectedOffice, selectedClient, selectedBusinessType, selectedIndustry);
  };
  
  const handleOfficeChange = (office) => {
    setSelectedOffice(office);
    applyFilters(query, selectedCategory, selectedDeck, selectedService, office, selectedClient, selectedBusinessType, selectedIndustry);
  };
  
  const handleClientChange = (client) => {
    setSelectedClient(client);
    applyFilters(query, selectedCategory, selectedDeck, selectedService, selectedOffice, client, selectedBusinessType, selectedIndustry);
  };
  
  const handleBusinessTypeChange = (businessType) => {
    setSelectedBusinessType(businessType);
    applyFilters(query, selectedCategory, selectedDeck, selectedService, selectedOffice, selectedClient, businessType, selectedIndustry);
  };
  
  const handleIndustryChange = (industry) => {
    setSelectedIndustry(industry);
    applyFilters(query, selectedCategory, selectedDeck, selectedService, selectedOffice, selectedClient, selectedBusinessType, industry);
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

  const summarizeText = (text, maxLength = 200) => {
    if (!text || text.length <= maxLength) return text;
    
    // Try to break at sentence boundaries
    const sentences = text.split(/[.!?]+/);
    let summary = sentences[0];
    
    for (let i = 1; i < sentences.length; i++) {
      if ((summary + sentences[i]).length > maxLength) break;
      summary += sentences[i] + (sentences[i].match(/[.!?]$/) ? '' : '.');
    }
    
    return summary.trim() + (summary.length < text.length ? '...' : '');
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
          <div className="mb-8 space-y-6">
            {/* Deck Filter */}
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Deck</h3>
              <div className="flex flex-wrap gap-2">
                {['All', ...Array.from(new Set(allSlides.map(slide => slide.deckDisplayName))).sort()].map(deck => (
                  <button
                    key={deck}
                    onClick={() => handleDeckChange(deck)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      selectedDeck === deck
                        ? 'bg-green-600 text-white'
                        : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                    }`}
                  >
                    {deck} ({deck === 'All' ? allSlides.length : allSlides.filter(slide => slide.deckDisplayName === deck).length})
                  </button>
                ))}
              </div>
            </div>
            
            {/* Category Filter */}
            <div>
              <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Category</h3>
              <div className="flex flex-wrap gap-2">
                {['All', ...Array.from(new Set(allSlides.map(slide => slide.category))).sort()].map(category => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    {category} ({category === 'All' ? allSlides.length : allSlides.filter(slide => slide.category === category).length})
                  </button>
                ))}
              </div>
            </div>
            
            {/* Services Filter */}
            {(() => {
              const allServices = Array.from(new Set(allSlides.flatMap(slide => slide.services || []))).sort();
              return allServices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Service</h3>
                  <div className="flex flex-wrap gap-2">
                    {['All', ...allServices].map(service => (
                      <button
                        key={service}
                        onClick={() => handleServiceChange(service)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                          selectedService === service
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        {service} ({service === 'All' ? allSlides.filter(s => s.services && s.services.length > 0).length : allSlides.filter(slide => slide.services && slide.services.includes(service)).length})
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()
            }
            
            {/* Office Filter */}
            {(() => {
              const allOffices = Array.from(new Set(allSlides.map(slide => slide.office).filter(Boolean))).sort();
              return allOffices.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Office</h3>
                  <div className="flex flex-wrap gap-2">
                    {['All', ...allOffices].map(office => (
                      <button
                        key={office}
                        onClick={() => handleOfficeChange(office)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                          selectedOffice === office
                            ? 'bg-orange-600 text-white'
                            : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200'
                        }`}
                      >
                        {office} ({office === 'All' ? allSlides.filter(s => s.office).length : allSlides.filter(slide => slide.office === office).length})
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()
            }
            
            {/* Business Type Filter */}
            {(() => {
              const allBusinessTypes = Array.from(new Set(allSlides.map(slide => slide.businessType).filter(Boolean))).sort();
              return allBusinessTypes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Business Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {['All', ...allBusinessTypes].map(businessType => (
                      <button
                        key={businessType}
                        onClick={() => handleBusinessTypeChange(businessType)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                          selectedBusinessType === businessType
                            ? 'bg-indigo-600 text-white'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                        }`}
                      >
                        {businessType} ({businessType === 'All' ? allSlides.filter(s => s.businessType).length : allSlides.filter(slide => slide.businessType === businessType).length})
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()
            }
            
            {/* Industry Filter */}
            {(() => {
              const allIndustries = Array.from(new Set(allSlides.flatMap(slide => 
                slide.industry ? slide.industry.split(/[,&]/).map(i => i.trim()).filter(i => i) : []
              ))).sort();
              return allIndustries.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Industry</h3>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {['All', ...allIndustries.slice(0, 15)].map(industry => (
                      <button
                        key={industry}
                        onClick={() => handleIndustryChange(industry)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                          selectedIndustry === industry
                            ? 'bg-teal-600 text-white'
                            : 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200'
                        }`}
                      >
                        {industry} ({industry === 'All' ? allSlides.filter(s => s.industry).length : allSlides.filter(slide => slide.industry && slide.industry.toLowerCase().includes(industry.toLowerCase())).length})
                      </button>
                    ))}
                    {allIndustries.length > 15 && (
                      <span className="text-sm text-slate-500 self-center">+{allIndustries.length - 15} more...</span>
                    )}
                  </div>
                </div>
              );
            })()
            }
            
            {/* Client Filter (for global case studies) */}
            {(() => {
              const allClients = Array.from(new Set(allSlides.map(slide => slide.client).filter(Boolean))).sort();
              return allClients.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-600 mb-3">Filter by Client</h3>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {['All', ...allClients.slice(0, 20)].map(client => (
                      <button
                        key={client}
                        onClick={() => handleClientChange(client)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                          selectedClient === client
                            ? 'bg-pink-600 text-white'
                            : 'bg-pink-50 text-pink-700 hover:bg-pink-100 border border-pink-200'
                        }`}
                      >
                        {client} ({client === 'All' ? allSlides.filter(s => s.client).length : allSlides.filter(slide => slide.client === client).length})
                      </button>
                    ))}
                    {allClients.length > 20 && (
                      <span className="text-sm text-slate-500 self-center">+{allClients.length - 20} more...</span>
                    )}
                  </div>
                </div>
              );
            })()
            }
          </div>
        )}

        <div className="space-y-4">
          {!isAiLoading && results.length > 0 ? (
            <div className="mb-4">
              <p className="text-sm text-slate-600">
                Showing {results.length} result{results.length !== 1 ? 's' : ''}
                {selectedDeck !== 'All' ? ` from ${selectedDeck}` : ''}
                {selectedOffice !== 'All' ? ` from ${selectedOffice}` : ''}
                {selectedClient !== 'All' ? ` for ${selectedClient}` : ''}
                {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}
                {selectedBusinessType !== 'All' ? ` (${selectedBusinessType})` : ''}
                {selectedService !== 'All' ? ` using ${selectedService}` : ''}
                {selectedIndustry !== 'All' ? ` in ${selectedIndustry}` : ''}
                {query ? ` for "${query}"` : ''}
              </p>
            </div>
          ) : null}
          {!isAiLoading && results.length > 0 ? (
            results.map(({ item, score }, idx) => {
                const slideUrl = item.presentationId && !item.presentationId.includes("YOUR_PRESENTATION_ID") ? `https://docs.google.com/presentation/d/${item.presentationId}/edit#slide=id.${item.slideId}` : null;
                
                const categoryColors = {
                  'Pricing': 'bg-green-100 text-green-800 border-green-200',
                  'Features': 'bg-blue-100 text-blue-800 border-blue-200',
                  'Case Studies': 'bg-purple-100 text-purple-800 border-purple-200',
                  'Demos': 'bg-orange-100 text-orange-800 border-orange-200',
                  'Contact': 'bg-gray-100 text-gray-800 border-gray-200',
                  'Solutions': 'bg-indigo-100 text-indigo-800 border-indigo-200',
                  'Benefits': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  'About Us': 'bg-cyan-100 text-cyan-800 border-cyan-200',
                  'Navigation': 'bg-amber-100 text-amber-800 border-amber-200',
                  'Metrics & Results': 'bg-rose-100 text-rose-800 border-rose-200',
                  'General': 'bg-slate-100 text-slate-800 border-slate-200'
                };
                
                return (
                  <div key={`${item.id}-${idx}`} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
                    <div className="flex items-start mb-3">
                      <BookIcon />
                      <div className="flex-1 ml-3">
                        <h3 className="text-lg font-bold text-slate-900">{item.deckDisplayName} - Slide {item.slideNumber}</h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${categoryColors[item.category] || categoryColors['General']}`}>
                            {item.category}
                          </span>
                          {item.elementCount > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-slate-50 text-slate-600 border border-slate-200">
                              {item.elementCount} elements
                            </span>
                          )}
                          {item.hasImages && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-blue-50 text-blue-600 border border-blue-200">
                              📷 Images
                            </span>
                          )}
                          {item.hasTables && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-green-50 text-green-600 border border-green-200">
                              📊 Tables
                            </span>
                          )}
                          {item.services && item.services.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-purple-50 text-purple-600 border border-purple-200">
                              🔧 {item.services.length} Service{item.services.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          {item.office && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-orange-50 text-orange-600 border border-orange-200">
                              🏢 {item.office}
                            </span>
                          )}
                          {item.businessType && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-600 border border-indigo-200">
                              📈 {item.businessType}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-auto flex items-center gap-4 flex-shrink-0">
                        {score && (<span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-full">Match: {((1 - score) * 100).toFixed(0)}%</span>)}
                        {slideUrl && (<a href={slideUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors" title="Open in Google Slides"><LinkIcon/></a>)}
                      </div>
                    </div>
                    {item.text && item.text.trim() && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Content</p>
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          {(() => {
                            const slideKey = `${item.slideId}-${idx}`;
                            const isExpanded = expandedSlides.has(slideKey);
                            const shouldTruncate = item.text.length > 250;
                            const displayText = shouldTruncate && !isExpanded ? summarizeText(item.text, 250) : item.text;
                            
                            return (
                              <>
                                <p className="text-slate-700 leading-relaxed">
                                  {highlightText(displayText, query)}
                                </p>
                                {shouldTruncate && (
                                  <button 
                                    className="text-blue-600 hover:text-blue-800 text-sm mt-2 font-medium transition-colors"
                                    onClick={() => {
                                      const newExpanded = new Set(expandedSlides);
                                      if (isExpanded) {
                                        newExpanded.delete(slideKey);
                                      } else {
                                        newExpanded.add(slideKey);
                                      }
                                      setExpandedSlides(newExpanded);
                                    }}
                                  >
                                    Show {isExpanded ? 'less' : 'more'}
                                  </button>
                                )}
                              </>
                            );
                          })()
                          }
                        </div>
                      </div>
                    )}
                    {item.client && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Client Information</p>
                            <div className="space-y-1">
                              <p className="text-sm"><span className="font-medium">Client:</span> {highlightText(item.client, query)}</p>
                              {item.industry && <p className="text-sm"><span className="font-medium">Industry:</span> {highlightText(item.industry, query)}</p>}
                              {item.businessType && <p className="text-sm"><span className="font-medium">Type:</span> {item.businessType}</p>}
                            </div>
                          </div>
                          {item.indexService && (
                            <div>
                              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Services Delivered</p>
                              <div className="flex flex-wrap gap-1">
                                {item.indexService.split(/[,|&]/).map((service, serviceIdx) => (
                                  <span key={serviceIdx} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 border border-purple-200">
                                    {highlightText(service.trim(), query)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {item.services && item.services.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Services Used</p>
                        <div className="flex flex-wrap gap-2">
                          {item.services.map((service, serviceIdx) => (
                            <span key={serviceIdx} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-purple-50 to-pink-50 text-purple-800 border border-purple-200">
                              {highlightText(service, query)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.metrics && item.metrics.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Key Metrics</p>
                        <div className="flex flex-wrap gap-2">
                          {item.metrics.map((metric, metricIdx) => (
                            <span key={metricIdx} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200">
                              {highlightText(metric.text, query)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.notes && item.notes.trim() && item.notes !== '\n' && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-slate-600 italic text-sm">{highlightText(item.notes, query)}</p>
                      </div>
                    )}
                  </div>
                )
            })
          ) : ( !isLoading && !isAiLoading && <p className="text-center text-slate-500 mt-10">No results found.</p>)}
        </div>
      </main>
    </div>
  );
}

