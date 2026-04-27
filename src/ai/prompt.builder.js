export const buildPrompt = ({ idea, postType, tone, language, platforms }) => {
  const platformRules = {
    twitter: "Twitter/X: Max 280 characters, 2–3 hashtags, punchy opener, hooks first.",
    linkedin: "LinkedIn: 800–1300 characters, always professional tone regardless of global tone setting, 3–5 hashtags.",
    instagram: "Instagram: Caption + 10–15 hashtags, emoji-friendly.",
    threads: "Threads: 500 characters max, conversational style.",
  };

  const selectedRules = platforms.map(p => platformRules[p]).join('\n');

  return `
    You are an expert social media content creator. Generate content for the following platforms based on this idea:
    
    IDEA: ${idea}
    TYPE: ${postType}
    GLOBAL TONE: ${tone}
    LANGUAGE: ${language}
    
    PLATFORM RULES:
    ${selectedRules}
    
    RESPONSE FORMAT:
    Return ONLY a valid JSON object where keys are the platform names (e.g., "twitter", "linkedin").
    Each platform object must contain:
    - "content": The generated text
    - "hashtags": Array of hashtags (if applicable)
    - "char_count": length of the content
    
    Example:
    {
      "twitter": { "content": "...", "hashtags": ["#tag1"], "char_count": 140 },
      ...
    }
    
    Strictly follow the character limits and style for each platform.
  `;
};
