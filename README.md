## truth
Don't live in a false world, Find the truth!

## 🧠 Truth – Real-Time AI-Powered Fact Verifier

> 🔍 Analyze claims. Understand context. Reveal the truth.  
> A hackathon project built for the **Perplexity AI Sonar Hackathon 2025**.

---

## 🚀 What is Truth?

## Truth is an AI-powered fact-checking tool that lets users verify controversial or suspicious claims in real time — whether from a conversation, news article, tweet, or meme.

It’s not just another "TRUE/FALSE" classifier.

**Truth explains why?**

Using state-of-the-art analysis (via the Perplexity Sonar API and custom reasoning layers), the app provides:
- ✅ Veracity assessment (TRUE/FALSE/UNCERTAIN)
- 🧠 Chain of Thought (step-by-step reasoning)
- 📌 Key evidence summaries
- 📰 Trusted source linking
- 💬 Tone and sentiment classification
- 📷 OCR pipeline to extract claims from screenshots or images

---------------------------------------------------------------------------------------------------------
| Feature                             | Description                                                     |
| ----------------------------------- | --------------------------------------------------------------- |
| 🔎 **Natural Language Claim Input** | Ask questions like "Did X happen?" or "Is it true that...?"     |
| 📜 **Chain-of-Thought Reasoning**   | Get step-by-step explanations on how the verdict was reached    |
| 📰 **Key Evidence Summary**         | Extracted summaries with links to credible sources              |
| 🧠 **Classification Engine**        | Detects topic (e.g., politics, health), sentiment, and tone     |
| 🖼️ **OCR Image Upload**             | Upload screenshots, tweets, or memes to analyze embedded claims |
--------------------------------------------------------------------------------------------------------


##🛠️ How It Works
Claim Input
Users type a natural language claim or upload an image.

Preprocessing
If image: OCR is run → claim text extracted.
If text: directly analyzed.

Sonar API Integration
Claim is passed to Perplexity Sonar API for fact-verification.

Post-Processing
Extracted JSON is parsed for:

Verdict

Confidence level

Explanation

Source links

Reasoning Layer (Claude)
Chain-of-thought and key reasoning points are derived using LLM prompts.

UI Presentation
Verdict, reasoning, sources, and classification are displayed in an intuitive interface.



##🔧 Tech Stack

| Layer        | Tools                                              |
| ------------ | -------------------------------------------------- |
| Frontend     | React.js, TailwindCSS                              |
| Backend      | Node.js, Express.js                                |
| AI & APIs    | Perplexity Sonar API, Google Vision API OCR, Gnews |
| Data Storage | sessionStorage (for in-browser session history)    |


##📚 Example Use Cases

Verifying political claims during elections

Debunking social media misinformation

Checking health-related rumors or statistics

Detecting scams, hoaxes, or manipulated news screenshots


##🚧 Future Plans

| Current Limitation                   | Upcoming Fix                             |
| ------------------------------------ | ---------------------------------------- |
| Not fully dynamic layout             | Plan to visualize source relationships   |
| No long-term history                 | Will add user sessions                   |
| No real-time social media monitoring | Could integrate with Twitter/Reddit APIs |
| No Chrome extension yet              | Planned as a post-hackathon launch       |

##🧩 Planned Feature: Dynamic Claim-Source Map (UI Blueprint)
We are actively designing an interactive UI feature that visually maps claims to their supporting or refuting sources.

What it will do:

📌 Dynamically plot each claim at the center

🕸️ Surround it with nodes representing sources (news articles, evidence, counterclaims)

🔗 Use graph links to show relationships (support/refute/neutral)

🧠 Color-coded for quick understanding: green (support), red (refute), gray (neutral)

👆 Fully interactive — users can click any node to preview source content and influence on verdict

Inspiration:
Think of it as a "mind map for truth" — allowing users to trace how a claim is built, debated, or discredited.

⚠️ Due to time constraints, this visualization was postponed to post-hackathon development — but its system design is complete and modularly integrated.


##👥 Team
Built by Ansh Deshraj
Special thanks to Perplexity AI for the Sonar API.

##📣 Final Thought
"In a world full of noise, Truth speaks with clarity."
Try it. Ask it anything. See how AI can explain, not just answer.

