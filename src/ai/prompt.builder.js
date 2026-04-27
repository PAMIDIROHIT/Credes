export const buildPrompt = ({ idea, postType, tone, language, platforms }) => {
  const platformRules = {
    twitter: "Twitter/X: Max 280 characters. 2-3 hashtags. Punchy opener. No threads.",
    linkedin: "LinkedIn: 800-1300 characters. Professional regardless of global tone. 3-5 hashtags.",
    instagram: "Instagram: Caption + 10-15 hashtags. Emoji-friendly.",
    threads: "Threads: 500 characters max. Conversational.",
  };

  const selectedRules = platforms.map(p => `- ${platformRules[p]}`).join('\n');

  return `
    You are a Senior Social Media Strategist. Your goal is to maximize engagement across different platforms.
    
    CORE IDEA: "${idea}"
    CONTENT TYPE: ${postType}
    OVERALL TONE: ${tone}
    OUTPUT LANGUAGE: ${language}
    
    INSTRUCTIONS:
    1. Adapt the CORE IDEA ONLY for the following platforms: ${platforms.map(p => p.toUpperCase()).join(', ')}.
    2. Strictly follow the specific rules for each platform.
    3. Ensure the tone is consistent with the GLOBAL TONE, except for LinkedIn where it should remain Professional/Authoritative.
    4. ABSOLUTELY DO NOT return JSON objects for platforms that were not explicitly listed above.
    
    PLATFORM-SPECIFIC GUIDELINES:
    ${selectedRules}
    
    RESPONSE FORMAT:
    You MUST return a JSON object. No extra text before or after the JSON.
    Format:
    {
      "<platform_name>": {
        "content": "Full text of the post",
        "hashtags": ["#tag1", "#tag2"],
        "char_count": length_in_characters
      }
    }
    
    Ensure the JSON is perfectly valid and escape all double quotes within the content.
  `;
};
