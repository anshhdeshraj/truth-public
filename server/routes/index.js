const express = require('express');
const router = express.Router();
const axios = require('axios');
const ffmpeg = require('ffmpeg');
const vision = require('@google-cloud/vision');
require('dotenv').config()

// Initialize Google Vision client with better error handling
let visionClient;

try {
    if (process.env.GOOGLE_VISION_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GOOGLE_VISION_CREDENTIALS);
        visionClient = new vision.ImageAnnotatorClient({ credentials });
        console.log('Google Vision client initialized with environment credentials');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        visionClient = new vision.ImageAnnotatorClient({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
        console.log('Google Vision client initialized with service account file');
    } else {
        console.warn('No Google Vision credentials found. OCR will not work.');
        console.warn('Please set GOOGLE_VISION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS');
    }
} catch (error) {
    console.error('Failed to initialize Google Vision client:', error.message);
    visionClient = null;
}

// Simple root endpoint
router.get('/', (req, res) => {
    try {
        const response = {
            message: 'Truth Backend - Advanced Misinformation Detection API',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
            features: [
                'Advanced OCR Processing',
                'AI-Powered Fact Checking',
                'Multi-source Verification',
                'Bias Detection',
                'Topic Classification',
                'Citation Management'
            ]
        };

        res.json(response);
    } catch (error) {
        console.error('Error in root endpoint:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Something went wrong'
        });
    }
});

// =================== OCR PROCESSING ===================

async function performGoogleVisionOCR(base64Image) {
    if (!visionClient) {
        throw new Error('Google Vision API not configured. Please set up credentials.');
    }

    try {
        const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

        const request = {
            image: {
                content: imageData,
            },
            features: [
                {
                    type: 'TEXT_DETECTION',
                    maxResults: 1,
                },
                {
                    type: 'DOCUMENT_TEXT_DETECTION',
                    maxResults: 1,
                }
            ],
            imageContext: {
                languageHints: ['en', 'hi', 'es', 'fr', 'de'],
            }
        };

        const [result] = await visionClient.annotateImage(request);

        if (result.error) {
            console.error('Google Vision API error:', result.error);
            throw new Error(`Vision API error: ${result.error.message}`);
        }

        const documentText = result.fullTextAnnotation?.text;
        const simpleText = result.textAnnotations?.[0]?.description;
        const extractedText = documentText || simpleText || '';
        const individualTexts = result.textAnnotations?.slice(1).map(annotation => annotation.description) || [];

        return {
            fullText: extractedText,
            individualTexts: individualTexts,
            confidence: result.textAnnotations?.[0]?.confidence || 0,
            boundingBoxes: result.textAnnotations?.map(annotation => annotation.boundingPoly) || []
        };

    } catch (error) {
        console.error('Google Vision OCR error:', error);
        if (error.code === 7) {
            throw new Error('Google Vision API: Permission denied. Check your credentials and API access.');
        } else if (error.code === 16) {
            throw new Error('Google Vision API: Authentication failed. Check your credentials.');
        } else if (error.message.includes('quota')) {
            throw new Error('Google Vision API: Quota exceeded. Check your billing and limits.');
        }
        throw error;
    }
}

