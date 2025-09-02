import React, { useState } from 'react'

function SlideSearch({ onSearch, selectedDeck, onDeckChange, isLoading }) {
  const [query, setQuery] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <div className="card mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Slides</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="deck-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Deck
          </label>
          <select
            id="deck-select"
            value={selectedDeck}
            onChange={(e) => onDeckChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Decks</option>
            <option value="sales">Sales Deck</option>
            <option value="case-studies">Case Studies</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 mb-2">
            Search Query
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your search query..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Searching...</span>
                </div>
              ) : (
                'Search'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default SlideSearch
