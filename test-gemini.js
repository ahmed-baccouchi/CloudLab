const axios = require('axios');

const API_KEY = 'REPLACE_WITH_YOUR_LLM_API_KEY';

async function testGemini() {
  console.log('ðŸ” Testing Gemini API...\n');

  // Test 1: List available models
  console.log('ðŸ“‹ Step 1: Listing available models...');
  try {
    const modelsResponse = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
    );
    
    console.log('âœ… Available models:');
    modelsResponse.data.models.forEach(model => {
      if (model.name.includes('gemini') && model.supportedGenerationMethods?.includes('generateContent')) {
        console.log(`   - ${model.name.replace('models/', '')}`);
      }
    });
    console.log('');
  } catch (err) {
    console.error('âŒ Failed to list models:', err.response?.data || err.message);
    return;
  }

  // Test 2: Try generating content
  console.log('ðŸ§ª Step 2: Testing content generation...');
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-latest:generateContent?key=${API_KEY}`,
      {
        contents: [{
          parts: [{
            text: 'Generate a simple JSON object with a "message" field saying "Hello from Gemini"'
          }]
        }]
      }
    );
    
    const content = response.data.candidates[0].content.parts[0].text;
    console.log('âœ… Generated content:');
    console.log(content);
    console.log('\nâœ¨ SUCCESS! Gemini API is working correctly.');
  } catch (err) {
    console.error('âŒ Failed to generate content:', err.response?.data || err.message);
  }
}

testGemini();