async function performFallbackOCR(base64Image) {
    try {
        console.log('Using fallback OCR (OCR.space API)');
        const imageData = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

        const response = await axios.post('https://api.ocr.space/parse/image', {
            base64Image: `data:image/png;base64,${imageData}`,
            language: 'eng',
            isOverlayRequired: false,
            detectOrientation: true,
            scale: true,
            OCREngine: 2
        }, {
            headers: {
                'apikey': process.env.OCR_SPACE_KEY || 'helloworld',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
            const parsedText = response.data.ParsedResults[0].ParsedText || '';
            return {
                fullText: parsedText,
                individualTexts: parsedText.split('\n').filter(t => t.trim()),
                confidence: response.data.ParsedResults[0].TextOverlay ? 0.8 : 0.6,
                boundingBoxes: []
            };
        }

        return {
            fullText: '',
            individualTexts: [],
            confidence: 0,
            boundingBoxes: []
        };

    } catch (error) {
        console.error('Fallback OCR error:', error);
        return {
            fullText: '',
            individualTexts: [],
            confidence: 0,
            boundingBoxes: []
        };
    }
}

function cleanText(text) {
    if (!text) return '';

    return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .replace(/\b(play|pause|stop|share|like|subscribe|follow|comment|reply|retweet|heart|thumbs?\s?up)\b/gi, '')
        .replace(/\b(instagram|facebook|twitter|tiktok|youtube|snapchat)\b/gi, '')
        .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s?(AM|PM)?\b/gi, '')
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, '')
        .replace(/(?<!\w)\d+(?!\w)/g, '')
        .replace(/[^\w\s\u00C0-\u017F.,!?;:'"()\-]/g, ' ')
        .replace(/\s+([.,!?;:])/g, '$1')
        .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 3)
        .join('. ')
        .trim();
}

function mergeTextsAdvanced(ocrResults) {
    const allTexts = [];
    const seenTexts = new Set();

    ocrResults.forEach((result, frameIndex) => {
        const { fullText, individualTexts, confidence } = result;

        if (fullText && fullText.length > 10 && confidence > 0.3) {
            const cleaned = cleanText(fullText);
            if (cleaned && cleaned.length > 10) {
                allTexts.push({
                    text: cleaned,
                    confidence: confidence,
                    frame: frameIndex,
                    type: 'full'
                });
            }
        }

        individualTexts.forEach(text => {
            if (text && text.length > 2) {
                const cleaned = cleanText(text);
                if (cleaned && cleaned.length > 2 && !seenTexts.has(cleaned.toLowerCase())) {
                    seenTexts.add(cleaned.toLowerCase());
                    allTexts.push({
                        text: cleaned,
                        confidence: confidence,
                        frame: frameIndex,
                        type: 'segment'
                    });
                }
            }
        });
    });

    allTexts.sort((a, b) => b.confidence - a.confidence);

    const uniqueTexts = [];
    for (const textObj of allTexts) {
        const isDuplicate = uniqueTexts.some(existing =>
            calculateSimilarity(textObj.text.toLowerCase(), existing.text.toLowerCase()) > 0.8
        );

        if (!isDuplicate) {
            uniqueTexts.push(textObj);
        }
    }

    const combinedText = uniqueTexts
        .map(obj => obj.text)
        .join('. ')
        .replace(/\.\s*\./g, '.')
        .replace(/\s+/g, ' ')
        .trim();

    return {
        combinedText,
        confidence: uniqueTexts.length > 0 ? uniqueTexts[0].confidence : 0,
        textSegments: uniqueTexts.length
    };
}

function calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}

