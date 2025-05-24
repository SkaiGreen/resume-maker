"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Play, Pause, ArrowRight, Check, Sparkles, Clock, FileText } from "lucide-react"

const questions = [
  {
    id: 1,
    title: "Your Job & Strengths",
    subtitle: "Tell us about your role and strengths",
    question: "What's your current job and what are you really good at?",
    description:
      "Tell us your job title and 2-3 things you do well. Like: 'I'm a sales rep and I'm great at building relationships and hitting my targets.'",
  },
  {
    id: 2,
    title: "Your Best Achievement",
    subtitle: "Share your proudest work moment",
    question: "What's your biggest work accomplishment?",
    description:
      "Share one thing you're proud of at work. Use numbers if possible. Like: 'I increased sales by 25%' or 'I trained 10 new employees.'",
  },
  {
    id: 3,
    title: "Your Skills",
    subtitle: "Tell us what you're good with",
    question: "What software, tools, or skills do you know well?",
    description:
      "List what you're good with - software, languages, or abilities. Like: 'Excel, Spanish, customer service, and managing social media accounts.'",
  },
  {
    id: 4,
    title: "Your Education",
    subtitle: "Share your educational background",
    question: "What's your educational background?",
    description:
      "Just the basics - your degree, school, any certifications. Like: 'Business degree from City College and a Google Analytics certificate.'",
  },
]

type RecordingState = "idle" | "recording" | "recorded" | "playing"
type AppState = "welcome" | "questions" | "submitted"

