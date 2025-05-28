import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus, Settings, History, Search, FileText, ExternalLink, Clock,
    CheckCircle, XCircle, ChevronDown, ChevronUp, Lightbulb, List,
    Globe, Eye, AlertTriangle, ArrowLeft, ArrowRight, Minus
} from 'lucide-react';
import '../pages/style/ClaimAnalysis.css'

export default function Claim() {
    const [activeTab, setActiveTab] = useState('answer');
    const [expandedSection, setExpandedSection] = useState(null);
    const [hoveredIcon, setHoveredIcon] = useState(null);
    const [imageErrors, setImageErrors] = useState({});

    const navigate = useNavigate();

    // Enhanced analysis result parsing with error handling
    const getAnalysisResult = () => {
        try {
            const stored = sessionStorage.getItem('analysisResult');
            if (!stored) return null;
            return JSON.parse(stored);
        } catch (error) {
            console.error('Error parsing analysis result:', error);
            return null;
        }
    };

    const analysisResult = getAnalysisResult();

    const sidebarIcons = [
        { icon: Plus, name: 'New', id: 'new', link: '/' },
    ];

    // Enhanced text filtering function
    const filterMessyText = (text) => {
        if (!text) return '';

        // Remove excessive punctuation, weird characters, and clean up formatting
        return text
            .replace(/[^\w\s.,!?;:()\-"']/g, '') // Remove special characters except basic punctuation
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\.{3,}/g, '...') // Replace multiple dots with ellipsis
            .replace(/[.]{2}/g, '.') // Replace double dots with single
            .trim();
    };

    // Handle image load errors
    const handleImageError = (imageUrl) => {
        setImageErrors(prev => ({ ...prev, [imageUrl]: true }));
    };

    // Image preview component
    const ImagePreview = ({ src, alt, className = "" }) => {
        if (!src || imageErrors[src]) return null;

        return (
            <div className={`image-preview ${className}`}>
                <img
                    src={src}
                    alt={alt || ""}
                    onError={() => handleImageError(src)}
                    loading="lazy"
                />
            </div>
        );
    };


    // Enhanced link component
    const ExternalLinkComponent = ({ href, children, className = "" }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`external-link-component ${className}`}
        >
            {children}
            <ExternalLink size={14} className="link-icon" />
        </a>
    );

    // Bias indicator component
    const BiasIndicator = ({ bias, publication }) => {
        const getBiasColor = (bias) => {
            switch (bias?.toLowerCase()) {
                case 'left': return '#3b82f6';
                case 'right': return '#ef4444';
                case 'center': return '#10b981';
                default: return '#6b7280';
            }
        };

        const getBiasIcon = (bias) => {
            switch (bias?.toLowerCase()) {
                case 'left': return <ArrowLeft size={16} />;
                case 'right': return <ArrowRight size={16} />;
                case 'center': return <Minus size={16} />;
                default: return <AlertTriangle size={16} />;
            }
        };

        return (
            <div className="bias-indicator" style={{ color: getBiasColor(bias) }}>
                {getBiasIcon(bias)}
                <span>{bias || 'Unknown'}</span>
            </div>
        );
    };

    if (!analysisResult) {
        return (
            <div className="truth-analysis-app">
                <div className="main-content">
                    <div className="content-container">
                        <div className="content-header">
                            <h1 className="query-title">Truth Analysis</h1>
                        </div>
                        <div className="error-message">
                            <AlertTriangle size={24} />
                            <div>
                                <h3>No analysis result found</h3>
                                <p>Please go back and submit a claim for analysis.</p>
                                <button onClick={() => navigate('/')} className="primary-button">
                                    Go Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="truth-analysis-app">
            {/* Sidebar */}
            <div className="sidebar">
                {sidebarIcons.map(({ icon: Icon, name, id, link }) => (
                    <Link to={link} key={id}>
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
                <div className="content-container">
                    <div className="content-header">
                        <h1 className="query-title">Truth Analysis</h1>
                    </div>

                    {/* Verdict Banner */}
                    <div className={`verdict-banner ${analysisResult.verdict?.toLowerCase() || 'unknown'}`}>
                        {analysisResult.verdict === 'FALSE' ? (
                            <XCircle size={24} />
                        ) : analysisResult.verdict === 'TRUE' ? (
                            <CheckCircle size={24} />
                        ) : (
                            <AlertTriangle size={24} />
                        )}
                        <div className="verdict-content">
                            <span className="verdict-label">
                                Claim Status: {analysisResult.verdict || 'Unknown'}
                            </span>
                            <p className="original-claim">
                                "{analysisResult.original_claim || 'No claim provided'}"
                            </p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="nav-tabs">
                        <button
                            className={`nav-tab ${activeTab === 'answer' ? 'active' : ''}`}
                            onClick={() => setActiveTab('answer')}
                        >
                            <FileText size={16} />
                            Answer
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'sources' ? 'active' : ''}`}
                            onClick={() => setActiveTab('sources')}
                        >
                            <Globe size={16} />
                            Sources
                            <span className="source-count">{analysisResult.sources?.length || 0}</span>
                        </button>
                        <button
                            className={`nav-tab ${activeTab === 'bias' ? 'active' : ''}`}
                            onClick={() => setActiveTab('bias')}
                        >
                            <ArrowRight size={16} />
                            Bias Analysis
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="content-area">
                        {activeTab === 'answer' && (
                            <div className="answer-section">
                                <div className="analysis-text">
                                    <p>{filterMessyText(analysisResult.detailed_overview)}</p>
                                </div>

                                {/* Chain of Thought */}
                                {analysisResult.chain_of_thought && (
                                    <div className="expandable-section">
                                        <button
                                            className="section-header"
                                            onClick={() => toggleSection('chain-of-thought')}
                                        >
                                            <Lightbulb size={18} />
                                            <span>Chain of Thought</span>
                                            {expandedSection === 'chain-of-thought' ?
                                                <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                        {expandedSection === 'chain-of-thought' && (
                                            <div className="section-content">
                                                {Object.entries(analysisResult.chain_of_thought).map(([step, description]) => (
                                                    <div key={step} className="thought-step">
                                                        <div className="step-number">{step.replace('step_', '')}</div>
                                                        <div className="step-content">{filterMessyText(description)}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Reasoning */}
                                {analysisResult.reasoning && (
                                    <div className="expandable-section">
                                        <button
                                            className="section-header"
                                            onClick={() => toggleSection('reasoning')}
                                        >
                                            <List size={18} />
                                            <span>Key Reasoning Points</span>
                                            {expandedSection === 'reasoning' ?
                                                <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                        </button>
                                        {expandedSection === 'reasoning' && (
                                            <div className="section-content">
                                                {analysisResult.reasoning.map((reason, index) => (
                                                    <div key={index} className="reasoning-point">
                                                        <div className="bullet-point"></div>
                                                        <span>{filterMessyText(reason)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {analysisResult.related_articles && analysisResult.related_articles.length > 0 && (
                                    <div className="related-section">
                                        <h3 className="section-title">
                                            <FileText size={18} />
                                            Related Articles
                                        </h3>
                                        <div className="articles-grid">
                                            {analysisResult.related_articles.map((article, index) => (
                                                <ExternalLinkComponent
                                                    key={index}
                                                    href={article.url || article.link || '#'}
                                                    className="article-card"
                                                >
                                                    {analysisResult.images && analysisResult.images[index] && (
                                                        <ImagePreview
                                                            src={analysisResult.images[index].url}
                                                            alt={analysisResult.images[index].caption || article.title}
                                                            className="article-image"
                                                        />
                                                    )}
                                                    <div className="article-content">
                                                        <h4 className="article-title">{article.title}</h4>
                                                        <p className="article-publication">{article.publication}</p>
                                                        <p className="article-summary">{filterMessyText(article.summary)}</p>
                                                    </div>
                                                </ExternalLinkComponent>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'sources' && (
                            <div className="sources-section">
                                <div className="sources-list">
                                    {analysisResult.sources && analysisResult.sources.length > 0 ? (
                                        analysisResult.sources.map((source, index) => (
                                            <div key={index} className="source-item">
                                                {/* In the sources section, replace the source-header with this: */}
                                                <div className="source-header">
                                                    <div className="source-number">{index + 1}</div>
                                                    <div className="source-info">
                                                        <ExternalLinkComponent
                                                            href={source.url || source.link || '#'}
                                                            className="source-title-link"
                                                        >
                                                            <h4 className="source-title">{source.title}</h4>
                                                        </ExternalLinkComponent>
                                                        <div className="source-meta">
                                                            <span className="source-publication">{source.publication}</span>
                                                            <span className="source-type">{source.source_type}</span>
                                                            <span className={`credibility-rating ${source.credibility_rating?.toLowerCase()}`}>
                                                                {source.credibility_rating} credibility
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {analysisResult.images && analysisResult.images[index] && (
                                                        <ImagePreview
                                                            src={analysisResult.images[index].url}
                                                            alt={analysisResult.images[index].caption || source.title}
                                                            className="source-image"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state">
                                            <Search size={48} />
                                            <h3>No sources available</h3>
                                            <p>No sources were found for this analysis.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'bias' && (
                            <div className="bias-section">
                                <div className="bias-overview">
                                    <h3 className="section-title">
                                        <ArrowRight size={18} />
                                        Media Bias Analysis
                                    </h3>
                                    <p className="bias-description">
                                        Understanding the political lean of sources helps evaluate information objectively.
                                    </p>
                                </div>

                                <div className="bias-chart">
                                    <div className="bias-categories">
                                        <div className="bias-category left">
                                            <ArrowLeft size={20} />
                                            <span>Left Leaning</span>
                                            <div className="bias-count">
                                                {analysisResult.sources?.filter(s => s.bias?.toLowerCase() === 'left').length || 0}
                                            </div>
                                        </div>
                                        <div className="bias-category center">
                                            <Minus size={20} />
                                            <span>Center</span>
                                            <div className="bias-count">
                                                {analysisResult.sources?.filter(s => s.bias?.toLowerCase() === 'center').length || 0}
                                            </div>
                                        </div>
                                        <div className="bias-category right">
                                            <ArrowRight size={20} />
                                            <span>Right Leaning</span>
                                            <div className="bias-count">
                                                {analysisResult.sources?.filter(s => s.bias?.toLowerCase() === 'right').length || 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bias-sources">
                                    {analysisResult.sources && analysisResult.sources.length > 0 ? (
                                        analysisResult.sources.map((source, index) => (
                                            <div key={index} className="bias-source-item">
                                                <div className="source-info">
                                                    <ExternalLinkComponent
                                                        href={source.url || source.link || '#'}
                                                        className="bias-source-link"
                                                    >
                                                        <h4>{source.publication}</h4>
                                                    </ExternalLinkComponent>
                                                    <BiasIndicator bias={source.bias} publication={source.publication} />
                                                </div>
                                                <div className="bias-description">
                                                    {source.bias_description || 'No bias analysis available'}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state">
                                            <ArrowRight size={48} />
                                            <h3>No bias data available</h3>
                                            <p>Bias analysis could not be performed on the available sources.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}