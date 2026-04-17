const axios = require('axios');

/**
 * OllamaClient: Clean wrapper around the Ollama REST API.
 */
class OllamaClient {
  constructor() {
    this.baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.isAvailable = false;
  }

  /**
   * Check if Ollama is running and the model is available.
   * @returns {Promise<boolean>}
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 5000 });
      if (response.data && Array.isArray(response.data.models)) {
        const baseModelName = this.model.split(':')[0];
        const found = response.data.models.some(m => m.name.startsWith(baseModelName));
        
        if (found) {
          this.isAvailable = true;
          console.log(`[OLLAMA] Health: READY — Model: ${this.model}`);
          return true;
        }
      }
      this.isAvailable = false;
      console.log(`[OLLAMA] Health: OFFLINE — Model ${this.model} not found in tags`);
      return false;
    } catch (error) {
      this.isAvailable = false;
      console.log(`[OLLAMA] Health: OFFLINE — ${error.message}`);
      return false;
    }
  }

  /**
   * Analyze a prompt using Ollama.
   * @param {string} prompt 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async analyze(prompt, options = {}) {
    const {
      temperature = 0.1,
      maxTokens = 1024,
      format = 'json',
      retries = 2
    } = options;

    const timeout = parseInt(process.env.AI_REQUEST_TIMEOUT) || 60000;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await axios.post(`${this.baseUrl}/api/generate`, {
          model: this.model,
          prompt: prompt,
          stream: false,
          format: format,
          options: {
            temperature,
            num_predict: maxTokens,
            top_p: 0.9,
            repeat_penalty: 1.1
          }
        }, { timeout });

        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
        const rawResponse = response.data.response;

        try {
          const parsedJSON = JSON.parse(rawResponse);
          return {
            success: true,
            data: parsedJSON,
            model: this.model,
            processingTime
          };
        } catch (parseError) {
          console.warn('[OLLAMA] JSON parse failed, returning raw response');
          return {
            success: true,
            data: { raw_analysis: rawResponse },
            parseWarning: 'Response was not valid JSON',
            model: this.model,
            processingTime
          };
        }
      } catch (error) {
        console.warn(`[OLLAMA] Attempt ${attempt + 1} failed: ${error.message}`);
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        } else {
          return {
            success: false,
            error: error.message,
            fallback: true
          };
        }
      }
    }
  }
}

const ollamaClient = new OllamaClient();

module.exports = { OllamaClient, ollamaClient };