export default function AudioFlashcards() {
  const [appState, setAppState] = useState<AppState>("welcome")
  const [email, setEmail] = useState("")
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [recordings, setRecordings] = useState<{ [key: number]: Blob }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        setRecordings((prev) => ({ ...prev, [currentQuestion]: blob }))
        setRecordingState("recorded")
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setRecordingState("recording")
    } catch (error) {
      console.error("Error starting recording:", error)
      alert("Unable to access microphone. Please check your permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop()
    }
  }

  const playRecording = () => {
    const recording = recordings[currentQuestion]
    if (recording) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      const audio = new Audio(URL.createObjectURL(recording))
      audioRef.current = audio

      audio.onended = () => {
        setRecordingState("recorded")
      }

      audio.play()
      setRecordingState("playing")
    }
  }

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setRecordingState("recorded")
    }
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setRecordingState(recordings[currentQuestion + 1] ? "recorded" : "idle")
    }
  }

  const submitAnswers = async () => {
    setIsSubmitting(true)

    try {
      const formData = new FormData()

      // Add email
      formData.append("email", email)

      // Add each recording
      Object.entries(recordings).forEach(([questionIndex, blob]) => {
        const questionNumber = Number.parseInt(questionIndex) + 1
        formData.append(`question_${questionNumber}`, blob, `question_${questionNumber}.webm`)
      })

      formData.append("questions_data", JSON.stringify(questions))
      formData.append("submission_time", new Date().toISOString())

      const response = await fetch("https://hook.eu2.make.com/rdcc15sij24hfvydepw37lbgban7f10g", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        setAppState("submitted")
      } else {
        throw new Error("Failed to submit")
      }
    } catch (error) {
      console.error("Error submitting answers:", error)
      alert("Failed to submit answers. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const startQuestions = () => {
    if (email.trim() && email.includes("@")) {
      setAppState("questions")
    } else {
      alert("Please enter a valid email address")
    }
  }

  // Welcome Screen
  if (appState === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-40 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
        </div>

        <div className="w-full max-w-lg relative z-10">
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-inner">
              {/* Logo/Brand */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-4 shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                  Tools To Launch
                </h1>
                <p className="text-gray-600 font-medium">Premium Resume Maker</p>
              </div>

              {/* Value proposition */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Create Your Perfect Resume in{" "}
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    20 Seconds
                  </span>
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Simply answer 4 quick questions with your voice, and we'll craft a professional, editable Word
                  document resume tailored just for you.
                </p>

                {/* Features */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Mic className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Voice Recording</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-6 h-6 text-pink-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">20 Seconds</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                      <FileText className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Word Document</p>
                  </div>
                </div>
              </div>

              {/* Email input */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Enter your email to receive your resume
                </label>
                <Input
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 text-gray-900 placeholder-gray-400"
                />
              </div>

              {/* Start button */}
              <Button
                onClick={startQuestions}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Start Creating My Resume
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <p className="text-xs text-gray-500 text-center mt-4">
                No spam, just your beautiful resume delivered instantly
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success Screen
  if (appState === "submitted") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 text-center shadow-inner">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Check className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
                Perfect!
              </h2>
              <p className="text-gray-600 mb-4 leading-relaxed">
                Your responses have been submitted successfully. Your professional resume will be delivered to{" "}
                <span className="font-semibold text-gray-900">{email}</span> within 20 seconds!
              </p>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <p className="text-sm text-gray-600">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Check your inbox for your editable Word document resume
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Questions Screen
  const currentQ = questions[currentQuestion]
  const hasRecording = recordings[currentQuestion]
  const allQuestionsAnswered = questions.every((_, index) => recordings[index])

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-40 left-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-white/90 text-sm font-medium">
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span className="text-white/90 text-sm">{Object.keys(recordings).length} completed</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2 backdrop-blur-sm">
            <div
              className="bg-gradient-to-r from-purple-400 to-pink-400 rounded-full h-2 transition-all duration-500 shadow-lg"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Main flashcard */}
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-inner">
            {/* Header pill */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-2xl text-center mb-6 shadow-lg">
              <h1 className="font-bold text-lg">{currentQ.title}</h1>
            </div>

            {/* Subtitle */}
            <p className="text-gray-500 text-center mb-6 text-sm font-medium">{currentQ.subtitle}</p>

            {/* Main question */}
            <h2 className="text-black text-xl font-bold text-center mb-8 leading-relaxed">{currentQ.question}</h2>

            {/* How to answer section */}
            <div className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 shadow-inner">
              <p className="text-gray-700 text-sm leading-relaxed">
                <span className="font-bold text-purple-900">How to answer: </span>
                {currentQ.description}
              </p>
            </div>

            {/* Recording buttons */}
            <div className="flex gap-4 mb-6">
              {recordingState === "idle" && (
                <Button
                  onClick={startRecording}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              )}

              {recordingState === "recording" && (
                <Button
                  onClick={stopRecording}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 rounded-2xl font-semibold shadow-lg animate-pulse"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              )}

              {(recordingState === "recorded" || recordingState === "playing") && (
                <>
                  <Button
                    onClick={startRecording}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Re-record
                  </Button>
                  <Button
                    onClick={recordingState === "playing" ? pausePlayback : playRecording}
                    variant="outline"
                    className="flex-1 border-2 border-purple-200 text-purple-700 py-4 rounded-2xl font-semibold hover:bg-purple-50 shadow-lg transition-all duration-300"
                  >
                    {recordingState === "playing" ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Play Recording
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

            {/* Success indicator */}
            {hasRecording && (
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center mr-2">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm font-semibold">Answer recorded successfully</span>
                </div>
              </div>
            )}

            {/* Next/Submit button */}
            <div className="flex justify-end">
              {currentQuestion < questions.length - 1 && hasRecording && (
                <Button
                  onClick={nextQuestion}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                >
                  Next Question
                  <ArrowRight className="w-4 h-4 ml-1" />
                  <ArrowRight className="w-4 h-4 -ml-2" />
                </Button>
              )}

              {currentQuestion === questions.length - 1 && allQuestionsAnswered && (
                <Button
                  onClick={submitAnswers}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Creating Resume...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create My Resume
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center mt-6 space-x-3">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentQuestion(index)
                setRecordingState(recordings[index] ? "recorded" : "idle")
              }}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentQuestion
                  ? "bg-white scale-125 shadow-lg"
                  : recordings[index]
                    ? "bg-white/80 hover:bg-white"
                    : "bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
