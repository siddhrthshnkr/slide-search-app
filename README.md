# Slide Search App

An AI-powered slide search application built with React, Vite, and Tailwind CSS. This app allows users to search through presentation decks using natural language queries and AI-powered search algorithms.

## Features

- **AI-Powered Search**: Intelligent search through slide content using natural language
- **Multi-Deck Support**: Search across multiple presentation decks
- **Modern UI**: Clean, responsive interface built with Tailwind CSS
- **Real-time Results**: Instant search results with relevance scoring
- **Deck Selection**: Choose specific decks or search across all content

## Project Structure

```
slide-search-app/
├── api/
│   └── ai-search.js        # The secure backend API route
├── public/
│   ├── decks.json          # Master configuration for all decks
│   ├── master-sales-deck.json     # Data for your first deck
│   └── global-case-studies.json   # Data for your second deck
├── src/
│   ├── assets/             # For static assets like images or fonts
│   ├── components/         # React components
│   │   ├── Header.jsx
│   │   ├── SlideSearch.jsx
│   │   └── SlideResults.jsx
│   ├── App.jsx             # The main React application component
│   ├── main.jsx            # Application entry point
│   └── index.css           # Main styles with Tailwind CSS
├── .gitignore              # Specifies files for Git to ignore
├── index.html              # The main HTML entry point for the app
├── package.json            # Project dependencies and scripts
├── tailwind.config.js      # Tailwind CSS configuration
├── postcss.config.js       # PostCSS configuration
└── vite.config.js          # Vite configuration file
```

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager

### Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd slide-search-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   The app will automatically open at `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Usage

### Searching Slides

1. **Select a Deck**: Choose from "All Decks", "Sales Deck", or "Case Studies"
2. **Enter Query**: Type your search query in natural language
3. **View Results**: Browse through relevant slides with relevance scores

### Example Queries

- "customer success stories"
- "inventory management solutions"
- "healthcare compliance"
- "manufacturing efficiency"
- "cost reduction strategies"

## Data Structure

### Deck Configuration (`decks.json`)
Contains metadata about available decks including:
- Deck ID and name
- Description and tags
- Total slide count
- Last updated date

### Slide Data Files
Each deck has its own JSON file containing:
- Slide number and title
- Content and key points
- Tags for categorization
- Slide type and metadata

## Customization

### Adding New Decks

1. Create a new JSON file in the `public/` directory
2. Add deck metadata to `decks.json`
3. Update the deck selection options in `SlideSearch.jsx`

### Modifying Search Logic

The search functionality is currently mocked in `api/ai-search.js`. To implement real AI search:

1. Integrate with OpenAI API or similar service
2. Implement vector search or semantic matching
3. Add proper error handling and rate limiting

### Styling

The app uses Tailwind CSS with custom components defined in `src/index.css`. Modify the Tailwind config in `tailwind.config.js` to customize the design system.

## API Endpoints

### POST `/api/ai-search`

**Request Body:**
```json
{
  "query": "search query string",
  "deck": "deck identifier or 'all'"
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "Slide Title",
      "content": "Slide content...",
      "deck": "Deck Name",
      "slideNumber": 1,
      "relevance": 0.95
    }
  ],
  "query": "search query",
  "deck": "selected deck",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Technologies Used

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS, PostCSS
- **Build Tool**: Vite
- **Package Manager**: npm
- **Development**: ESLint, React Refresh

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For questions or support, please open an issue in the repository or contact the development team.

---

**Note**: This is a demonstration application. The AI search functionality is currently mocked and would need to be connected to a real AI service for production use.
