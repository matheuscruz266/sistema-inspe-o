import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square } from 'lucide-react'

interface Props {
  value: string
  onChange: (text: string) => void
}

export function AudioTranscribeButton({ value, onChange }: Props) {
  const recognitionRef = useRef<any>(null)
  const [isListening, setIsListening] = useState(false)
  const baseTextRef = useRef('')
  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const toggle = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    if (!isSupported) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'pt-BR'
    baseTextRef.current = value || ''
    rec.onresult = (e: any) => {
      let text = ''
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript
      }
      onChange(baseTextRef.current ? `${baseTextRef.current} ${text}` : text)
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    rec.start()
    recognitionRef.current = rec
    setIsListening(true)
  }

  if (!isSupported) return null

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="sm"
      onClick={toggle}
      className="shrink-0"
    >
      {isListening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      <span className="ml-1">{isListening ? 'Parar' : 'Áudio'}</span>
    </Button>
  )
}
