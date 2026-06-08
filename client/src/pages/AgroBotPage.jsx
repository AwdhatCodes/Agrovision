import React, { useState, useRef, useEffect } from 'react'
import { Send, Mic, MicOff, Leaf } from 'lucide-react'

const LANG = {
  EN: {
    placeholder: 'Type your message...',
    thinking: 'Agro-Bot is thinking...',
    suggestions: [
      'What disease is this?',
      'How much fungicide do I use?',
      'Where can I buy treatment?',
      'Is my crop safe to eat?',
    ],
    responses: {
      disease: "To identify a disease, go to the **AI Scan** page and upload a photo of your plant. The scanner can detect Early Blight, Late Blight, and healthy crops with confidence scores.",
      fungicide: "For Early Blight, apply mancozeb or chlorothalonil at **1.5–2g per litre** of water every 7–10 days. For Late Blight, use metalaxyl-based fungicides. Always follow the label instructions.",
      treatment: "Check the **Store** for certified treatments — filter by 'Fertiliser' category. You can also contact certified farms directly through the Farm Map.",
      safe: "Potatoes affected by Late Blight should **not** be consumed if there is significant rot. Early Blight mostly affects leaves — the tubers are generally safe if the skin is intact and there is no soft rot.",
      default: "I'm your AgroVision assistant. I can help with disease identification, treatment advice, and store guidance. Try asking about blight, fungicide dosage, or crop safety.",
    },
  },
  SW: {
    placeholder: 'Andika ujumbe wako...',
    thinking: 'Agro-Bot inafikiria...',
    suggestions: [
      'Hii ni ugonjwa gani?',
      'Ninatumia dawa ngapi?',
      'Ninaweza kununua dawa wapi?',
      'Mazao yangu salama kula?',
    ],
    responses: {
      disease: "Ili kutambua ugonjwa, nenda kwenye ukurasa wa **AI Scan** na pakia picha ya mmea wako. Skana inaweza kugundua Blight ya Mapema, Blight ya Marehemu, na mimea yenye afya.",
      fungicide: "Kwa Blight ya Mapema, tumia mancozeb au chlorothalonil kwa **gramu 1.5–2 kwa lita** moja ya maji kila siku 7–10. Kwa Blight ya Marehemu, tumia dawa zenye metalaxyl.",
      treatment: "Angalia **Soko** kwa matibabu yaliyoidhinishwa — chuja kwa kitengo cha 'Mbolea'. Unaweza pia kuwasiliana na mashamba yaliyoidhinishwa kupitia Ramani ya Shamba.",
      safe: "Viazi vilivyoathiriwa na Blight ya Marehemu **hazipaswi** kuliwa ikiwa kuna kuoza kwa kiasi kikubwa. Blight ya Mapema hasa inaathiri majani — mizizi kawaida ni salama ikiwa ngozi ni nzima.",
      default: "Mimi ni msaidizi wako wa AgroVision. Ninaweza kukusaidia na utambuzi wa magonjwa, ushauri wa matibabu, na mwongozo wa soko.",
    },
  },
}

function getBotResponse(text, lang) {
  const t = text.toLowerCase()
  const r = LANG[lang].responses
  if (t.includes('disease') || t.includes('ugonjwa') || t.includes('blight') || t.includes('scan') || t.includes('identify')) return r.disease
  if (t.includes('fungicide') || t.includes('dawa') || t.includes('dosage') || t.includes('spray') || t.includes('ngapi') || t.includes('much')) return r.fungicide
  if (t.includes('buy') || t.includes('treat') || t.includes('kununua') || t.includes('where') || t.includes('wapi') || t.includes('market')) return r.treatment
  if (t.includes('safe') || t.includes('eat') || t.includes('salama') || t.includes('kula') || t.includes('consume')) return r.safe
  return r.default
}