async function processMediaFramesAdvanced(frames, mediaType) {
    const maxFrames = mediaType === 'video' ? 25 : 15;
    const framesToProcess = frames.slice(0, maxFrames);
    const useGoogleVision = !!visionClient;
    const ocrProvider = useGoogleVision ? 'Google Vision API' : 'OCR.space (fallback)';

    if (!useGoogleVision) {
        console.warn('Google Vision not configured, using fallback OCR with limited features');
    }

    const batchSize = useGoogleVision ? 5 : 2;
    const ocrResults = [];

    for (let i = 0; i < framesToProcess.length; i += batchSize) {
        const batch = framesToProcess.slice(i, i + batchSize);

        const batchPromises = batch.map(async (frame, batchIndex) => {
            const frameIndex = i + batchIndex;
            try {
                const result = useGoogleVision
                    ? await performGoogleVisionOCR(frame)
                    : await performFallbackOCR(frame);
                return result;
            } catch (error) {
                console.error(`Error processing frame ${frameIndex + 1}:`, error);
                return { fullText: '', individualTexts: [], confidence: 0, boundingBoxes: [] };
            }
        });

        const batchResults = await Promise.all(batchPromises);
        ocrResults.push(...batchResults);

        if (i + batchSize < framesToProcess.length) {
            const delay = useGoogleVision ? 500 : 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    const mergeResult = mergeTextsAdvanced(ocrResults);

    return {
        combined_text: mergeResult.combinedText || "No text content could be extracted from the media.",
        frame_count: framesToProcess.length,
        processed_segments: mergeResult.textSegments,
        average_confidence: mergeResult.confidence,
        ocr_provider: ocrProvider
    };
}

// =================== TOPIC CLASSIFICATION ===================

function classifyTopic(claimText) {
    const text = claimText.toLowerCase();
    
    const categoryPatterns = {
        health: {
            vaccine: /\b(vaccine|vaccination|vaxx|pfizer|moderna|johnson|astrazeneca|covid|coronavirus|mrna|spike protein)\b/g,
            medical: /\b(medicine|drug|treatment|cure|doctor|hospital|surgery|pill|medication|therapy|diagnosis)\b/g,
            nutrition: /\b(diet|food|nutrition|supplement|vitamin|organic|gmo|processed|natural|superfood)\b/g,
            mental: /\b(depression|anxiety|mental health|therapy|psychiatrist|antidepressant|suicide|stress)\b/g
        },
        politics: {
            election: /\b(election|vote|voting|ballot|candidate|poll|democracy|fraud|rigged|stolen)\b/g,
            government: /\b(government|congress|senate|president|politician|policy|law|regulation|tax|biden|trump)\b/g,
            conspiracy: /\b(deep state|illuminati|new world order|agenda|elite|control|manipulation|cover-up|secret)\b/g,
            international: /\b(war|ukraine|russia|china|nato|un|sanctions|diplomacy|treaty|alliance)\b/g
        },
        technology: {
            ai: /\b(ai|artificial intelligence|chatgpt|machine learning|robot|automation|algorithm|neural)\b/g,
            social: /\b(facebook|twitter|instagram|tiktok|youtube|social media|platform|censorship|ban)\b/g,
            privacy: /\b(privacy|surveillance|tracking|data|personal information|hack|breach|security)\b/g,
            crypto: /\b(bitcoin|crypto|cryptocurrency|blockchain|nft|ethereum|dogecoin|mining|wallet)\b/g
        },
        science: {
            climate: /\b(climate|global warming|carbon|emissions|temperature|glacier|ice caps|fossil fuels)\b/g,
            space: /\b(space|nasa|mars|moon|asteroid|satellite|rocket|astronaut|alien|ufo)\b/g,
            physics: /\b(quantum|physics|energy|gravity|universe|theory|relativity|particle|atom)\b/g
        },
        finance: {
            economy: /\b(economy|recession|inflation|gdp|unemployment|market|stock|crash|bull|bear)\b/g,
            banking: /\b(bank|federal reserve|interest rate|loan|mortgage|debt|credit|investment|wall street)\b/g,
            personal: /\b(money|salary|wage|income|savings|retirement|pension|401k|financial advice)\b/g
        }
    };

    let bestCategory = 'general';
    let bestSubcategory = 'unclassified';
    let maxScore = 0;

    Object.keys(categoryPatterns).forEach(category => {
        Object.keys(categoryPatterns[category]).forEach(subcategory => {
            const matches = text.match(categoryPatterns[category][subcategory]) || [];
            const score = matches.length;
            
            if (score > maxScore) {
                maxScore = score;
                bestCategory = category;
                bestSubcategory = subcategory;
            }
        });
    });

    return {
        category: bestCategory,
        subcategory: bestSubcategory,
        confidence: Math.min(maxScore / 3, 1),
        matchCount: maxScore
    };
}

// =================== BIAS DETECTION ===================

function detectBias(claimText) {
    const text = claimText.toLowerCase();
    
    const biasIndicators = {
        political: {
            left: /\b(progressive|liberal|democrat|socialist|left-wing|antifa|blm|woke|inclusive)\b/g,
            right: /\b(conservative|republican|right-wing|maga|patriot|traditional|freedom|liberty)\b/g
        },
        emotional: /\b(outrageous|shocking|unbelievable|disgusting|amazing|incredible|devastating|heartbreaking)\b/g,
        authority: /\b(experts say|scientists claim|government admits|leaked documents|insider reveals|whistleblower)\b/g,
        urgency: /\b(breaking|urgent|act now|time is running out|before it's too late|immediately)\b/g,
        absolutes: /\b(never|always|all|none|every|completely|totally|absolutely|definitely|certainly)\b/g
    };

    const politicalLeft = (text.match(biasIndicators.political.left) || []).length;
    const politicalRight = (text.match(biasIndicators.political.right) || []).length;
    
    const biasScores = {
        political: Math.abs(politicalLeft - politicalRight) / Math.max(politicalLeft + politicalRight, 1),
        emotional: (text.match(biasIndicators.emotional) || []).length,
        authority: (text.match(biasIndicators.authority) || []).length,
        urgency: (text.match(biasIndicators.urgency) || []).length,
        absolutes: (text.match(biasIndicators.absolutes) || []).length
    };

    const overallBias = Object.values(biasScores).reduce((sum, score) => sum + score, 0) / 5;

    return {
        scores: biasScores,
        overallBias: Math.min(overallBias, 1),
        politicalLean: politicalLeft > politicalRight ? 'left' : politicalRight > politicalLeft ? 'right' : 'neutral',
        hasSignificantBias: overallBias > 0.4
    };
}

// =================== PERPLEXITY SONAR API INTEGRATION (UPDATED) ===================

async function callPerplexitySonar(claim) {
    const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
    
    if (!PERPLEXITY_API_KEY) {
        throw new Error('PERPLEXITY_API_KEY not configured');
    }

    try {
        console.log('🔍 Calling Perplexity Sonar API for claim analysis...');
        
        const response = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
                model: 'llama-3.1-sonar-large-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert fact-checker with real-time web access. Analyze the given claim and provide a comprehensive fact-check response in JSON format.

        IMPORTANT: You MUST return a valid JSON object with exactly these fields and structure:

        {
            "original_claim": "the exact claim text provided",
            "verdict": "TRUE" | "FALSE" | "MIXED" | "UNVERIFIED",
            "sources": [
                {
                    "title": "source title",
                    "url": "actual URL",
                    "publication": "publication name",
                    "date": "publication date",
                    "credibility_rating": "high|medium|low",
                    "source_type": "academic|news|government|medical|fact-check|blog"
                }
            ],
            "citations": [
                {
                    "quote": "direct quote from source",
                    "source_title": "title of source",
                    "url": "URL to source",
                    "page_number": "if applicable"
                }
            ],
            "biasness": {
                "overall_bias": "none|slight|moderate|high",
                "political_lean": "left|right|center|neutral",
                "bias_indicators": ["indicator1", "indicator2"],
                "bias_explanation": "explanation of detected bias"
            },
            "category": {
                "primary": "health|politics|science|technology|finance|social|general",
                "secondary": "specific subcategory",
                "tags": ["tag1", "tag2", "tag3"]
            },
            "related_articles": [
                {
                    "title": "related article title",
                    "url": "article URL",
                    "publication": "publication name",
                    "relevance": "why this is relevant",
                    "summary": "brief summary"
                }
            ],
            "images": [
                {
                    "description": "image description",
                    "url": "image URL",
                    "source": "image source website",
                    "caption": "image caption if available"
                }
            ],
            "chain_of_thought": {
                "step_1": "Initial assessment of the claim",
                "step_2": "Search for relevant sources",
                "step_3": "Evaluate source credibility",
                "step_4": "Analyze evidence for and against",
                "step_5": "Consider context and nuance",
                "step_6": "Arrive at final verdict"
            },
            "reasoning": [
                "Key reason 1 supporting the verdict",
                "Key reason 2 supporting the verdict",
                "Key reason 3 supporting the verdict"
            ],
            "detailed_overview": "Comprehensive analysis of the claim including background context, key evidence, expert opinions, and why this verdict was reached",
            "media_coverage": {
                "left_leaning": ["publication1", "publication2"],
                "right_leaning": ["publication3", "publication4"], 
                "center": ["publication5", "publication6"],
                "coverage_analysis": "How different media outlets with different biases covered this topic"
            }
        }

        CRITICAL REQUIREMENTS:
        - Always include the original claim exactly as provided
        - Include at least 3-5 credible sources with actual URLs
        - Provide specific citations with quotes from sources
        - Include detailed step-by-step reasoning
        - Find at least 2-3 relevant images with actual URLs
        - Analyze media coverage from different bias perspectives
        - Provide a comprehensive detailed overview (minimum 200 words)
        - Always provide with image urls of every related article and about the claim itself`               
                    },
                    {
                        role: 'user', 
                        content: `Please fact-check this claim comprehensively: "${claim}"`
                    }
                ],
                temperature: 0.2,
                max_tokens: 4000
            },
            {
                headers: {
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );
        
        const aiContent = response.data.choices[0].message.content;
        
        let parsedResponse;
        try {
            const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsedResponse = JSON.parse(jsonMatch[0]);
            } else {
                parsedResponse = JSON.parse(aiContent);
            }
        } catch (parseError) {
            console.warn('Failed to parse structured response, creating fallback...');
            parsedResponse = createFallbackResponse(aiContent, claim);
        }

        return validateAndSanitizeResponse(parsedResponse, claim);
        
    } catch (error) {
        console.error('Perplexity API error:', error);
        
        if (error.response?.status === 401) {
            throw new Error('Invalid Perplexity API key');
        } else if (error.response?.status === 429) {
            throw new Error('Perplexity API rate limit exceeded');
        } else if (error.code === 'ECONNABORTED') {
            throw new Error('Perplexity API request timeout');
        }
        
        throw new Error(`Failed to analyze claim: ${error.message}`);
    }
}

function createFallbackResponse(content, claim) {
    const isLikelyFalse = /\b(false|incorrect|misleading|debunked|myth|hoax)\b/i.test(content);
    const isLikelyTrue = /\b(true|correct|accurate|verified|confirmed)\b/i.test(content);
    
    let verdict = 'UNVERIFIED';
    
    if (isLikelyFalse) {
        verdict = 'FALSE';
    } else if (isLikelyTrue) {
        verdict = 'TRUE';
    }
    
    return {
        original_claim: claim,
        verdict: verdict,
        sources: [],
        citations: [],
        biasness: {
            overall_bias: 'none',
            political_lean: 'neutral',
            bias_indicators: [],
            bias_explanation: 'Unable to assess bias due to parsing issues'
        },
        category: {
            primary: 'general',
            secondary: 'unclassified',
            tags: []
        },
        related_articles: [],
        images: [],
        chain_of_thought: {
            step_1: 'Received claim for analysis',
            step_2: 'Attempted to parse AI response',
            step_3: 'Parsing failed, using fallback',
            step_4: 'Limited analysis performed',
            step_5: 'Basic verdict assessment',
            step_6: 'Fallback response generated'
        },
        reasoning: [
            'Analysis based on limited parsing of AI response',
            'Unable to access full structured data',
            'Fallback verdict based on keyword detection'
        ],
        detailed_overview: content.substring(0, 500) + '...',
        media_coverage: {
            left_leaning: [],
            right_leaning: [],
            center: [],
            coverage_analysis: 'Unable to analyze media coverage due to parsing issues'
        }
    };
}

function validateAndSanitizeResponse(response, claim) {
    const sanitized = {
        original_claim: response.original_claim || claim,
        verdict: response.verdict || 'UNVERIFIED',
        sources: Array.isArray(response.sources) ? response.sources.slice(0, 15) : [],
        citations: Array.isArray(response.citations) ? response.citations.slice(0, 10) : [],
        biasness: response.biasness || {
            overall_bias: 'none',
            political_lean: 'neutral',
            bias_indicators: [],
            bias_explanation: 'No bias assessment available'
        },
        category: response.category || {
            primary: 'general',
            secondary: 'unclassified',
            tags: []
        },
        related_articles: Array.isArray(response.related_articles) ? response.related_articles.slice(0, 10) : [],
        images: Array.isArray(response.images) ? response.images.slice(0, 8) : [],
        chain_of_thought: response.chain_of_thought || {
            step_1: 'Claim received',
            step_2: 'Sources searched',
            step_3: 'Evidence evaluated',
            step_4: 'Context considered',
            step_5: 'Verdict reached',
            step_6: 'Response formatted'
        },
        reasoning: Array.isArray(response.reasoning) ? response.reasoning.slice(0, 5) : [],
        detailed_overview: response.detailed_overview || 'No detailed overview available',
        media_coverage: response.media_coverage || {
            left_leaning: [],
            right_leaning: [],
            center: [],
            coverage_analysis: 'No media coverage analysis available'
        }
    };
    
    // Validate verdict
    const validVerdicts = ['TRUE', 'FALSE', 'MIXED', 'UNVERIFIED'];
    if (!validVerdicts.includes(sanitized.verdict)) {
        sanitized.verdict = 'UNVERIFIED';
    }
    
    // Validate and enhance sources
    sanitized.sources = sanitized.sources.map(source => ({
        title: source.title || 'Unknown Source',
        url: source.url || '',
        publication: source.publication || '',
        date: source.date || '',
        credibility_rating: source.credibility_rating || 'medium',
        source_type: source.source_type || 'unknown'
    }));
    
    return sanitized;
}

// =================== MAIN ENDPOINTS ===================

router.post('/claim', async (req, res) => {
    try {
        const { claim } = req.body;
        
        if (!claim || typeof claim !== 'string' || claim.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Claim text is required and must be a non-empty string'
            });
        }
        
        if (claim.length > 2000) {
            return res.status(400).json({
                success: false,
                error: 'Claim too long',
                message: 'Claim must be less than 2000 characters'
            });
        }
        
        console.log('🎯 Analyzing claim:', claim.substring(0, 100) + '...');
        const startTime = Date.now();
        
        // Get AI analysis from Perplexity
        const aiResponse = await callPerplexitySonar(claim.trim());
        console.log('✅ AI Analysis complete. Verdict:', aiResponse.verdict);
        
        // Perform local analysis for additional insights
        const topicClassification = classifyTopic(claim);
        const biasAnalysis = detectBias(claim);
        
        // Construct response with the new structure
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            processing_time_ms: Date.now() - startTime,
            
            // Core response based on your requirements
            original_claim: aiResponse.original_claim,
            verdict: aiResponse.verdict,
            sources: aiResponse.sources,
            citations: aiResponse.citations,
            biasness: aiResponse.biasness,
            category: aiResponse.category,
            related_articles: aiResponse.related_articles,
            images: aiResponse.images,
            chain_of_thought: aiResponse.chain_of_thought,
            reasoning: aiResponse.reasoning,
            detailed_overview: aiResponse.detailed_overview,
            media_coverage: aiResponse.media_coverage,
            
            // Additional local analysis for enhancement
            local_analysis: {
                topic_classification: topicClassification,
                bias_analysis: biasAnalysis
            },
            
            // Metadata
            metadata: {
                analysis_id: Math.random().toString(36).substr(2, 12),
                model_used: 'llama-3.1-sonar-large-128k-online',
                api_version: '2.0.0',
                total_sources: aiResponse.sources.length,
                total_citations: aiResponse.citations.length,
                total_images: aiResponse.images.length
            }
        };
        
        console.log('🚀 Response ready. Processing time:', response.processing_time_ms + 'ms');
        res.json(response);
        
    } catch (error) {
        console.error('Error in claim analysis endpoint:', error);
        
        const errorResponse = {
            success: false,
            error: 'Analysis failed',
            message: error.message,
            timestamp: new Date().toISOString(),
            fallback_analysis: {
                local_classification: req.body.claim ? classifyTopic(req.body.claim) : null,
                local_bias_analysis: req.body.claim ? detectBias(req.body.claim) : null
            }
        };
        
        let statusCode = 500;
        if (error.message.includes('API key')) {
            statusCode = 503;
        } else if (error.message.includes('rate limit')) {
            statusCode = 429;
        } else if (error.message.includes('timeout')) {
            statusCode = 504;
        }
        
        res.status(statusCode).json(errorResponse);
    }
});

router.post('/analyze-media', async (req, res) => {
    try {
        const { frames, mediaType } = req.body;
        
        if (!frames || !Array.isArray(frames) || frames.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'Frames array is required and must contain at least one base64 image'
            });
        }
        
        if (!mediaType || !['image', 'video'].includes(mediaType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid media type',
                message: 'Media type must be either "image" or "video"'
            });
        }
        
        console.log(`📸 Processing ${mediaType} with ${frames.length} frames...`);
        const startTime = Date.now();
        
        // Process frames with advanced OCR
        const ocrResult = await processMediaFramesAdvanced(frames, mediaType);
        console.log('📝 OCR extraction complete:', ocrResult.combined_text.length, 'characters');
        
        if (ocrResult.combined_text.length < 10) {
            return res.json({
                success: true,
                message: 'No meaningful text content found in the media',
                timestamp: new Date().toISOString(),
                mediaType,
                extractedText: '',
                ocrMetadata: {
                    frameCount: ocrResult.frame_count,
                    processedSegments: ocrResult.processed_segments,
                    averageConfidence: ocrResult.average_confidence,
                    ocrProvider: ocrResult.ocr_provider
                },
                verdict: 'UNVERIFIED',
                sources: [],
                citations: [],
                biasness: {
                    overall_bias: 'none',
                    political_lean: 'neutral',
                    bias_indicators: [],
                    bias_explanation: 'No text content to analyze'
                },
                category: {
                    primary: 'general',
                    secondary: 'unclassified',
                    tags: []
                },
                related_articles: [],
                images: [],
                chain_of_thought: {
                    step_1: 'Media received for analysis',
                    step_2: 'OCR processing performed',
                    step_3: 'No meaningful text extracted',
                    step_4: 'Cannot perform fact-checking',
                    step_5: 'Returning unverified status',
                    step_6: 'Analysis complete'
                },
                reasoning: ['No text content found in media to fact-check'],
                detailed_overview: 'The media file was processed but no meaningful text content could be extracted for fact-checking.',
                media_coverage: {
                    left_leaning: [],
                    right_leaning: [],
                    center: [],
                    coverage_analysis: 'No text content available for media coverage analysis'
                },
                local_analysis: {
                    topic_classification: {
                        category: 'general',
                        subcategory: 'unclassified',
                        confidence: 0,
                        matchCount: 0
                    },
                    bias_analysis: {
                        scores: {
                            political: 0,
                            emotional: 0,
                            authority: 0,
                            urgency: 0,
                            absolutes: 0
                        },
                        overallBias: 0,
                        politicalLean: 'neutral',
                        hasSignificantBias: false
                    }
                },
                metadata: {
                    analysis_id: Math.random().toString(36).substr(2, 12),
                    model_used: 'ocr-only',
                    api_version: '2.0.0',
                    processing_time_ms: Date.now() - startTime,
                    total_sources: 0,
                    total_citations: 0,
                    total_images: 0
                }
            });
        }
        
        // Analyze extracted text with Perplexity
        const aiResponse = await callPerplexitySonar(ocrResult.combined_text);
        console.log('🤖 AI analysis of media text complete');
        
        // Perform local analysis for additional insights
        const topicClassification = classifyTopic(ocrResult.combined_text);
        const biasAnalysis = detectBias(ocrResult.combined_text);
        
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            processing_time_ms: Date.now() - startTime,
            mediaType,
            
            // OCR Results
            extractedText: ocrResult.combined_text,
            ocrMetadata: {
                frameCount: ocrResult.frame_count,
                processedSegments: ocrResult.processed_segments,
                averageConfidence: ocrResult.average_confidence,
                ocrProvider: ocrResult.ocr_provider
            },
            
            // Core response matching the /claim endpoint structure
            original_claim: ocrResult.combined_text,
            verdict: aiResponse.verdict,
            sources: aiResponse.sources,
            citations: aiResponse.citations,
            biasness: aiResponse.biasness,
            category: aiResponse.category,
            related_articles: aiResponse.related_articles,
            images: aiResponse.images,
            chain_of_thought: aiResponse.chain_of_thought,
            reasoning: aiResponse.reasoning,
            detailed_overview: aiResponse.detailed_overview,
            media_coverage: aiResponse.media_coverage,
            
            // Additional local analysis for enhancement
            local_analysis: {
                topic_classification: topicClassification,
                bias_analysis: biasAnalysis
            },
            
            // Metadata
            metadata: {
                analysis_id: Math.random().toString(36).substr(2, 12),
                model_used: 'llama-3.1-sonar-large-128k-online',
                api_version: '2.0.0',
                total_sources: aiResponse.sources.length,
                total_citations: aiResponse.citations.length,
                total_images: aiResponse.images.length
            }
        };
        
        console.log('🚀 Media analysis response ready. Processing time:', response.processing_time_ms + 'ms');
        res.json(response);
        
    } catch (error) {
        console.error('Error in analyze-media endpoint:', error);
        
        const errorResponse = {
            success: false,
            error: 'Media analysis failed',
            message: error.message,
            timestamp: new Date().toISOString(),
            fallback_analysis: {
                local_classification: req.body.frames ? null : null,
                local_bias_analysis: req.body.frames ? null : null
            }
        };
        
        let statusCode = 500;
        if (error.message.includes('API key')) {
            statusCode = 503;
        } else if (error.message.includes('rate limit')) {
            statusCode = 429;
        } else if (error.message.includes('timeout')) {
            statusCode = 504;
        }
        
        res.status(statusCode).json(errorResponse);
    }
});

module.exports = router;