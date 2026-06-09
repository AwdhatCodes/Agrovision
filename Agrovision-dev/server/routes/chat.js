import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chatbotResponse } from '../chatbot.js'

const MODEL_NAME = 'models/gemini-2.5-pro'
const __dirname = dirname(fileURLToPath(import.meta.url))
const localKnowledge = JSON.parse(readFileSync(join(__dirname, '../data/local-knowledge.json'), 'utf8'))

function buildAdvicePrompt(disease, question) {
  const description = `You are a farming advisor speaking to potato farmers in simple, practical, farmer-friendly language.`
  const diseaseContext = disease ? `The disease is ${disease}. Explain it simply. Use the disease name as context.` : ''

  const guidance = [
    'Explain the disease in simple language.',
    'Describe its causes.',
    'Describe the symptoms if relevant.',
    'Describe treatment steps.',
    'Describe prevention advice.',
    'Keep responses short, clear, and easy for a farmer to follow.',
  ]

  const questionPart = question ? `Also answer this question directly: ${question}` : ''

  return [description, diseaseContext, ...guidance, questionPart].filter(Boolean).join('\n')
}

function modelFactory() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const error = new Error('GEMINI_API_KEY is not configured')
    error.code = 'MISSING_GEMINI_KEY'
    throw error
  }
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODEL_NAME })
}

function extractTextFromResponse(response) {
  const candidate = response?.response?.candidates?.[0]
  const content = candidate?.content
  if (!content?.parts?.length) return null
  return content.parts.map(part => (part?.text || '')).join('').trim()
}

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[_-]/g, ' ').trim()
}

function getLocalAdvice(disease, question) {
  const normalizedDisease = normalizeText(disease)
  if (normalizedDisease) {
    for (const [key, info] of Object.entries(localKnowledge.diseases)) {
      if (normalizeText(key) === normalizedDisease) return info.advice
      if (Array.isArray(info.aliases) && info.aliases.some(alias => normalizeText(alias) === normalizedDisease)) return info.advice
      if (info.name && normalizeText(info.name) === normalizedDisease) return info.advice
    }
  }

  const normalizedQuestion = normalizeText(question)
  if (normalizedQuestion) {
    for (const [key, info] of Object.entries(localKnowledge.diseases)) {
      const diseaseName = normalizeText(info.name || key)
      const diseaseKey = normalizeText(key)
      const aliasMatch = Array.isArray(info.aliases) && info.aliases.some(alias => normalizedQuestion.includes(normalizeText(alias)))
      if (normalizedQuestion.includes(diseaseName) || normalizedQuestion.includes(diseaseKey) || aliasMatch) {
        return info.advice
      }
    }

    for (const item of localKnowledge.general || []) {
      if (item.keywords.some(keyword => {
        const normalizedKeyword = normalizeText(keyword)
        if (normalizedQuestion.includes(normalizedKeyword)) return true
        return normalizedKeyword.split(' ').every(word => word && normalizedQuestion.includes(word))
      })) {
        return item.advice
      }
    }
  }

  if (normalizedDisease || normalizedQuestion) {
    return localKnowledge.fallback
  }

  return null
}

export async function adviceHandler(req, res) {
  try {
    const { disease, question } = req.body || {}
    const q = typeof question === 'string' ? question.trim() : ''

    if ((!disease || typeof disease !== 'string' || !disease.trim()) && !q) {
      return res.status(400).json({ error: 'Either disease (string) or a question (string) is required' })
    }

    const diseaseName = disease && typeof disease === 'string' ? disease.trim() : ''
    const prompt = buildAdvicePrompt(diseaseName, q)

    try {
      const model = modelFactory()
      const result = await model.generateContent(prompt, {
        maxOutputTokens: 450,
        temperature: 0.35,
        topP: 0.9,
      })

      const advice = extractTextFromResponse(result)
      if (advice) {
        return res.json({ advice })
      }
      console.warn('Chat advice warning: no Gemini advice text returned, falling back to local knowledge')
    } catch (error) {
      console.error('Chat advice Gemini error:', error)
      if (error.code === 'MISSING_GEMINI_KEY' || error.message?.includes('GEMINI_API_KEY')) {
        console.warn('Gemini API key missing: using local knowledge fallback')
      } else if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
        console.warn('Gemini rate limit/quota exceeded: using local knowledge fallback')
      } else if (error.status === 404 && error.message?.includes('not found')) {
        console.warn('Gemini model not available: using local knowledge fallback')
      } else {
        console.warn('Gemini request failed: using local knowledge fallback')
      }
    }

    const localReply = chatbotResponse(diseaseName || q, {})
    return res.json({ advice: localReply.text, source: 'local' })
  } catch (error) {
    console.error('Chat advice error:', error)
    return res.status(500).json({ error: 'Failed to handle advice request' })
  }
}