function ChatBubble({ msg }) {
  const isBot = msg.role === 'bot'
  const parts = msg.text.split(/\*\*(.*?)\*\*/g)
  return (
    <div style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', marginBottom: 14 }}>
      {isBot && (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10, marginTop: 2 }}>
          <Leaf size={14} color="#4ade80" />
        </div>
      )}
      <div style={{
        maxWidth: '72%', padding: '11px 16px', borderRadius: isBot ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isBot ? 'var(--bg2)' : 'rgba(74,222,128,0.15)',
        border: `1px solid ${isBot ? 'var(--border)' : 'rgba(74,222,128,0.3)'}`,
        fontSize: 14, lineHeight: 1.6, color: isBot ? 'var(--text1)' : '#e8eaf0',
      }}>
        {isBot ? parts.map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#4ade80' }}>{p}</strong> : p) : msg.text}
      </div>
    </div>
  )
}

export default function AgroBotPage() {
  const [lang, setLang] = useState('EN')
  const [messages, setMessages] = useState([
    { id: 1, role: 'bot', text: LANG.EN.responses.default }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState(false)
  const endRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, thinking])

  const switchLang = (l) => {
    setLang(l)
    setMessages([{ id: Date.now(), role: 'bot', text: LANG[l].responses.default }])
    setInput('')
  }

  const sendMessage = (text) => {
    const t = (text || input).trim()
    if (!t || thinking) return
    const userMsg = { id: Date.now(), role: 'user', text: t }
    setMessages(m => [...m, userMsg])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      const reply = getBotResponse(t, lang)
      setMessages(m => [...m, { id: Date.now() + 1, role: 'bot', text: reply }])
      setThinking(false)
    }, 900 + Math.random() * 600)
  }

  const toggleMic = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.')
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = lang === 'SW' ? 'sw-KE' : 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setInput(transcript)
      setListening(false)
      // Auto-send message after successful speech recognition
      setTimeout(() => {
        const userMsg = { id: Date.now(), role: 'user', text: transcript }
        setMessages(m => [...m, userMsg])
        setInput('')
        setThinking(true)
        setTimeout(() => {
          const reply = getBotResponse(transcript, lang)
          setMessages(m => [...m, { id: Date.now() + 1, role: 'bot', text: reply }])
          setThinking(false)
        }, 900 + Math.random() * 600)
      }, 100)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    rec.start()
    setListening(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', maxWidth: 820, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Leaf size={16} color="#4ade80" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700 }}>Agro-Bot</h1>
            <p style={{ fontSize: 11, color: 'var(--text3)' }}>AI crop disease assistant</p>
          </div>
        </div>

        {/* Language toggle */}
        <div style={{ display: 'flex', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {['EN', 'SW'].map(l => (
            <button key={l} onClick={() => switchLang(l)} style={{
              padding: '6px 14px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: lang === l ? 700 : 400,
              background: lang === l ? 'rgba(74,222,128,0.15)' : 'transparent',
              color: lang === l ? '#4ade80' : 'var(--text3)',
              transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
        {messages.map(m => <ChatBubble key={m.id} msg={m} />)}
        {thinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Leaf size={14} color="#4ade80" />
            </div>
            <div style={{ padding: '11px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && !thinking && (
        <div style={{ padding: '0 24px 14px', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {LANG[lang].suggestions.map(s => (
              <button key={s} onClick={() => sendMessage(s)} style={{
                padding: '11px 14px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
                cursor: 'pointer', textAlign: 'left', fontSize: 13, color: 'var(--text2)',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'; e.currentTarget.style.color = 'var(--text1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: '12px 24px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '8px 10px 8px 16px', transition: 'border-color 0.15s' }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={LANG[lang].placeholder}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text1)' }}
            disabled={thinking}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={sendMessage} disabled={!input.trim() || thinking} style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: input.trim() && !thinking ? 'pointer' : 'default',
              background: input.trim() && !thinking ? '#4ade80' : 'var(--bg3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
            }}>
              <Send size={15} color={input.trim() && !thinking ? '#0a1a0f' : 'var(--text3)'} />
            </button>
            <button onClick={toggleMic} style={{
              width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
              background: listening ? 'rgba(248,113,113,0.15)' : 'var(--bg3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', flexShrink: 0,
            }}>
              {listening ? <MicOff size={15} color="#f87171" /> : <Mic size={15} color="var(--text3)" />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
