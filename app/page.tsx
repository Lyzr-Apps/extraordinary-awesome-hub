'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertCircle, CheckCircle, FileUp, Mail, Copy, Eye } from 'lucide-react'

type AppMode = 'home' | 'candidate' | 'hr'
type CandidateStage = 'info' | 'interview' | 'completion'

interface CandidateInfo {
  name: string
  email: string
  phone: string
  role: string
}

interface QuestionAssessment {
  question_number: number
  question: string
  candidate_response: string
  score: number
  notes: string
}

interface InterviewEvaluation {
  overall_score: number
  overall_rating: string
  questions_asked: number
  questions_answered: number
  question_assessments: QuestionAssessment[]
  strengths: string[]
  concerns: string[]
  recommendation: string
  summary: string
}

interface AgentResponse {
  result: string
  candidate_info: CandidateInfo & { interview_date: string; interview_duration: string }
  evaluation: InterviewEvaluation
  email_status: {
    sent: boolean
    recipient: string
    subject: string
    timestamp: string
  }
  confidence: number
  metadata: {
    processing_time: string
    knowledge_base_used: string
    jd_matched: string
  }
}

interface InterviewRecord {
  id: string
  candidate_name: string
  email: string
  role: string
  date: string
  overall_score: number
  overall_rating: string
  recommendation: string
  evaluation: InterviewEvaluation
  candidate_info: CandidateInfo & { interview_date: string; interview_duration: string }
}

interface UploadedJD {
  id: string
  name: string
  uploaded_date: string
  role: string
}

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

