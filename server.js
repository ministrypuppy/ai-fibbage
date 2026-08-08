const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

let recentQuestionsHistory = [];

app.post('/api/generate-question', async (req, res) => {
  try {
    const systemPrompt = `You are a trivia generator for a game like Fibbage. 
    Generate ONE bizarre, unusual, but 100% true historical, legal, or scientific fact formatted as a fill-in-the-blank statement. 
    The correct answer MUST be strictly no more than 3 words and no more than 20 characters total. 
    Avoid repeating any of these recent topics/questions: ${JSON.stringify(recentQuestionsHistory)}`;

    // TODO: Replace with your actual AI API call (e.g., OpenAI / Gemini SDK)
    
    const newQuestion = {
      prompt: "In 1952, a small town passed an ordinance making it illegal to walk down Main Street wearing __________.",
      answer: "Ice cream" // Under 3 words, under 20 chars
    };

    recentQuestionsHistory.push(newQuestion.prompt);
    if (recentQuestionsHistory.length > 20) {
      recentQuestionsHistory.shift();
    }

    res.json(newQuestion);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate AI question" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});