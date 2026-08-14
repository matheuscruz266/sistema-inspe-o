import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square } from 'lucide-react'

interface Props {
  value: string
  onChange: (text: string) => void
}

/**
 * Gravação de áudio contínua com transcrição em tempo real (Web Speech API).
 * - Sem botão "continuar": a gravação roda de forma contínua enquanto ativa.
 * - A transcrição é fiel ao que foi dito (não altera palavras).
 * - Botões: "Iniciar gravação" (inicia) e "Parar gravação" (para).
 */
export function AudioTranscribeButton({ value, onChange }: Props) {
  const recognitionRef = useRef<any>(null)
  const [isListening, setIsListening] = useState(false)
  const baseTextRef = useRef('')
  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {
        /* noop */
      }
    }
  }, [])

  const start = () => {
    if (!isSupported || isListening) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'pt-BR'
    // Captura o texto já presente como base; o que for falado é anexado sem
    // alterar o conteúdo existente.
    baseTextRef.current = value || ''

    rec.onresult = (e: any) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      // Mantém fiel ao que foi dito: apenas concatena a transcrição contínua.
      onChange(baseTextRef.current ? `${baseTextRef.current} ${text}` : text)
    }
    rec.onend = () => {
      // Se a engine parar sozinha (timeout do navegador), apenas atualiza o
      // estado — não reinicia automaticamente para respeitar o botão "Parar".
      setIsListening(false)
    }
    rec.onerror = () => setIsListening(false)
    try {
      rec.start()
    } catch {
      /* já iniciada */
    }
    recognitionRef.current = rec
    setIsListening(true)
  }

  const stop = () => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* noop */
    }
    recognitionRef.current = null
    setIsListening(false)
  }

  if (!isSupported) return null

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="sm"
      onClick={isListening ? stop : start}
      className="shrink-0"
    >
      {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      <span className="ml-1">{isListening ? 'Parar gravação' : 'Iniciar gravação'}</span>
    </Button>
  )
}
