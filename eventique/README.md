# Eventique — Event Planner

A React web app for browsing, filtering, and bookmarking events.

## Features

- **Explore Events** dropdown in navbar — click any category (Wedding, Birthday, etc.) to auto-select it in the filter
- **Amazon/Flipkart-style sidebar filters** — Event Type, Venue/Setting, Year, Scale (all with counts)
- **Search bar** — searches across title, type, venue, and planner name
- **Sort** — newest to oldest or oldest to newest by month/year
- **Active filter chips** — see what's applied, click to remove individually
- **Bookmark system** — hover over any card → bookmark button appears → saves to panel
- **Bookmarks panel** — accessible from navbar bookmark icon or profile dropdown
- **25 real event examples** across 11 categories

## Project Structure

```
src/
  data/
    events.js          — all 25 events + category/theme data
  hooks/
    useBookmarks.js    — bookmark state management
  components/
    Navbar.jsx / .module.css
    Sidebar.jsx / .module.css
    EventCard.jsx / .module.css
    BookmarkIcon.jsx
    BookmarksPanel.jsx / .module.css
  pages/
    ExplorePage.jsx / .module.css
  App.jsx / App.css
  main.jsx
index.html
```

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Adding Real Images

In `EventCard.jsx`, replace the gradient `imgArea` div with an `<img>` tag:

```jsx
<img
  src={event.imageUrl}
  alt={event.title}
  className={styles.img}
  onError={(e) => { e.target.style.display = 'none'; }}
/>
```

And add an `imageUrl` field to each event in `src/data/events.js`.

## Adding More Events

In `src/data/events.js`, add to the `EVENTS` array:

```js
{
  id: 26,
  title: "My New Event",
  type: "Wedding",       // must match EVENT_CATEGORIES type
  venue: "Rooftop",
  scale: "Small",        // Small | Medium | Large
  month: "June",
  year: 2025,
  planner: "Your Name",
}
```
