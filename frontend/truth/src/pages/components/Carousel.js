import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../style/Carousel.css';

const Carousel = () => {
  const [news, setNews] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const carouselRef = useRef(null);
  const cardWidth = 196; // Width of each news card + gap
  const visibleCards = 5;

  // Fetch news from GNews API (free tier: 100 requests/day)
  const fetchNews = async (page = 1) => {
    setLoading(true);
    try {
    const API_KEY = ''
      const response = await fetch(
        `https://gnews.io/api/v4/top-headlines?category=general&lang=en&max=25&page=${page}&token=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch news');
      }
      
      const data = await response.json();
      
      if (page === 1) {
        setNews(data.articles || []);
      } else {
        setNews(prev => [...prev, ...(data.articles || [])]);
      }
      
      setHasMore(data.articles && data.articles.length === 6);
    } catch (error) {
      console.error('Error fetching news:', error);
      // Fallback to mock data for demo purposes
      const mockNews = [
        {
          title: "Tech Giants Report Strong Q4 Earnings Despite Market Volatility",
          description: "Major technology companies continue to show resilience...",
          url: "#",
          urlToImage: "https://via.placeholder.com/300x200/4a9960/ffffff?text=Tech+News",
          publishedAt: "2025-05-28T10:30:00Z",
          source: { name: "TechNews" }
        },
        {
          title: "Climate Summit Reaches Historic Agreement on Carbon Reduction",
          description: "World leaders unite on ambitious climate goals...",
          url: "#",
          urlToImage: "https://via.placeholder.com/300x200/2563eb/ffffff?text=Climate+News",
          publishedAt: "2025-05-28T09:15:00Z",
          source: { name: "Global Times" }
        },
        {
          title: "AI Breakthrough: New Model Achieves Human-Level Performance",
          description: "Researchers announce significant advancement in AI capabilities...",
          url: "#",
          urlToImage: "https://via.placeholder.com/300x200/7c3aed/ffffff?text=AI+News",
          publishedAt: "2025-05-28T08:45:00Z",
          source: { name: "AI Weekly" }
        },
        {
          title: "Space Mission Successfully Lands on Mars",
          description: "Historic achievement as rover begins exploration...",
          url: "#",
          urlToImage: "https://via.placeholder.com/300x200/dc2626/ffffff?text=Space+News",
          publishedAt: "2025-05-28T07:20:00Z",
          source: { name: "Space Today" }
        },
        {
          title: "Global Markets Show Strong Recovery Signs",
          description: "Economic indicators point to sustained growth...",
          url: "#",
          urlToImage: "https://via.placeholder.com/300x200/059669/ffffff?text=Market+News",
          publishedAt: "2025-05-28T06:30:00Z",
          source: { name: "Financial Times" }
        },
        {
          title: "Renewable Energy Adoption Reaches New Milestone",
          description: "Clean energy sources now power 40% of global grid...",
          url: "#",
          urlToImage: "https://via.placeholder.com/300x200/ea580c/ffffff?text=Energy+News",
          publishedAt: "2025-05-28T05:45:00Z",
          source: { name: "Energy Report" }
        }
      ];
      
      if (page === 1) {
        setNews(mockNews);
      } else {
        setNews(prev => [...prev, ...mockNews.slice(0, 3)]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(1);
  }, []);

  const scrollToIndex = (index) => {
    if (carouselRef.current) {
      const scrollPosition = index * cardWidth;
      carouselRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
      setCurrentIndex(index);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    const maxIndex = Math.max(0, news.length - visibleCards);
    if (currentIndex < maxIndex) {
      scrollToIndex(currentIndex + 1);
      
      // Load more news when near the end
      if (currentIndex >= maxIndex - 2 && hasMore && !loading) {
        const nextPage = Math.floor(news.length / 6) + 1;
        fetchNews(nextPage);
      }
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const publishedTime = new Date(dateString);
    const diffInHours = Math.floor((now - publishedTime) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  
  if (news.length === 0 && !loading) {
    return null;
  }

  const canScrollLeft = currentIndex > 0;
  const canScrollRight = currentIndex < Math.max(0, news.length - visibleCards);

  return (
    <div className="news-carousel-container">
      <div className="news-carousel-header">
        <h3 className="news-carousel-title">Trending News Globally</h3>
        <div className="news-carousel-controls">
          <button
            className={`carousel-nav-btn ${!canScrollLeft ? 'disabled' : ''}`}
            onClick={handlePrevious}
            disabled={!canScrollLeft}
            title="Previous"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className={`carousel-nav-btn ${!canScrollRight ? 'disabled' : ''}`}
            onClick={handleNext}
            disabled={!canScrollRight}
            title="Next"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="news-carousel-wrapper">
        <div 
          ref={carouselRef}
          className="news-carousel"
          onScroll={(e) => {
            const scrollLeft = e.target.scrollLeft;
            const newIndex = Math.round(scrollLeft / cardWidth);
            if (newIndex !== currentIndex) {
              setCurrentIndex(newIndex);
            }
          }}
        >
          {news.map((article, index) => (
            <article 
              key={`${article.url}-${index}`}
              className="news-card"
              onClick={() => window.open(article.url, '_blank')}
            >
              <div className="news-card-image-container">
                <img
                  src={article.image || 'https://via.placeholder.com/300x200/333333/888888?text=No+Image'}
                  alt={article.title}
                  className="news-card-image"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/300x200/333333/888888?text=No+Image';
                  }}
                />
                <div className="news-card-source">
                  {article.source?.name}
                </div>
              </div>
              
              <div className="news-card-content">
                <h4 className="news-card-title">
                  {article.title}
                </h4>
                
                <div className="news-card-meta">
                  <span className="news-card-time">
                    {formatTimeAgo(article.publishedAt)}
                  </span>
                </div>
                
               
              </div>
            </article>
          ))}
          
          {loading && (
            <div className="news-card loading-card">
              <div className="loading-shimmer">
                <div className="shimmer-image"></div>
                <div className="shimmer-content">
                  <div className="shimmer-line long"></div>
                  <div className="shimmer-line short"></div>
                  <div className="shimmer-line medium"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="news-carousel-indicators">
        {Array.from({ length: Math.max(1, news.length - visibleCards + 1) }, (_, i) => (
          <button
            key={i}
            className={`carousel-indicator ${i === currentIndex ? 'active' : ''}`}
            onClick={() => scrollToIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Carousel;