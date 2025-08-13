# Ollama Local AI Integration Guide

## Overview

Ollama integration provides **completely free, unlimited, and private** AI parsing for your karaoke website parser. This is now the **highest priority** parsing method, eliminating the need for external API quotas and costs.

## Benefits of Using Ollama

### 🆓 **Zero Cost**

- No API fees or quotas
- Unlimited parsing requests
- One-time setup, lifetime usage

### 🔒 **Complete Privacy**

- All data stays on your local machine
- No external API calls for AI processing
- Sensitive website content never leaves your server

### ⚡ **Performance**

- No network latency for AI requests
- Fast local inference (especially with GPU acceleration)
- No rate limiting or throttling

### 🚀 **Reliability**

- No internet dependency for AI features
- No quota exhaustion or API downtime
- Works even when external APIs are unavailable

## Setup Instructions

### 1. Install Ollama

Download and install Ollama from: https://ollama.ai/

**Windows:**

```bash
# Download the Ollama installer from ollama.ai
# Run the installer and follow the setup wizard
```

**macOS:**

```bash
brew install ollama
```

**Linux:**

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Download Recommended Models

After installing Ollama, download some models optimized for text analysis:

```bash
# Recommended models for karaoke parsing (choose based on your system):

# Lightweight, fast (2GB RAM)
ollama pull llama3.2:3b

# Balanced performance/quality (4GB RAM) - Default
ollama pull llama3.1:8b

# High quality (8GB+ RAM)
ollama pull llama3.1:70b

# Code-optimized alternative
ollama pull codellama:7b
```

### 3. Verify Installation

```bash
# Check if Ollama is running
ollama list

# Test with a simple chat
ollama run llama3.1:8b
```

### 4. Configure Your Application

The application will automatically detect and use Ollama if it's running. Configuration in `.env`:

```bash
# Ollama Configuration (Local AI - Highest Priority)
OLLAMA_HOST=http://localhost:11434  # Default Ollama host
OLLAMA_MODEL=llama3.1:8b           # Model to use for parsing
```

## Model Recommendations

### For Different System Specs:

| System RAM | Recommended Model | Performance                |
| ---------- | ----------------- | -------------------------- |
| 4GB-8GB    | `llama3.2:3b`     | Fast, basic quality        |
| 8GB-16GB   | `llama3.1:8b`     | **Balanced (recommended)** |
| 16GB+      | `llama3.1:70b`    | Highest quality            |

### Model Selection Tips:

- **3B models**: Perfect for simple parsing tasks, very fast
- **7B-8B models**: Best balance of speed and accuracy
- **70B models**: Overkill for parsing but highest accuracy

## Usage Priority Order

The application now uses AI providers in this order:

1. **🥇 Ollama** (Local) - Zero cost, unlimited
2. **🥈 Cheerio** (Pattern matching) - Zero cost, limited accuracy
3. **🥉 Gemini** (Cloud) - Limited quota, good quality
4. **🏅 OpenAI** (Cloud) - Pay-per-use, high quality

## Monitoring Ollama Usage

### Logs to Watch:

```bash
✅ "Ollama connected successfully. Available models: llama3.1:8b, ..."
✅ "Using Ollama model: llama3.1:8b"
✅ "Used Ollama (local model - no quota used)"
⚠️  "Ollama failed, falling back to cloud AI: [error]"
```

### Health Check:

Visit `/api/health` to see AI provider status:

```json
{
  "hasGeminiApiKey": true,
  "hasOpenAiApiKey": true,
  "hasOllamaConfig": true, // ← New Ollama status
  "timestamp": "2025-08-13T..."
}
```

## Performance Optimization

### GPU Acceleration (Recommended)

If you have a compatible GPU, Ollama will automatically use it for much faster inference:

```bash
# Check if GPU is detected
ollama info

# You should see CUDA/Metal/ROCm listed if GPU acceleration is available
```

### CPU Optimization

For CPU-only systems:

- Use smaller models (3B-8B parameters)
- Consider reducing `num_predict` in the Ollama method for faster responses
- Ensure adequate RAM for the chosen model

### Memory Management

```bash
# Monitor Ollama memory usage
ollama ps

# Stop unused models to free RAM
ollama stop llama3.1:8b
```

## Troubleshooting

### Common Issues:

#### "Failed to connect to Ollama"

```bash
# 1. Check if Ollama is running
ollama list

# 2. Start Ollama service (if not running)
ollama serve

# 3. Verify the host/port
curl http://localhost:11434/api/version
```

#### "Model not found"

```bash
# Check available models
ollama list

# Download the model specified in OLLAMA_MODEL
ollama pull llama3.1:8b
```

#### Poor Parsing Quality

- Try a larger model (`llama3.1:70b` instead of `3b`)
- Adjust the prompt in `buildAIPrompt()` method
- Increase `num_predict` for longer responses

#### High Memory Usage

- Use a smaller model (`llama3.2:3b`)
- Reduce model context window
- Ensure no other heavy applications are running

## Advanced Configuration

### Custom Model Settings

You can modify the Ollama analysis method in the parser service:

```typescript
const response = await this.ollama.chat({
  model,
  messages: [{ role: 'user', content: prompt }],
  options: {
    temperature: 0.1, // Lower = more focused responses
    top_p: 0.9, // Nucleus sampling
    num_predict: 2000, // Max tokens to generate
    num_ctx: 4096, // Context window size
  },
});
```

### Multiple Models

You can run multiple models for different tasks:

```bash
OLLAMA_MODEL_GENERAL=llama3.1:8b      # General parsing
OLLAMA_MODEL_CODE=codellama:7b        # Code/structured data
```

## Migration Benefits

### Before (Cloud APIs Only):

- ❌ Gemini quota: 100 calls/day limit
- ❌ OpenAI costs: ~$0.002 per 1K tokens
- ❌ Network dependency and latency
- ❌ Data privacy concerns

### After (With Ollama):

- ✅ **Unlimited local parsing**
- ✅ **Zero ongoing costs**
- ✅ **Complete privacy**
- ✅ **Faster responses** (no network calls)
- ✅ **Always available** (no external dependencies)

## Cost Analysis

### Traditional Setup (Cloud Only):

- Heavy parsing: $10-50/month in API costs
- Quota management complexity
- Service interruptions when limits hit

### With Ollama:

- Initial setup: 30 minutes
- Ongoing costs: $0/month
- Hardware requirement: 4-16GB RAM (typical modern server)

**ROI**: Ollama pays for itself immediately and provides unlimited scaling!

Your parsing service is now completely self-sufficient and will prioritize free, unlimited local AI over expensive cloud APIs! 🎉
