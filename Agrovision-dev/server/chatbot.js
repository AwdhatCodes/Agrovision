import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const knowledgeBase = JSON.parse(readFileSync(join(__dirname, 'knowledgeBase.json'), 'utf8'))

const swKnowledge = {
  greetings: {
    responses: [
      'Habari 👋 Mimi ni msaidizi wako wa kilimo. Ninaweza kukusaidia vipi leo?',
      'Habari! Naweza kukusaidia kutambua magonjwa na kutoa ushauri wa kilimo.',
      'Asubuhi njema 🌤 Niambie kinachoendelea kwenye mimea yako.',
      'Habari ya jioni 🌙 Uliza lolote kuhusu mimea yako.'
    ]
  },
  personalization: {
    responses: [
      'Nimefurahi kukuona {name} 👨‍🌾 Nitakusaidia kutunza mazao yako.',
      'Imechakaa 👍 Nitakumbuka jina lako, Mkulima {name}.',
      'Karibu tena {name} 👋 Hebu tuchunguze mazao yako.'
    ]
  },
  fallback: {
    unknown_responses: [
      'Ninaweza kusaidia kuhusu magonjwa ya viazi na ushauri wa kilimo tu 🌱',
      'Sikulielewa hiyo. Jaribu kuuliza kuhusu magonjwa kama Blight ya Mapema au Blight ya Marehemu.',
      'Tafadhali fanya swali la kilimo au kuhusu dalili za ugonjwa.',
      'Siwezi kutambua tatizo hilo. Unaweza kumhitaji mtaalamu wa kilimo.'
    ],
    no_disease_responses: [
      'Sikuweza kupata ugonjwa huo kwenye orodha yangu. Jaribu Blight ya Mapema, Blight ya Marehemu, au hali ya afya ya mimea.',
      'Nafahamu magonjwa machache ya viazi. Uliza kuhusu Blight ya Mapema, Blight ya Marehemu, au jinsi ya kuzuia magonjwa.',
      'Ugonjwa huo hauko kwenye orodha yangu bado. Uliza kuhusu magonjwa ya kawaida ya viazi ninayoyajua.'
    ],
    help: 'Uliza kuhusu dalili za magonjwa ya viazi, matibabu, kuzuia, au nipe jina lako ili nikukumbuke.'
  },
  diseases: {
    'late blight': {
      name: 'Blight ya Marehemu',
      cause: 'Kisababishi ni kimelea kinachosambaa haraka katika hali baridi na mvua.',
      symptoms: 'Madoa meusi kwenye majani, matawi, na viazi yenye ukingo mweupe wa unyevu.',
      treatment: 'Ondoa mimea iliyoathirika, uwe na umahiri wa maji, na tumia dawa salama ya kuua vimelea ikiwa inahitajika.',
      prevention: 'Panda aina zinazostahimili, epuka kumwagilia juu, na geuza mazao kila mwaka.',
      advice: 'Blight ya Marehemu inasambaa haraka. Ondoa majani yaliyoathirika, iweke mimea kwenye hewa, na linda mazao kwa dawa ikiwa inahitajika.'
    },
    'early blight': {
      name: 'Blight ya Mapema',
      cause: 'Kimelea hukua kwenye majani ya zamani wakati wa joto na unyevu.',
      symptoms: 'Madoa madogo meusi yenye pete ambazo hukua kuwa maeneo makubwa ya majani.',
      treatment: 'Ondoa majani yaliyoharibika, boresha mtiririko wa hewa, na tufungue dawa ya kinga ikiwa inazidi kuenea.',
      prevention: 'Panga mimea vizuri, weka majani kavu, na geuza mazao ili kupunguza kuenea kwa magonjwa.',
      advice: 'Blight ya Mapema inaweza kudhibitiwa kwa kuondoa majani mabaya, kuweka hewa kuingia, na kupuliza dawa tu ikiwa inahitajika.'
    },
    'bacterial wilt': {
      name: 'Kuharibika kwa Bakteria',
      cause: 'Bakteria kwenye udongo huingia mmea kupitia vidonda au uvamizi wa wadudu.',
      symptoms: 'Mimea hukauka haraka, hasa wakati wa joto, na majani yanaweza kung’aa kabla ya kuanguka.',
      treatment: 'Ondoa na uharibu mimea iliyoathirika. Usiyachome kwenye komposti karibu na mimea yenye afya.',
      prevention: 'Tumia viazi vya mbegu safi, epuka kuumia mimea, na geuza mazao mbali na viazi.',
      advice: 'Kuharibika kwa bakteria ni shida. Ondoa mimea iliyoathirika na kuzuia kuenea kwa kutumia viazi mbegu safi na kuzipokea kwa upole.'
    },
    'healthy': {
      name: 'Afya',
      cause: 'Utunzaji mzuri na hali bora za ukuaji hufanya mimea iwe imara.',
      symptoms: 'Majani ya kijani, matawi imara, na hakuna alama za magonjwa.',
      treatment: 'Endelea kumwagilia kwa usawa, tumia mbolea au komposti, na kagua mimea mara kwa mara.',
      prevention: 'Tengeneza udongo mzuri, geuza mazao, na ondoka magugu au kuni karibu na mimea.',
      advice: 'Mzao yako unaonekana mzuri. Endelea kumwagilia vizuri, kutunza udongo, na kukagua mara kwa mara ili ukadumishe afya.'
    }
  },
  actions: {
    spraying: 'Punguza dawa asubuhi mapema wakati majani yakiwa kavu. Tumia bidhaa sahihi na fuata maagizo kwa makini.',
    watering: 'Mwagilia kwa usawa na epuka kumwaga maji mengi. Angalia unyevu wa udongo kabla ya kumwagilia tena.',
    removal: 'Ondoa majani au mimea iliyoathirika na uharibu mbali na shamba ili kuzuia ugonjwa usisambae.',
    prevention_general: 'Hifadhi mimea yenye afya kwa udongo mzuri, nafasi nzuri, zana safi, na kugeuza mazao kila mwaka.'
  }
}

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

