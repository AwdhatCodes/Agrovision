import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const knowledgeBase = JSON.parse(readFileSync(join(__dirname, 'knowledgeBase.json'), 'utf8'))

function normalizeText(text) {
  return String(text || '').toLowerCase().trim()
}

function getRandom(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function includesAny(text, list) {
  const normalizedText = normalizeText(text)
  return list.some(item => normalizedText.includes(normalizeText(item)))
}

function extractName(input) {
  const normalized = normalizeText(input)
  const namePatterns = [
    /my name is\s+([a-zA-ZÀ-ÿ\s]+)/i,
    /i am\s+([a-zA-ZÀ-ÿ\s]+)/i,
    /call me\s+([a-zA-ZÀ-ÿ\s]+)/i
  ]

  for (const pattern of namePatterns) {
    const match = input.match(pattern)
    if (match && match[1]) {
      return match[1].trim().split(' ')[0]
    }
  }

  return null
}

function formatName(name) {
  if (!name) return ''
  return name
    .trim()
    .split(' ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function getGreetingResponse(userSession) {
  const name = formatName(userSession?.name)
  const response = getRandom(knowledgeBase.greetings.responses)
  return name ? `${response} Nice to see you, ${name} 👨‍🌾` : response
}

function getPersonalizationResponse(name) {
  const template = getRandom(knowledgeBase.personalization.responses)
  return template.replace('{name}', name)
}

function findDiseaseMatch(input) {
  const normalizedInput = normalizeText(input)
  for (const [key, disease] of Object.entries(knowledgeBase.diseases)) {
    const normalizedDiseaseName = normalizeText(disease.name || key)
    if (normalizedInput.includes(normalizedDiseaseName) || normalizedInput.includes(normalizeText(key))) {
      return { key, disease }
    }
  }
  return null
}

function findActionMatch(input) {
  const normalizedInput = normalizeText(input)
  for (const [actionKey, action] of Object.entries(knowledgeBase.actions)) {
    if (includesAny(normalizedInput, action.keywords || [])) {
      return { actionKey, action }
    }
  }
  return null
}

function formatDiseaseResponse(disease, name) {
  const prefix = name ? `Okay ${name}, here is what I suggest:\n` : ''
  const severity = String(disease.severity || '').toLowerCase()
  const urgency = severity === 'high'
    ? '🚨 Action: Act quickly — this disease spreads very fast and can destroy your crop.'
    : severity === 'medium'
      ? 'ℹ Advice: Treat early to prevent spreading.'
      : '✅ Good news! Keep monitoring your crop and use good farming practices.'

  return `${prefix}⚠️ Disease Detected: ${disease.name}\n\n🌱 Simple Explanation: ${disease.advice}\n\n🦠 Cause: ${disease.cause}\n🔍 Symptoms: ${disease.symptoms}\n💊 Treatment: ${disease.treatment}\n🛡 Prevention: ${disease.prevention}\n\n${urgency}`
}

function getFallbackResponse(type = 'unknown') {
  if (type === 'no_disease') {
    return getRandom(knowledgeBase.fallback.no_disease_responses)
  }
  return getRandom(knowledgeBase.fallback.unknown_responses)
}

export function chatbotResponse(input, userSession = {}) {
  const text = String(input || '').trim()
  if (!text) {
    return {
      text: knowledgeBase.fallback.help,
      intent: 'fallback',
      userSession
    }
  }

  const normalizedText = normalizeText(text)

  if (includesAny(normalizedText, knowledgeBase.greetings.keywords)) {
    return {
      text: getGreetingResponse(userSession),
      intent: 'greeting',
      userSession
    }
  }

  const extractedName = extractName(text)
  if (extractedName) {
    const formattedName = formatName(extractedName)
    userSession.name = formattedName
    return {
      text: getPersonalizationResponse(formattedName),
      intent: 'name_introduction',
      userSession
    }
  }

  const diseaseMatch = findDiseaseMatch(text)
  if (diseaseMatch) {
    const { key, disease } = diseaseMatch
    userSession.last_disease = key
    const name = formatName(userSession?.name)
    return {
      text: formatDiseaseResponse(disease, name),
      intent: 'disease',
      disease: key,
      userSession
    }
  }

  const actionMatch = findActionMatch(text)
  if (actionMatch) {
    const { actionKey, action } = actionMatch
    userSession.last_action = actionKey
    const name = formatName(userSession?.name)
    const prefix = name ? `Sure ${name}, ` : ''
    return {
      text: `${prefix}${action.advice}`,
      intent: 'action',
      action: actionKey,
      userSession
    }
  }

  if (normalizedText.includes('disease') || normalizedText.includes('problem')) {
    return {
      text: getFallbackResponse('no_disease'),
      intent: 'fallback',
      userSession
    }
  }

  return {
    text: getFallbackResponse('unknown'),
    intent: 'fallback',
    userSession
  }
}
