import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chatbotResponse } from '../chatbot.js'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama2'
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || '30000')

const __dirname = dirname(fileURLToPath(import.meta.url))
const localKnowledge = JSON.parse(readFileSync(join(__dirname, '../data/local-knowledge.json'), 'utf8'))
const knowledgeBase = JSON.parse(readFileSync(join(__dirname, '../knowledgeBase.json'), 'utf8'))

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[_-]/g, ' ').trim()
}

function getHumanDiseaseName(value) {
  const normalized = normalizeText(value)
  if (!normalized) return ''
  return normalized.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function getLocalKnowledgeSummary() {
  return Object.values(localKnowledge.diseases)
    .map((item) => `- ${item.name}: ${item.advice}`)
    .join('\n')
}

function getKnowledgeBaseSummary() {
  const diseaseLines = Object.values(knowledgeBase.diseases)
    .map((info) => `- ${info.name}: cause=${info.cause}; symptoms=${info.symptoms}; treatment=${info.treatment}; prevention=${info.prevention}`)
    .join('\n')

  const actionLines = Object.entries(knowledgeBase.actions)
    .map(([key, action]) => `- ${action.name || key}: ${action.advice}`)
    .join('\n')

  return [diseaseLines, actionLines].filter(Boolean).join('\n')
}

function buildOllamaPrompt(disease, question, lang) {
  const langInstruction = lang === 'SW'
    ? 'Answer all questions only in Swahili, using simple, practical, farmer-friendly language. Do not use English or mix languages.'
    : 'Answer all questions only in English, using simple, practical, farmer-friendly language. Do not use Swahili or mix languages.'

  const description = [
    'You are an expert potato farming advisor.',
    langInstruction,
    'Use the available local knowledge and knowledge base when you respond.',
    'If you do not have enough information, say you can only help with potato diseases and farming advice.'
  ].join(' ')

  const diseaseContext = disease ? `Specific disease mentioned: ${disease.trim()}` : ''
  const knowledgeContext = [
    'Local knowledge summaries:',
    getLocalKnowledgeSummary(),
    '',
    'Knowledge base summaries:',
    getKnowledgeBaseSummary()
  ].join('\n')

  const questionPart = question ? `User question: ${question.trim()}` : 'User question: Please provide general potato farming advice.'

  return [description, diseaseContext, knowledgeContext, questionPart]
    .filter(Boolean)
    .join('\n\n')
}

async function callOllama(prompt) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS)

  try {
    const response = await fetch(`${OLLAMA_URL}/v1/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        max_tokens: 450,
        temperature: 0.35,
        top_p: 0.9
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      const error = new Error(`Ollama error ${response.status}: ${text}`)
      error.status = response.status
      throw error
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

function extractTextFromResponse(response) {
  const text = response?.choices?.[0]?.text
  return typeof text === 'string' ? text.trim() : null
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
    const { disease, question, lang } = req.body || {}
    const q = typeof question === 'string' ? question.trim() : ''
    const langCode = lang === 'SW' ? 'SW' : 'EN'

    if ((!disease || typeof disease !== 'string' || !disease.trim()) && !q) {
      return res.status(400).json({ error: 'Either disease (string) or a question (string) is required' })
    }

    const diseaseName = disease && typeof disease === 'string' ? getHumanDiseaseName(disease.trim()) : ''
    const questionText = q || (diseaseName
      ? (langCode === 'SW'
        ? `Tafadhali elezea ${diseaseName} na jinsi ya kuipatia matibabu.`
        : `Please explain ${diseaseName} and how to treat it.`)
      : '')
    const prompt = buildOllamaPrompt(diseaseName, questionText, langCode)

    let ollamaAvailable = false
    try {
      const result = await callOllama(prompt)
      let advice = extractTextFromResponse(result)
      if (advice) {
        if (langCode === 'SW') {
          try {
            const translatePrompt = `Translate the following text to Swahili using simple, practical, farmer-friendly language. Output only the translated text:\n\n${advice}`
            const trRes = await callOllama(translatePrompt)
            const translated = extractTextFromResponse(trRes)
            if (translated) advice = translated
          } catch (tErr) {
            console.warn('Ollama translation failed, returning Ollama response')
          }
        }
        return res.json({ advice, source: 'ollama' })
      }
      console.warn('Ollama: no answer returned; using local knowledge')
    } catch (error) {
      ollamaAvailable = false
      console.log('Ollama unavailable, using local knowledge base')
    }

    const localReply = chatbotResponse(diseaseName || q, {}, langCode)
    let advice = localReply.text

    if (langCode === 'SW' && advice && ollamaAvailable) {
      try {
        const translatePrompt = `Translate the following text to Swahili using simple, practical, farmer-friendly language. Output only the translated text:\n\n${advice}`
        const trRes = await callOllama(translatePrompt)
        const translated = extractTextFromResponse(trRes)
        if (translated) advice = translated
      } catch (tErr) {
        console.warn('Local reply translation failed, returning local Swahili response')
      }
    }

    return res.json({ advice, source: 'local' })
  } catch (error) {
    console.error('Chat advice error:', error)
    return res.status(500).json({ error: 'Failed to handle advice request' })
  }
}
