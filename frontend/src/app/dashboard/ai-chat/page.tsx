"use client"

import { useState, useEffect, useRef } from "react"
import { Send, Bot, Trash2, Sparkles } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/toaster"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Suggestion {
  text: string
}

const WELCOME_MESSAGE = "Assalam o Alaikum! Main AI Accounts ka AI assistant hun. Aap mujhse apne business ki koi bhi accounting query kar sakte hain Urdu ya English mein."

const SUGGESTED_QUESTIONS = [
  "Is mahine ki total sales kya hai?",
  "Kaun se customers ka payment pending hai?",
  "Mera net profit kya hai?",
  "Low stock products dikhao",
  "Top 5 customers by revenue",
]

export default function AIChatPage() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([])
  const [suggestions, setSuggestions] = useState<string[]>(SUGGESTED_QUESTIONS)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Add welcome message on load
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ])
    fetchSuggestions()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchSuggestions = async () => {
    try {
      const response = await api.get("/api/ai-chat/suggestions")
      setSuggestions(response.data.suggestions || SUGGESTED_QUESTIONS)
    } catch (error) {
      console.error("Failed to fetch suggestions:", error)
    }
  }

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setConversationHistory((prev) => [...prev, { role: "user", content: messageText }])
    setInput("")
    setIsLoading(true)

    try {
      const response = await api.post("/api/ai-chat/chat", {
        message: messageText,
        conversation_history: conversationHistory,
      })

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      setConversationHistory((prev) => [...prev, { role: "assistant", content: response.data.response }])

      if (response.data.suggestions) {
        setSuggestions(response.data.suggestions)
      }
    } catch (error: any) {
      console.error("Failed to send message:", error)
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to get AI response",
        
      })

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Maazrat, koi technical masla aa gaya hai. Baraye meherbani dubara koshish karein.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: WELCOME_MESSAGE,
        timestamp: new Date(),
      },
    ])
    setConversationHistory([])
    setSuggestions(SUGGESTED_QUESTIONS)
    toast({
      title: "Success",
      description: "Chat history cleared",
      
    })
  }

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting
    return content.split("\n").map((line, i) => {
      // Bold text
      const parts = line.split(/(\*\*.*?\*\*)/g)
      return (
        <p key={i} className="min-h-[1rem]">
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      )
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  }

  const isChatEmpty = messages.length <= 1

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">AI Accounts Assistant</h1>
            <p className="text-sm text-gray-500">Powered by Gemini AI</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Clear Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex items-end gap-3 max-w-[80%] ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user"
                      ? "bg-blue-600"
                      : "bg-gradient-to-br from-blue-500 to-purple-600"
                  }`}
                >
                  {message.role === "user" ? (
                    <span className="text-white text-sm font-medium">U</span>
                  ) : (
                    <Bot className="h-4 w-4 text-white" />
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-md shadow-sm"
                  }`}
                >
                  <div className={`text-sm ${message.role === "user" ? "" : "prose prose-sm"}`}>
                    {message.role === "user" ? (
                      message.content
                    ) : (
                      <div className="space-y-1">{formatMessage(message.content)}</div>
                    )}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      message.role === "user" ? "text-blue-100" : "text-gray-400"
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-end gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Suggested Questions */}
          {isChatEmpty && !isLoading && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <p className="text-sm text-gray-600 font-medium">Suggested Questions</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(question)}
                    className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Apna sawal likhein... (Urdu or English)"
                rows={1}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                style={{ minHeight: "48px", maxHeight: "120px" }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl transition-colors disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            AI can make mistakes. Please verify important financial information.
          </p>
        </div>
      </div>
    </div>
  )
}