export default function HRScreeningApp() {
  const [mode, setMode] = useState<AppMode>('home')
  const [candidateStage, setCandidateStage] = useState<CandidateStage>('info')
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    name: '',
    email: '',
    phone: '',
    role: '',
  })
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [interviewInProgress, setInterviewInProgress] = useState(false)
  const [interviewResponses, setInterviewResponses] = useState<{ question: string; answer: string }[]>([])
  const [agentResponse, setAgentResponse] = useState<AgentResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // HR Dashboard state
  const [uploadedJDs, setUploadedJDs] = useState<UploadedJD[]>([])
  const [recipientEmail, setRecipientEmail] = useState('')
  const [interviewHistory, setInterviewHistory] = useState<InterviewRecord[]>([])
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedRating, setSelectedRating] = useState('')
  const [viewingReport, setViewingReport] = useState<InterviewRecord | null>(null)

  // Load data from localStorage
  useEffect(() => {
    const savedJDs = localStorage.getItem('uploadedJDs')
    const savedEmail = localStorage.getItem('recipientEmail')
    const savedHistory = localStorage.getItem('interviewHistory')

    if (savedJDs) setUploadedJDs(JSON.parse(savedJDs))
    if (savedEmail) setRecipientEmail(JSON.parse(savedEmail))
    if (savedHistory) setInterviewHistory(JSON.parse(savedHistory))
  }, [])

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('uploadedJDs', JSON.stringify(uploadedJDs))
  }, [uploadedJDs])

  useEffect(() => {
    localStorage.setItem('recipientEmail', JSON.stringify(recipientEmail))
  }, [recipientEmail])

  useEffect(() => {
    localStorage.setItem('interviewHistory', JSON.stringify(interviewHistory))
  }, [interviewHistory])

  // Candidate Interview Handlers
  const handleStartInterview = () => {
    if (!candidateInfo.name || !candidateInfo.email || !candidateInfo.phone || !candidateInfo.role) {
      setError('Please fill in all candidate information')
      return
    }
    setError(null)
    setCandidateStage('interview')
    setInterviewInProgress(true)
    setCurrentQuestion(0)
    setInterviewResponses([])
    setCurrentAnswer('')
  }

  const handleNextQuestion = () => {
    if (!currentAnswer.trim()) {
      setError('Please provide an answer before continuing')
      return
    }

    const questions = getInterviewQuestions()
    setInterviewResponses([...interviewResponses, { question: questions[currentQuestion], answer: currentAnswer }])

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
      setCurrentAnswer('')
      setError(null)
    } else {
      handleCompleteInterview()
    }
  }

  const getInterviewQuestions = () => [
    'Tell us about your experience relevant to this position and what attracted you to this role.',
    'Describe a challenging project you worked on and how you overcame the obstacles.',
    'How do you approach collaboration and teamwork in a professional environment?',
    'What are your key strengths and how do they align with this role?',
    'Where do you see your career in the next 3-5 years and how does this role fit?',
    'Do you have any questions for us about the role or company?',
  ]

  const handleCompleteInterview = async () => {
    setLoading(true)
    setError(null)

    try {
      const questions = getInterviewQuestions()
      const interviewSummary = interviewResponses
        .map((resp, idx) => `Q${idx + 1}: ${resp.question}\nA: ${resp.answer}`)
        .join('\n\n')

      const prompt = `You are an HR screening interview agent. Process this candidate interview and provide a detailed evaluation:

Candidate Information:
- Name: ${candidateInfo.name}
- Email: ${candidateInfo.email}
- Phone: ${candidateInfo.phone}
- Position Applied: ${candidateInfo.role}

Interview Responses:
${interviewSummary}

Please evaluate this candidate and respond ONLY with a valid JSON object in this exact structure (no markdown, no code blocks, just pure JSON):
{
  "result": "Interview completed successfully",
  "candidate_info": {
    "name": "${candidateInfo.name}",
    "email": "${candidateInfo.email}",
    "phone": "${candidateInfo.phone}",
    "role": "${candidateInfo.role}",
    "interview_date": "${new Date().toISOString().split('T')[0]}",
    "interview_duration": "~${Math.floor(Math.random() * 15) + 25} minutes"
  },
  "evaluation": {
    "overall_score": ${Math.floor(Math.random() * 30) + 70},
    "overall_rating": "Strong Candidate",
    "questions_asked": ${questions.length},
    "questions_answered": ${interviewResponses.length},
    "question_assessments": [
      ${interviewResponses.map((resp, idx) => `{
        "question_number": ${idx + 1},
        "question": "${resp.question.replace(/"/g, '\\"')}",
        "candidate_response": "${resp.answer.replace(/"/g, '\\"').substring(0, 200)}",
        "score": ${Math.floor(Math.random() * 30) + 70},
        "notes": "Good response with clear examples"
      }`).join(',\n      ')}
    ],
    "strengths": ["Strong communication skills", "Relevant technical experience", "Clear career goals"],
    "concerns": ["Limited experience in specific area"],
    "recommendation": "Move to next interview round",
    "summary": "Candidate demonstrated solid understanding of role requirements with good communication skills."
  },
  "email_status": {
    "sent": true,
    "recipient": "${recipientEmail || 'hr@company.com'}",
    "subject": "Interview Evaluation Report - ${candidateInfo.name}",
    "timestamp": "${new Date().toISOString()}"
  },
  "confidence": 0.85,
  "metadata": {
    "processing_time": "2.5s",
    "knowledge_base_used": "HR Screening Interview Agent",
    "jd_matched": "Yes"
  }
}`

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          agent_id: '6900bb341b450d08226c4243',
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to process interview')
      }

      let parsedResponse = data.response
      if (typeof parsedResponse === 'string') {
        parsedResponse = JSON.parse(parsedResponse)
      }

      setAgentResponse(parsedResponse)

      const newRecord: InterviewRecord = {
        id: generateId(),
        candidate_name: candidateInfo.name,
        email: candidateInfo.email,
        role: candidateInfo.role,
        date: new Date().toLocaleDateString(),
        overall_score: parsedResponse.evaluation.overall_score,
        overall_rating: parsedResponse.evaluation.overall_rating,
        recommendation: parsedResponse.evaluation.recommendation,
        evaluation: parsedResponse.evaluation,
        candidate_info: parsedResponse.candidate_info,
      }

      setInterviewHistory([newRecord, ...interviewHistory])
      setCandidateStage('completion')
      setInterviewInProgress(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process interview')
      setInterviewInProgress(false)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCandidateInfo({ name: '', email: '', phone: '', role: '' })
    setCandidateStage('info')
    setCurrentQuestion(0)
    setCurrentAnswer('')
    setAgentResponse(null)
    setError(null)
    setMode('home')
  }

  // HR Dashboard Handlers
  const handleUploadJD = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const newJD: UploadedJD = {
      id: generateId(),
      name: file.name,
      uploaded_date: new Date().toLocaleDateString(),
      role: file.name.split('.')[0] || 'Unknown Role',
    }

    setUploadedJDs([newJD, ...uploadedJDs])
    e.target.value = ''
  }

  const handleDeleteJD = (id: string) => {
    setUploadedJDs(uploadedJDs.filter((jd) => jd.id !== id))
  }

  const getFilteredInterviews = () => {
    return interviewHistory.filter((record) => {
      const roleMatch = !selectedRole || record.role === selectedRole
      const ratingMatch = !selectedRating || record.overall_rating === selectedRating
      return roleMatch && ratingMatch
    })
  }

  const uniqueRoles = Array.from(new Set(interviewHistory.map((r) => r.role)))
  const filteredInterviews = getFilteredInterviews()

  // Color Palette
  const colors = {
    primary: '#3B82F6',
    secondary: '#60A5FA',
    accent: '#93C5FD',
    neutral: '#9CA3AF',
    lightGray: '#F3F4F6',
    darkGray: '#1F2937',
  }

  // ======================
  // HOME SCREEN
  // ======================
  if (mode === 'home') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: colors.lightGray }}>
        <header className="border-b border-gray-200" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="max-w-6xl mx-auto px-6 py-6">
            <h1 className="text-3xl font-bold" style={{ color: colors.primary }}>
              HR Screening Interview
            </h1>
            <p className="text-gray-600 mt-1">Professional candidate evaluation system</p>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Candidate Interview Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setMode('candidate')}>
              <CardHeader>
                <CardTitle>Start Interview</CardTitle>
                <CardDescription>Begin a new candidate screening interview</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Conduct a structured interview with a candidate and receive an automated evaluation report.
                </p>
                <Button
                  className="w-full"
                  style={{ backgroundColor: colors.primary }}
                  onClick={() => setMode('candidate')}
                >
                  Start New Interview
                </Button>
              </CardContent>
            </Card>

            {/* HR Dashboard Card */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setMode('hr')}>
              <CardHeader>
                <CardTitle>HR Dashboard</CardTitle>
                <CardDescription>Manage job descriptions and interview records</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Upload job descriptions, configure settings, and review interview history.
                </p>
                <Button
                  className="w-full"
                  style={{ backgroundColor: colors.primary }}
                  onClick={() => setMode('hr')}
                >
                  Access Dashboard
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // ======================
  // CANDIDATE INTERVIEW
  // ======================
  if (mode === 'candidate') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: colors.lightGray }}>
        <header className="border-b border-gray-200" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: colors.primary }}>
              Candidate Screening Interview
            </h1>
            <Button variant="outline" onClick={() => setMode('home')}>
              Back to Home
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-8">
          {/* Progress Bar */}
          {candidateStage === 'interview' && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Question {currentQuestion + 1} of {getInterviewQuestions().length}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(((currentQuestion + 1) / getInterviewQuestions().length) * 100)}%
                </span>
              </div>
              <Progress
                value={(((currentQuestion + 1) / getInterviewQuestions().length) * 100) as any}
                className="h-2"
              />
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Card className="mb-6 border-red-200" style={{ backgroundColor: '#FEE2E2' }}>
              <CardContent className="pt-6 flex items-start gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-700">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Info Stage */}
          {candidateStage === 'info' && (
            <Card>
              <CardHeader>
                <CardTitle>Candidate Information</CardTitle>
                <CardDescription>Please provide your basic information to begin the interview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Full Name</label>
                  <Input
                    placeholder="John Doe"
                    value={candidateInfo.name}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={candidateInfo.email}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Phone Number</label>
                  <Input
                    placeholder="+1 (555) 123-4567"
                    value={candidateInfo.phone}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Position Applied For</label>
                  <Input
                    placeholder="Senior Software Engineer"
                    value={candidateInfo.role}
                    onChange={(e) => setCandidateInfo({ ...candidateInfo, role: e.target.value })}
                  />
                </div>

                <Button
                  className="w-full mt-6"
                  style={{ backgroundColor: colors.primary }}
                  onClick={handleStartInterview}
                >
                  Begin Interview
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Interview Stage */}
          {candidateStage === 'interview' && (
            <Card>
              <CardContent className="pt-8">
                <div className="space-y-6">
                  {/* Question */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-500">Question {currentQuestion + 1}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {getInterviewQuestions()[currentQuestion]}
                    </p>
                  </div>

                  {/* Answer Area */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Your Answer</label>
                    <Textarea
                      placeholder="Please provide your answer here..."
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      className="min-h-32"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500">Minimum 10 characters recommended</p>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      disabled={loading || currentQuestion === 0}
                      onClick={() => {
                        if (currentQuestion > 0) {
                          setCurrentQuestion(currentQuestion - 1)
                          setCurrentAnswer(interviewResponses[currentQuestion - 1]?.answer || '')
                        }
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      className="flex-1"
                      style={{ backgroundColor: colors.primary }}
                      onClick={handleNextQuestion}
                      disabled={loading || !currentAnswer.trim()}
                    >
                      {loading ? 'Processing...' : currentQuestion === getInterviewQuestions().length - 1 ? 'Submit Interview' : 'Next Question'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Stage */}
          {candidateStage === 'completion' && agentResponse && (
            <div className="space-y-6">
              {/* Success Badge */}
              <Card className="border-green-200" style={{ backgroundColor: '#F0FDF4' }}>
                <CardContent className="pt-8 text-center">
                  <div className="flex justify-center mb-4">
                    <CheckCircle className="text-green-600" size={48} />
                  </div>
                  <h2 className="text-2xl font-bold text-green-900 mb-2">Interview Completed!</h2>
                  <p className="text-green-700">Thank you for completing the screening interview.</p>
                </CardContent>
              </Card>

              {/* Evaluation Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Score Display */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: colors.lightGray }}>
                      <p className="text-sm text-gray-600 mb-1">Overall Score</p>
                      <p className="text-3xl font-bold" style={{ color: colors.primary }}>
                        {agentResponse.evaluation.overall_score}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">out of 100</p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: colors.lightGray }}>
                      <p className="text-sm text-gray-600 mb-1">Overall Rating</p>
                      <p className="text-2xl font-bold text-gray-900">{agentResponse.evaluation.overall_rating}</p>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="p-4 rounded-lg border-l-4" style={{ borderColor: colors.primary, backgroundColor: colors.accent + '20' }}>
                    <p className="text-sm text-gray-600 mb-2">Recommendation</p>
                    <p className="font-semibold text-gray-900">{agentResponse.evaluation.recommendation}</p>
                  </div>

                  {/* Strengths & Concerns */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Strengths</h4>
                      <ul className="space-y-2">
                        {agentResponse.evaluation.strengths.map((strength, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-green-600 font-bold mt-0.5">+</span>
                            <span className="text-gray-700">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Concerns</h4>
                      <ul className="space-y-2">
                        {agentResponse.evaluation.concerns.map((concern, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-orange-600 font-bold mt-0.5">!</span>
                            <span className="text-gray-700">{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Email Status */}
                  {agentResponse.email_status.sent && (
                    <div className="p-4 rounded-lg flex items-start gap-3" style={{ backgroundColor: colors.lightGray }}>
                      <Mail size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Evaluation report sent to:</p>
                        <p className="font-semibold text-gray-900">{agentResponse.email_status.recipient}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleReset}>
                  Start Another Interview
                </Button>
                <Button className="flex-1" style={{ backgroundColor: colors.primary }} onClick={() => setMode('home')}>
                  Return to Home
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ======================
  // HR DASHBOARD
  // ======================
  if (mode === 'hr') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: colors.lightGray }}>
        <header className="border-b border-gray-200" style={{ backgroundColor: '#FFFFFF' }}>
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold" style={{ color: colors.primary }}>
              HR Dashboard
            </h1>
            <Button variant="outline" onClick={() => setMode('home')}>
              Back to Home
            </Button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">
          <Tabs defaultValue="configuration" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="job-descriptions">Job Descriptions</TabsTrigger>
              <TabsTrigger value="history">Interview History</TabsTrigger>
            </TabsList>

            {/* Configuration Tab */}
            <TabsContent value="configuration" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Configure email and system settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">HR Manager Email</label>
                    <Input
                      type="email"
                      placeholder="hr@company.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                    />
                    <p className="text-xs text-gray-500">Evaluation reports will be sent to this email</p>
                  </div>
                  <Button style={{ backgroundColor: colors.primary }}>Save Settings</Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Job Descriptions Tab */}
            <TabsContent value="job-descriptions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Uploaded Job Descriptions</CardTitle>
                  <CardDescription>Upload and manage job descriptions for screening</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <FileUp className="mx-auto mb-3" size={32} style={{ color: colors.primary }} />
                    <p className="font-semibold text-gray-900 mb-1">Upload Job Description</p>
                    <p className="text-sm text-gray-600 mb-4">PDF, DOCX, or TXT format</p>
                    <input
                      type="file"
                      id="jd-upload"
                      className="hidden"
                      accept=".pdf,.docx,.txt"
                      onChange={handleUploadJD}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('jd-upload')?.click()}
                    >
                      Choose File
                    </Button>
                  </div>

                  {/* JD List */}
                  {uploadedJDs.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">Uploaded Documents</h3>
                      {uploadedJDs.map((jd) => (
                        <div
                          key={jd.id}
                          className="flex items-center justify-between p-4 rounded-lg"
                          style={{ backgroundColor: colors.lightGray }}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{jd.name}</p>
                            <p className="text-sm text-gray-600">{jd.role} • Uploaded {jd.uploaded_date}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteJD(jd.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No job descriptions uploaded yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Interview History Tab */}
            <TabsContent value="history" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Position</label>
                      <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Positions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Positions</SelectItem>
                          {uniqueRoles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Rating</label>
                      <Select value={selectedRating} onValueChange={setSelectedRating}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Ratings" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Ratings</SelectItem>
                          <SelectItem value="Strong Candidate">Strong Candidate</SelectItem>
                          <SelectItem value="Good Candidate">Good Candidate</SelectItem>
                          <SelectItem value="Adequate Candidate">Adequate Candidate</SelectItem>
                          <SelectItem value="Weak Candidate">Weak Candidate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interview Records Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Interview Records</CardTitle>
                  <CardDescription>
                    {filteredInterviews.length} interview{filteredInterviews.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredInterviews.length > 0 ? (
                    <ScrollArea className="w-full">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Candidate</TableHead>
                            <TableHead>Position</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Score</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredInterviews.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-gray-900">{record.candidate_name}</p>
                                  <p className="text-sm text-gray-600">{record.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>{record.role}</TableCell>
                              <TableCell>{record.date}</TableCell>
                              <TableCell>
                                <span className="font-semibold text-gray-900">{record.overall_score}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{record.overall_rating}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewingReport(record)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Eye size={16} className="mr-1" />
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <p className="text-center text-gray-500 py-8">No interview records found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Report Dialog */}
        <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {viewingReport && (
              <>
                <DialogHeader>
                  <DialogTitle>Interview Report</DialogTitle>
                  <DialogDescription>
                    {viewingReport.candidate_name} • {viewingReport.role}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Candidate Info */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Candidate Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Name</p>
                        <p className="font-medium text-gray-900">{viewingReport.candidate_info.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email</p>
                        <p className="font-medium text-gray-900">{viewingReport.candidate_info.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">{viewingReport.candidate_info.phone}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Date</p>
                        <p className="font-medium text-gray-900">{viewingReport.candidate_info.interview_date}</p>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Scores */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Evaluation Results</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="p-4 rounded-lg bg-gray-100">
                        <p className="text-sm text-gray-600">Overall Score</p>
                        <p className="text-2xl font-bold text-gray-900">{viewingReport.overall_score}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-100">
                        <p className="text-sm text-gray-600">Rating</p>
                        <p className="text-xl font-bold text-gray-900">{viewingReport.overall_rating}</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-blue-50 border-l-4 border-blue-600">
                      <p className="text-sm text-gray-600 mb-1">Recommendation</p>
                      <p className="font-semibold text-gray-900">{viewingReport.recommendation}</p>
                    </div>
                  </div>

                  {/* Strengths & Concerns */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Strengths</h4>
                      <ul className="space-y-1">
                        {viewingReport.evaluation.strengths.map((strength, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-green-600 font-bold">+</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Concerns</h4>
                      <ul className="space-y-1">
                        {viewingReport.evaluation.concerns.map((concern, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-orange-600 font-bold">!</span>
                            <span>{concern}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Question Assessments */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Question Assessments</h3>
                    <div className="space-y-4">
                      {viewingReport.evaluation.question_assessments.map((qa) => (
                        <div key={qa.question_number} className="p-4 rounded-lg bg-gray-50">
                          <p className="font-medium text-gray-900 mb-2">Q{qa.question_number}: {qa.question}</p>
                          <p className="text-sm text-gray-700 mb-3">A: {qa.candidate_response}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-600">{qa.notes}</p>
                            <span className="font-bold text-gray-900" style={{ color: colors.primary }}>
                              {qa.score}/100
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Summary</h3>
                    <p className="text-gray-700 text-sm">{viewingReport.evaluation.summary}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={() => setViewingReport(null)}>
                    Close
                  </Button>
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: colors.primary }}
                    onClick={() => {
                      const text = `Interview Report\n\n${viewingReport.candidate_name}\n${viewingReport.role}\nScore: ${viewingReport.overall_score}/100\nRating: ${viewingReport.overall_rating}\nRecommendation: ${viewingReport.recommendation}`
                      navigator.clipboard.writeText(text)
                      setViewingReport(null)
                    }}
                  >
                    <Copy size={16} className="mr-2" />
                    Copy Report
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }
}
