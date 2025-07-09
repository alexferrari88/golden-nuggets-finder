// Test script to verify Gemini API implementation
// This script tests the current implementation without using the official SDK

const GEMINI_CONFIG = {
  MODEL: 'gemini-2.5-flash',
  THINKING_BUDGET: -1
};

const GOLDEN_NUGGET_SCHEMA = {
  type: "object",
  properties: {
    golden_nuggets: {
      type: "array",
      description: "An array of extracted golden nuggets.",
      minItems: 0,
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "The category of the extracted golden nugget.",
            enum: ["tool", "media", "explanation", "analogy", "model"]
          },
          content: {
            type: "string",
            description: "The original comment(s) verbatim, without any changes to wording or symbols."
          },
          synthesis: {
            type: "string",
            description: "A concise explanation of why this is relevant to the persona, connecting it to their core interests or cognitive profile."
          }
        },
        required: ["type", "content", "synthesis"]
      }
    }
  },
  required: ["golden_nuggets"]
};

async function testGeminiApi(apiKey) {
  if (!apiKey) {
    console.error('Please provide a Gemini API key as the first argument');
    return;
  }

  console.log('Testing Gemini API implementation...\n');

  const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  // Test content
  const testContent = `
    This is a test article about artificial intelligence. 
    
    AI has revolutionized how we approach problem-solving. One interesting tool is the use of analogies 
    to explain complex concepts. For example, neural networks can be thought of as interconnected 
    neurons in a brain, where each connection has a weight that determines how much influence one 
    neuron has on another.
    
    The key insight is that this biological metaphor helps us understand how information flows through 
    the system. When we train a neural network, we're essentially adjusting these weights to make 
    the system better at pattern recognition.
    
    From first principles, this is really about optimization - finding the best set of parameters 
    that minimize prediction error. It's a beautiful example of how mathematical optimization 
    principles apply to real-world problems.
  `;

  const testPrompt = `Extract golden nuggets that would be valuable for a pragmatic synthesizer with ADHD. 
  Focus on actionable insights, elegant principles, tools, analogies, and explanations that connect to 
  first principles thinking. Prioritize content that answers "how things work" or provides practical synthesis.`;

  try {
    // Test 1: API Key Validation
    console.log('1. Testing API key validation...');
    const validationResult = await testApiKeyValidation(apiKey);
    console.log(`   API Key Valid: ${validationResult ? '✓' : '✗'}\n`);

    if (!validationResult) {
      console.error('Invalid API key. Cannot proceed with further tests.');
      return;
    }

    // Test 2: Content Analysis
    console.log('2. Testing content analysis...');
    const analysisResult = await testContentAnalysis(apiKey, testContent, testPrompt);
    console.log(`   Analysis Success: ${analysisResult ? '✓' : '✗'}\n`);

    // Test 3: Error Handling
    console.log('3. Testing error handling...');
    await testErrorHandling(apiKey);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

async function testApiKeyValidation(apiKey) {
  const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  try {
    const testRequestBody = {
      contents: [{
        parts: [{ text: "Test message" }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            test: {
              type: "string"
            }
          },
          required: ["test"]
        }
      }
    };

    const response = await fetch(`${API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(testRequestBody)
    });

    return response.ok;
  } catch (error) {
    console.error('   API key validation error:', error.message);
    return false;
  }
}

async function testContentAnalysis(apiKey, content, userPrompt) {
  const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  try {
    const fullPrompt = `${content}\n\n${userPrompt}`;
    
    const requestBody = {
      contents: [{
        parts: [{ text: fullPrompt }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GOLDEN_NUGGET_SCHEMA,
        thinkingConfig: {
          thinkingBudget: GEMINI_CONFIG.THINKING_BUDGET
        }
      }
    };

    console.log('   Sending request to Gemini API...');
    const response = await fetch(`${API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`   API Error: ${response.status} ${response.statusText} - ${errorText}`);
      return false;
    }

    const responseData = await response.json();
    console.log('   Raw API Response:', JSON.stringify(responseData, null, 2));
    
    // Extract the text from the response
    const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error('   No response text received from Gemini API');
      return false;
    }

    console.log('   Response Text:', responseText);
    
    const result = JSON.parse(responseText);
    console.log('   Parsed Result:', JSON.stringify(result, null, 2));
    
    // Validate the response structure
    if (!result.golden_nuggets || !Array.isArray(result.golden_nuggets)) {
      console.error('   Invalid response format from Gemini API');
      return false;
    }

    console.log(`   Found ${result.golden_nuggets.length} golden nuggets:`);
    result.golden_nuggets.forEach((nugget, index) => {
      console.log(`     ${index + 1}. [${nugget.type}] ${nugget.content.substring(0, 50)}...`);
      console.log(`        Synthesis: ${nugget.synthesis.substring(0, 80)}...`);
    });

    return true;
  } catch (error) {
    console.error('   Content analysis error:', error.message);
    return false;
  }
}

async function testErrorHandling(apiKey) {
  const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
  
  // Test with invalid API key
  console.log('   Testing with invalid API key...');
  try {
    const requestBody = {
      contents: [{
        parts: [{ text: "Test" }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: GOLDEN_NUGGET_SCHEMA
      }
    };

    const response = await fetch(`${API_BASE_URL}/${GEMINI_CONFIG.MODEL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': 'invalid-key'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.log('   ✓ Properly handles invalid API key');
    } else {
      console.log('   ✗ Should have failed with invalid API key');
    }
  } catch (error) {
    console.log('   ✓ Properly handles network errors');
  }
}

// Run the test if this script is executed directly
if (typeof process !== 'undefined' && process.argv) {
  const apiKey = process.argv[2];
  testGeminiApi(apiKey);
}

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testGeminiApi };
}