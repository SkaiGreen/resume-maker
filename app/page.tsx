"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mic, Play, Pause, ArrowRight, Check, Sparkles, Clock, FileText, ArrowLeft, CreditCard } from "lucide-react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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
    title: "Your Work Experience",
    subtitle: "Share your professional journey",
    question:
      "Tell us about your work experience - the companies you've worked for, your roles, and what you accomplished there.",
    description:
      "Spend 1-2 minutes talking about each company you've worked for. Include: company names, when you worked there, your job titles, and specific things you did or achieved. Like: 'I worked at ABC Corp from 2020-2023 as a Marketing Manager where I launched 3 successful campaigns and increased social media engagement by 40%.'",
  },
  {
    id: 3,
    title: "Your Best Achievement",
    subtitle: "Share your proudest work moment",
    question: "What's your biggest work accomplishment?",
    description:
      "Share one thing you're proud of at work. Use numbers if possible. Like: 'I increased sales by 25%' or 'I trained 10 new employees.'",
  },
  {
    id: 4,
    title: "Your Skills",
    subtitle: "Tell us what you're good with",
    question: "What software, tools, or skills do you know well?",
    description:
      "List what you're good with - software, languages, or abilities. Like: 'Excel, Spanish, customer service, and managing social media accounts.'",
  },
  {
    id: 5,
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
      const audioUrls: { [key: string]: string } = {}
      const timestamp = Date.now()
      const sessionId = Math.random().toString(36).substring(2, 15)

      // Upload each recording to Supabase Storage
      for (const [questionIndex, blob] of Object.entries(recordings)) {
        const questionNumber = Number.parseInt(questionIndex) + 1
        const fileName = `${sessionId}_question_${questionNumber}_${timestamp}.webm`

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage.from("audio-recordings").upload(fileName, blob, {
          contentType: "audio/webm",
          upsert: false,
        })

        if (error) {
          console.error("Upload error:", error)
          throw new Error(`Failed to upload audio for question ${questionNumber}: ${error.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage.from("audio-recordings").getPublicUrl(fileName)

        audioUrls[`question_${questionNumber}_url`] = urlData.publicUrl
      }

      // Send data to webhook with audio URLs
      const webhookData = {
        email: email,
        audio_urls: audioUrls,
        questions_data: questions,
        submission_time: new Date().toISOString(),
        session_id: sessionId,
      }

      const response = await fetch("https://hook.eu2.make.com/rdcc15sij24hfvydepw37lbgban7f10g", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      })

      if (response.ok) {
        setAppState("submitted")
      } else {
        throw new Error(`Webhook failed with status: ${response.status}`)
      }
    } catch (error) {
      console.error("Error submitting answers:", error)
      alert(`Failed to submit answers: ${error.message}. Please try again.`)
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

  // Header Component
  const Header = () => (
    <div className="w-full max-w-lg mx-auto mb-4 px-4">
      <div className="flex justify-between items-start">
        <Button
          onClick={() => window.open("https://toolstolaunch.com/", "_blank")}
          variant="outline"
          size="sm"
          className="border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 text-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Go Back
        </Button>

        {/* Desktop: Credit cost in center */}
        <div className="text-center hidden sm:block">
          <p className="text-xs text-gray-500 mb-1">This product costs</p>
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
            1 Credit
          </div>
        </div>

        {/* Buy Credits button and mobile credit cost */}
        <div className="flex flex-col items-end">
          <Button
            onClick={() => window.open("https://toolstolaunch.com/buy-credits", "_blank")}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-3 py-2 text-sm"
          >
            <CreditCard className="w-4 h-4 mr-1" />
            Buy Credits
          </Button>

          {/* Mobile: Credit cost below button */}
          <div className="text-center mt-2 sm:hidden">
            <p className="text-xs text-gray-500 mb-1">This product costs</p>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
              1 Credit
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Welcome Screen
  if (appState === "welcome") {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center p-4">
        <Header />

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-lg">
            <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-200 p-4 sm:p-8 rounded-3xl shadow-xl">
              <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-inner">
                {/* Logo/Brand */}
                <div className="text-center mb-6 sm:mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl mb-3 sm:mb-4 shadow-lg">
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    Tools To Launch
                  </h1>
                  <p className="text-gray-600 font-medium text-sm sm:text-base">Premium Resume Maker</p>
                </div>

                {/* Value proposition */}
                <div className="text-center mb-6 sm:mb-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                    Create Your Perfect Resume in{" "}
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      20 Seconds
                    </span>
                  </h2>
                  <p className="text-gray-600 leading-relaxed mb-4 sm:mb-6 text-sm sm:text-base px-2">
                    Simply answer 5 quick questions with your voice, and we'll craft a professional, editable Word
                    document resume tailored just for you.
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
                    <div className="text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Mic className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">Voice Recording</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-pink-600" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">20 Seconds</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-4 h-4 sm:w-6 sm:h-6 text-indigo-600" />
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">Word Document</p>
                    </div>
                  </div>
                </div>

                {/* Email input */}
                <div className="mb-4 sm:mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                    Enter your email to receive your resume
                  </label>
                  <Input
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-xl border-2 border-gray-200 focus:border-purple-500 focus:ring-0 text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                  />
                </div>

                {/* Start button */}
                <Button
                  onClick={startQuestions}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 sm:py-4 rounded-xl font-semibold text-sm sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Creating My Resume
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>

                <p className="text-xs text-gray-500 text-center mt-3 sm:mt-4">
                  No spam, just your beautiful resume delivered instantly
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success Screen
  if (appState === "submitted") {
    return (
      <div className="min-h-screen bg-white flex flex-col justify-center p-4">
        <Header />

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-200 p-4 sm:p-8 rounded-3xl shadow-xl">
              <div className="bg-white rounded-2xl p-4 sm:p-8 text-center shadow-inner">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
                  <Check className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3 sm:mb-4">
                  Perfect!
                </h2>
                <p className="text-gray-600 mb-3 sm:mb-4 leading-relaxed text-sm sm:text-base">
                  Your responses have been submitted successfully. Your professional resume will be delivered to{" "}
                  <span className="font-semibold text-gray-900">{email}</span> within 20 seconds!
                </p>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 sm:p-4 border border-purple-200">
                  <p className="text-xs sm:text-sm text-gray-600">
                    <Clock className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                    Check your inbox for your editable Word document resume
                  </p>
                </div>
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
    <div className="min-h-screen bg-white flex flex-col p-4">
      <Header />

      <div className="flex-1 flex flex-col justify-center">
        <div className="w-full max-w-lg mx-auto">
          {/* Progress indicator */}
          <div className="mb-4 sm:mb-8">
            <div className="flex justify-between items-center mb-2 sm:mb-4">
              <span className="text-gray-700 text-xs sm:text-sm font-medium">
                Question {currentQuestion + 1} of {questions.length}
              </span>
              <span className="text-gray-700 text-xs sm:text-sm">{Object.keys(recordings).length} completed</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-2 transition-all duration-500"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Main flashcard */}
          <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 border border-purple-200 p-4 sm:p-8 rounded-3xl shadow-xl">
            <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-inner">
              {/* Header pill */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl text-center mb-4 sm:mb-6 shadow-lg">
                <h1 className="font-bold text-sm sm:text-lg">{currentQ.title}</h1>
              </div>

              {/* Subtitle */}
              <p className="text-gray-500 text-center mb-4 sm:mb-6 text-xs sm:text-sm font-medium">
                {currentQ.subtitle}
              </p>

              {/* Main question */}
              <h2 className="text-black text-lg sm:text-xl font-bold text-center mb-6 sm:mb-8 leading-relaxed px-2">
                {currentQ.question}
              </h2>

              {/* How to answer section */}
              <div className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
                <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">
                  <span className="font-bold text-purple-900">How to answer: </span>
                  {currentQ.description}
                </p>
              </div>

              {/* Recording buttons */}
              <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-4 mb-4 sm:mb-6">
                {recordingState === "idle" && (
                  <Button
                    onClick={startRecording}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 sm:py-4 rounded-2xl font-semibold shadow-lg text-sm sm:text-base"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Start Recording
                  </Button>
                )}

                {recordingState === "recording" && (
                  <Button
                    onClick={stopRecording}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 sm:py-4 rounded-2xl font-semibold shadow-lg animate-pulse text-sm sm:text-base"
                  >
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    Stop Recording
                  </Button>
                )}

                {(recordingState === "recorded" || recordingState === "playing") && (
                  <>
                    <Button
                      onClick={startRecording}
                      className="w-full sm:flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 sm:py-4 rounded-2xl font-semibold shadow-lg text-sm sm:text-base"
                    >
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      Re-record
                    </Button>
                    <Button
                      onClick={recordingState === "playing" ? pausePlayback : playRecording}
                      variant="outline"
                      className="w-full sm:flex-1 border-2 border-purple-200 text-purple-700 py-3 sm:py-4 rounded-2xl font-semibold hover:bg-purple-50 shadow-lg text-sm sm:text-base"
                    >
                      {recordingState === "playing" ? (
                        <>
                          <Pause className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Play Recording
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              {/* Success indicator */}
              {hasRecording && (
                <div className="flex items-center justify-center mb-4 sm:mb-6">
                  <div className="flex items-center text-purple-700 bg-purple-50 px-3 sm:px-4 py-2 rounded-full border border-purple-200">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 bg-purple-600 rounded-full flex items-center justify-center mr-2">
                      <Check className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                    </div>
                    <span className="text-xs sm:text-sm font-semibold">Answer recorded successfully</span>
                  </div>
                </div>
              )}

              {/* Next/Submit button */}
              <div className="flex justify-end">
                {currentQuestion < questions.length - 1 && hasRecording && (
                  <Button
                    onClick={nextQuestion}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-2xl font-semibold shadow-lg text-sm sm:text-base"
                  >
                    Next Question
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1" />
                  </Button>
                )}

                {currentQuestion === questions.length - 1 && allQuestionsAnswered && (
                  <Button
                    onClick={submitAnswers}
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-2xl font-semibold shadow-lg disabled:opacity-50 text-sm sm:text-base"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Creating Resume...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                        Create My Resume
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center mt-4 sm:mt-6 space-x-2 sm:space-x-3">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentQuestion(index)
                  setRecordingState(recordings[index] ? "recorded" : "idle")
                }}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  index === currentQuestion
                    ? "bg-purple-600 scale-125"
                    : recordings[index]
                      ? "bg-purple-400"
                      : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