function getGreetingResponse(userSession, lang = 'EN') {
  const name = formatName(userSession?.name)
  if (lang === 'SW') {
    const response = getRandom(swKnowledge.greetings.responses)
    return name ? `${response} Karibu ${name}.` : response
  }
  const response = getRandom(knowledgeBase.greetings.responses)
  return name ? `${response} Nice to see you, ${name} 👨‍🌾` : response
}

function getPersonalizationResponse(name, lang = 'EN') {
  if (lang === 'SW') {
    const template = getRandom(swKnowledge.personalization.responses)
    return template.replace('{name}', name)
  }
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

function formatDiseaseResponse(disease, key, name, lang = 'EN') {
  const prefix = name ? (lang === 'SW' ? `Sawa ${name}, hapa ninachopendekeza:\n` : `Okay ${name}, here is what I suggest:\n`) : ''
  const severity = String(disease.severity || '').toLowerCase()
  const urgency = severity === 'high'
    ? (lang === 'SW'
      ? '🚨 Hatua: Fanya haraka — ugonjwa huu unasambaa kwa kasi na unaweza kuharibu mazao yako.'
      : '🚨 Action: Act quickly — this disease spreads very fast and can destroy your crop.')
    : severity === 'medium'
      ? (lang === 'SW'
        ? 'ℹ Ushauri: Tibu mapema ili kuzuia kuenea.'
        : 'ℹ Advice: Treat early to prevent spreading.')
      : (lang === 'SW'
        ? '✅ Habari njema! Endelea kukagua mazao yako na kutumia mbinu nzuri za kilimo.'
        : '✅ Good news! Keep monitoring your crop and use good farming practices.')

  if (lang === 'SW') {
    const swDisease = swKnowledge.diseases[key]
    const diseaseName = swDisease?.name || disease.name
    return `${prefix}⚠️ Ugonjwa Umegunduliwa: ${diseaseName}\n\n🌱 Maelezo Rahisi: ${swDisease?.advice || disease.advice}\n\n🦠 Sababu: ${swDisease?.cause || disease.cause}\n🔍 Dalili: ${swDisease?.symptoms || disease.symptoms}\n💊 Matibabu: ${swDisease?.treatment || disease.treatment}\n🛡 Kuzuia: ${swDisease?.prevention || disease.prevention}\n\n${urgency}`
  }

  return `${prefix}⚠️ Disease Detected: ${disease.name}\n\n🌱 Simple Explanation: ${disease.advice}\n\n🦠 Cause: ${disease.cause}\n🔍 Symptoms: ${disease.symptoms}\n💊 Treatment: ${disease.treatment}\n🛡 Prevention: ${disease.prevention}\n\n${urgency}`
}

function getFallbackResponse(type = 'unknown', lang = 'EN') {
  if (lang === 'SW') {
    if (type === 'no_disease') {
      return getRandom(swKnowledge.fallback.no_disease_responses)
    }
    return getRandom(swKnowledge.fallback.unknown_responses)
  }

  if (type === 'no_disease') {
    return getRandom(knowledgeBase.fallback.no_disease_responses)
  }
  return getRandom(knowledgeBase.fallback.unknown_responses)
}

export function chatbotResponse(input, userSession = {}, lang = 'EN') {
  const text = String(input || '').trim()
  if (!text) {
    return {
      text: lang === 'SW' ? swKnowledge.fallback.help : knowledgeBase.fallback.help,
      intent: 'fallback',
      userSession
    }
  }

  const normalizedText = normalizeText(text)

  if (includesAny(normalizedText, knowledgeBase.greetings.keywords)) {
    return {
      text: getGreetingResponse(userSession, lang),
      intent: 'greeting',
      userSession
    }
  }

  const extractedName = extractName(text)
  if (extractedName) {
    const formattedName = formatName(extractedName)
    userSession.name = formattedName
    return {
      text: getPersonalizationResponse(formattedName, lang),
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
      text: formatDiseaseResponse(disease, key, name, lang),
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
    return {
      text: formatActionResponse(actionKey, action, name, lang),
      intent: 'action',
      action: actionKey,
      userSession
    }
  }

  if (normalizedText.includes('disease') || normalizedText.includes('problem')) {
    return {
      text: getFallbackResponse('no_disease', lang),
      intent: 'fallback',
      userSession
    }
  }

  return {
    text: getFallbackResponse('unknown', lang),
    intent: 'fallback',
    userSession
  }
}
