import React, { useState, useRef, useEffect } from 'react';
import { Plus, Settings, History, Upload, ArrowRight, X, Search } from 'lucide-react';
import './style/Home.css';
import './style/LoadingOverlay.css';
import Carousel from './components/Carousel';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
  const [inputText, setInputText] = useState('');
  const [attachedMedia, setAttachedMedia] = useState(null);
  const [hoveredIcon, setHoveredIcon] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [inputText]);

  // Handle media attachment
  const handleMediaAttach = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachedMedia({
          file: file,
          url: e.target.result,
          type: file.type,
          name: file.name
        });
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1]; // Remove data:type;base64, prefix
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Extract frames from video (simplified - takes first frame)
  const extractFramesFromVideo = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        video.currentTime = 0; 
      };
      
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0);
        const frame = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        resolve([frame]);
      };
      
      video.onerror = reject;
      video.src = URL.createObjectURL(file);
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!inputText.trim() && !attachedMedia) return;

    setIsLoading(true);
    setError(null);
    
    try {
      let response;

      if (attachedMedia) {
        // Handle media analysis
        let frames = [];
        
        if (attachedMedia.type.startsWith('image/')) {
          // For images, use the image as a single frame
          const base64Content = await fileToBase64(attachedMedia.file);
          frames = [base64Content];
        } else if (attachedMedia.type.startsWith('video/')) {
          // For videos, extract frames
          frames = await extractFramesFromVideo(attachedMedia.file);
        } else {
          throw new Error('Unsupported media type. Please upload an image or video.');
        }

        const mediaData = {
          frames: frames,
          mediaType: attachedMedia.type.startsWith('image/') ? 'image' : 'video'
        };

        console.log('Sending media data:', { 
          mediaType: mediaData.mediaType, 
          frameCount: frames.length 
        });

        response = await fetch('http://localhost:5500/analyze-media', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mediaData)
        });

      } else {
        // Handle text claim analysis
        const requestData = {
          claim: inputText.trim()
        };

        console.log('Sending claim data:', requestData);

        response = await fetch('http://localhost:5500/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Store the result for the claim page
        sessionStorage.setItem('analysisResult', JSON.stringify(result));
        
        // Navigate to claim page
        navigate('/claim');
      } else {
        throw new Error(result.message || 'Analysis failed');
      }
      
      // Reset form after successful submission
      setInputText('');
      setAttachedMedia(null);
      
    } catch (error) {
      console.error('Error sending request:', error);
      setError(error.message || 'An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press for submit
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if ((inputText.trim() || attachedMedia) && !isLoading) {
        handleSubmit();
      }
    }
  };

  const sidebarIcons = [
    { icon: Plus, name: 'New', id: 'new', link:'/' },
   
  ];

  return (
    <div className="app-container">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="magnifying-glass-container">
              <Search className="magnifying-glass" size={48} />
            </div>
            <p className="loading-text">
              {attachedMedia ? 'Analyzing Media...' : 'Analyzing Claim...'}
            </p>
          </div>
        </div>
      )}

      <div className="sidebar">
        {sidebarIcons.map(({ icon: Icon, name, id, link }) => (
          <Link to={`${link}`} key={id}>
            <div
              className="sidebar-icon"
              onMouseEnter={() => setHoveredIcon(id)}
              onMouseLeave={() => setHoveredIcon(null)}
            >
              <Icon size={20} />
              <div className={`tooltip ${hoveredIcon === id ? 'tooltip-visible' : ''}`}>
                {name}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-wrapper">
          {/* Header */}
          <div className="header">
            <h1 className="app-title">Truth</h1>
            <span className='sub-headline-text'>Verify claims and headlines instantly.</span>
          </div>

          {/* Error Display */}
          {error && (
            <div className="error-message" style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '4px',
              padding: '12px',
              marginBottom: '16px',
              color: '#c33'
            }}>
              {error}
            </div>
          )}

          {/* Input Container */}
          <div className="input-container">
            <div className="input-wrapper">
              {/* Media Preview */}
              {attachedMedia && (
                <div className="media-preview">
                  <div className="media-preview-content">
                    {attachedMedia.type.startsWith('image/') ? (
                      <>
                        <img src={attachedMedia.url} alt="Preview" className="media-preview-image" />
                        <div className="media-preview-file">
                          <span className="media-preview-file-name">{attachedMedia.name}</span>
                        </div>
                      </>
                    ) : attachedMedia.type.startsWith('video/') ? (
                      <>
                        <video src={attachedMedia.url} className="media-preview-video" />
                        <div className="media-preview-file">
                          <span className="media-preview-file-name">{attachedMedia.name}</span>
                        </div>
                      </>
                    ) : (
                      <div className="media-preview-file">
                        <Upload size={16} />
                        <span className="media-preview-file-name">{attachedMedia.name}</span>
                      </div>
                    )}
                  </div>
                  <button 
                    className="media-remove"
                    onClick={() => setAttachedMedia(null)}
                    title="Remove attachment"
                    disabled={isLoading}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input Content */}
              <div className="input-content">
                <textarea
                  ref={textareaRef}
                  className="main-input"
                  placeholder="Ask or attach to find the truth..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  rows={1}
                  disabled={isLoading}
                />
                
                {/* Input Actions */}
                <div className="input-actions">
                  <button
                    className="media-button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Attach file"
                    disabled={isLoading}
                  >
                    <Upload size={18} />
                  </button>
                  
                  <button
                    className="submit-button"
                    onClick={handleSubmit}
                    disabled={(!inputText.trim() && !attachedMedia) || isLoading}
                    title="Send message"
                  >
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleMediaAttach}
              style={{ display: 'none' }}
              disabled={isLoading}
            />
          </div>
        <Carousel/>
        </div>

        {/* Footer */}
        <div className="footer">
          <div className="footer-content">
            <span>© Truth | Built for the Perplexity Sonar Hackathon | 2025 - 2026</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;