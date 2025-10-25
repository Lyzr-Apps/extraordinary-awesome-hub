'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, Check, X, Lightbulb, RotateCcw, Save, History, Play, Lock } from 'lucide-react'
import parseLLMJson from '@/utils/jsonParser'
import Confetti from 'react-confetti'

interface GameHistory {
  id: string
  gameType: string
  difficulty: string
  finalScore: number
  date: string
  won: boolean
}

interface GameState {
  gameId: string
  gameType: string
  difficulty: string
  gameContent: any
  currentState: any
  hintsRemaining: number
  score: number
  won: boolean | null
  gameActive: boolean
}

interface FeedbackMessage {
  text: string
  type: 'success' | 'error' | 'info'
  visible: boolean
}

const GAME_TYPES = [
  { id: 'puzzle', name: 'Puzzle', icon: '🧩' },
  { id: 'trivia', name: 'Trivia', icon: '🧠' },
  { id: 'word', name: 'Word Game', icon: '📝' },
  { id: 'arcade', name: 'Arcade', icon: '🎮' },
]

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

export default function GamePage() {
  const confettiRef = useRef(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [selectedGameType, setSelectedGameType] = useState<string | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Medium')
  const [playerInput, setPlayerInput] = useState('')
  const [feedback, setFeedback] = useState<FeedbackMessage>({ text: '', type: 'info', visible: false })
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confettiActive, setConfettiActive] = useState(false)

  // Load game history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('gameHistory')
    if (saved) {
      setGameHistory(JSON.parse(saved))
    }
    const savedGame = localStorage.getItem('currentGame')
    if (savedGame) {
      setGameState(JSON.parse(savedGame))
      setGameStarted(true)
    }
  }, [])

  // Show feedback message
  const showFeedback = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedback({ text, type, visible: true })
    setTimeout(() => {
      setFeedback({ text: '', type: 'info', visible: false })
    }, 3000)
  }

  // Call Game Master Agent
  const callGameMaster = async (action: string, payload: any) => {
    try {
      setLoading(true)
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: JSON.stringify({
            action,
            ...payload,
          }),
          agent_id: '68fd2525be2defc486f45675',
        }),
      })

      if (!response.ok) {
        throw new Error('Agent request failed')
      }

      const result = await response.json()
      const parsed = parseLLMJson(result.response, {})
      return parsed
    } catch (error) {
      showFeedback('Error communicating with game engine', 'error')
      return null
    } finally {
      setLoading(false)
    }
  }

  // Start new game
  const handleStartGame = async () => {
    if (!selectedGameType) {
      showFeedback('Please select a game type', 'error')
      return
    }

    const agentResponse = await callGameMaster('start_game', {
      game_type: selectedGameType,
      difficulty: selectedDifficulty,
    })

    if (agentResponse?.result) {
      const newGameState: GameState = {
        gameId: agentResponse.game_id || `game_${Date.now()}`,
        gameType: selectedGameType,
        difficulty: selectedDifficulty,
        gameContent: agentResponse,
        currentState: agentResponse.game_state || {},
        hintsRemaining: agentResponse.hints_remaining || (selectedDifficulty === 'Hard' ? 1 : selectedDifficulty === 'Medium' ? 2 : 3),
        score: 0,
        won: null,
        gameActive: true,
      }
      setGameState(newGameState)
      setGameStarted(true)
      setPlayerInput('')
      localStorage.setItem('currentGame', JSON.stringify(newGameState))
      showFeedback('Game started!', 'success')
    }
  }

  // Make a move
  const handleMakeMove = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameState?.gameActive || !playerInput.trim()) return

    const agentResponse = await callGameMaster('make_move', {
      game_id: gameState.gameId,
      move: playerInput,
      game_type: gameState.gameType,
      difficulty: gameState.difficulty,
    })

    if (agentResponse?.result) {
      const isCorrect = agentResponse.is_correct || false
      const scoreChange = agentResponse.score_change || 0
      const newScore = gameState.score + scoreChange

      if (isCorrect) {
        showFeedback(agentResponse.feedback || 'Correct!', 'success')
      } else {
        showFeedback(agentResponse.feedback || 'Incorrect, try again', 'error')
      }

      const updatedGameState: GameState = {
        ...gameState,
        currentState: agentResponse.game_state || gameState.currentState,
        score: newScore,
        won: agentResponse.is_correct ? true : gameState.won,
        gameActive: !agentResponse.is_correct,
      }

      if (agentResponse.is_correct) {
        setConfettiActive(true)
        setTimeout(() => setConfettiActive(false), 3000)
      }

      setGameState(updatedGameState)
      localStorage.setItem('currentGame', JSON.stringify(updatedGameState))
      setPlayerInput('')
    }
  }

  // Request hint
  const handleGetHint = async () => {
    if (!gameState || gameState.hintsRemaining <= 0) {
      showFeedback('No hints remaining', 'error')
      return
    }

    const agentResponse = await callGameMaster('get_hint', {
      game_id: gameState.gameId,
      game_type: gameState.gameType,
    })

    if (agentResponse?.hint) {
      showFeedback(agentResponse.hint, 'info')
      setGameState({
        ...gameState,
        hintsRemaining: gameState.hintsRemaining - 1,
      })
    }
  }

  // Save and exit
  const handleSaveAndExit = () => {
    if (gameState) {
      const historyEntry: GameHistory = {
        id: gameState.gameId,
        gameType: gameState.gameType,
        difficulty: gameState.difficulty,
        finalScore: gameState.score,
        date: new Date().toLocaleDateString(),
        won: gameState.won === true,
      }
      const updated = [...gameHistory, historyEntry]
      setGameHistory(updated)
      localStorage.setItem('gameHistory', JSON.stringify(updated))
      localStorage.removeItem('currentGame')
    }
    handleRestart()
  }

  // Restart game
  const handleRestart = () => {
    setGameState(null)
    setGameStarted(false)
    setSelectedGameType(null)
    setPlayerInput('')
    setFeedback({ text: '', type: 'info', visible: false })
    localStorage.removeItem('currentGame')
  }

  // Game selection screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Game Master</h1>
            <p className="text-gray-600">Choose your game type and difficulty level</p>
          </div>

          {/* Game Type Selection */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Game Types</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {GAME_TYPES.map((game) => (
                <Card
                  key={game.id}
                  className={`p-6 cursor-pointer transition-all duration-300 border-2 ${
                    selectedGameType === game.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                  onClick={() => setSelectedGameType(game.id)}
                >
                  <div className="text-4xl mb-4">{game.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900">{game.name}</h3>
                </Card>
              ))}
            </div>
          </div>

          {/* Difficulty Selection */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Difficulty</h2>
            <div className="flex gap-4 flex-wrap">
              {DIFFICULTIES.map((diff) => (
                <Button
                  key={diff}
                  variant={selectedDifficulty === diff ? 'default' : 'outline'}
                  onClick={() => setSelectedDifficulty(diff)}
                  className="px-6 py-2 h-auto"
                >
                  {diff}
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mb-12">
            <Button
              onClick={handleStartGame}
              disabled={!selectedGameType || loading}
              className="px-8 py-3 h-auto text-lg gap-2"
            >
              <Play className="w-5 h-5" />
              Start Game
            </Button>
            {gameHistory.length > 0 && (
              <Button
                onClick={() => setShowHistory(true)}
                variant="outline"
                className="px-8 py-3 h-auto text-lg gap-2"
              >
                <History className="w-5 h-5" />
                View History
              </Button>
            )}
          </div>
        </div>

        {/* History Modal */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-2xl">
            <DialogTitle>Game History</DialogTitle>
            <DialogDescription>Your previous games and scores</DialogDescription>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {gameHistory.map((game) => (
                <Card key={game.id} className="p-4 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">{game.gameType}</p>
                      <p className="text-sm text-gray-600">{game.date}</p>
                    </div>
                    <div className="flex gap-3 items-center">
                      <Badge variant={game.difficulty === 'Hard' ? 'default' : 'secondary'}>
                        {game.difficulty}
                      </Badge>
                      <Badge variant={game.won ? 'default' : 'secondary'}>
                        {game.won ? 'Won' : 'Lost'}
                      </Badge>
                      <p className="font-bold text-gray-900 min-w-12 text-right">{game.finalScore}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Feedback Message */}
        {feedback.visible && (
          <div
            className={`fixed bottom-8 right-8 p-4 rounded-lg text-white flex items-center gap-2 animate-pulse ${
              feedback.type === 'success'
                ? 'bg-green-500'
                : feedback.type === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
            }`}
          >
            {feedback.type === 'success' && <Check className="w-5 h-5" />}
            {feedback.type === 'error' && <X className="w-5 h-5" />}
            {feedback.type === 'info' && <AlertCircle className="w-5 h-5" />}
            {feedback.text}
          </div>
        )}
      </div>
    )
  }

  // Game active screen
  if (gameState && gameStarted) {
    const gameTitle = GAME_TYPES.find((g) => g.id === gameState.gameType)?.name || gameState.gameType

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        {confettiActive && <Confetti />}

        {/* Sticky Header */}
        <div className="fixed top-0 left-0 right-0 bg-white bg-opacity-95 backdrop-blur border-b border-gray-200 z-40 p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{gameTitle}</h1>
              <Badge className="mt-1">{gameState.difficulty}</Badge>
            </div>
            <div className="flex gap-4 items-center">
              <div className="text-right">
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-2xl font-bold text-gray-900">{gameState.score}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Hints</p>
                <p className="text-2xl font-bold text-gray-900">{gameState.hintsRemaining}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="max-w-4xl mx-auto mt-24">
          <Card className="p-8 bg-white shadow-lg rounded-2xl">
            {/* Game Content */}
            <div className="mb-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {gameState.gameContent?.game_content || 'Loading game...'}
                </h2>
              </div>

              {/* Game Display based on type */}
              {gameState.gameType === 'trivia' && gameState.gameContent?.question && (
                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <p className="text-lg text-gray-900 font-semibold mb-4">{gameState.gameContent.question}</p>
                  {gameState.gameContent?.options && (
                    <div className="space-y-2">
                      {gameState.gameContent.options.map((option: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-3 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer transition-colors"
                          onClick={() => setPlayerInput(option)}
                        >
                          {option}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {gameState.gameType === 'puzzle' && gameState.gameContent?.puzzle && (
                <div className="bg-purple-50 p-6 rounded-lg mb-6">
                  <p className="text-lg text-gray-900 font-semibold">{gameState.gameContent.puzzle}</p>
                </div>
              )}

              {gameState.gameType === 'word' && gameState.gameContent?.word_challenge && (
                <div className="bg-green-50 p-6 rounded-lg mb-6">
                  <p className="text-lg text-gray-900 font-semibold">{gameState.gameContent.word_challenge}</p>
                </div>
              )}

              {gameState.gameType === 'arcade' && gameState.gameContent?.arcade_challenge && (
                <div className="bg-yellow-50 p-6 rounded-lg mb-6">
                  <p className="text-lg text-gray-900 font-semibold">{gameState.gameContent.arcade_challenge}</p>
                </div>
              )}

              {/* Win/Lose Message */}
              {gameState.won !== null && (
                <div
                  className={`p-4 rounded-lg mb-6 flex items-center gap-3 ${
                    gameState.won
                      ? 'bg-green-100 border-2 border-green-500'
                      : 'bg-red-100 border-2 border-red-500'
                  }`}
                >
                  {gameState.won ? (
                    <Check className="w-6 h-6 text-green-600" />
                  ) : (
                    <X className="w-6 h-6 text-red-600" />
                  )}
                  <span className={`font-bold ${gameState.won ? 'text-green-900' : 'text-red-900'}`}>
                    {gameState.won ? 'Correct! You won!' : 'Game Over'}
                  </span>
                </div>
              )}
            </div>

            {/* Input Form */}
            {gameState.gameActive && (
              <form onSubmit={handleMakeMove} className="space-y-4 mb-6">
                <Input
                  type="text"
                  placeholder="Enter your answer..."
                  value={playerInput}
                  onChange={(e) => setPlayerInput(e.target.value)}
                  disabled={loading}
                  className="text-base p-3 h-auto"
                />
                <Button
                  type="submit"
                  disabled={!playerInput.trim() || loading}
                  className="w-full h-auto py-3"
                >
                  Submit Answer
                </Button>
              </form>
            )}
          </Card>

          {/* Bottom Control Panel */}
          <div className="fixed bottom-8 left-8 right-8 bg-white bg-opacity-95 backdrop-blur border-t border-gray-200 p-4 rounded-xl shadow-lg">
            <div className="max-w-4xl mx-auto flex gap-3 justify-center flex-wrap">
              <Button
                onClick={handleGetHint}
                disabled={gameState.hintsRemaining <= 0 || !gameState.gameActive || loading}
                variant="outline"
                className="gap-2"
              >
                <Lightbulb className="w-5 h-5" />
                Hint
              </Button>
              <Button
                onClick={handleRestart}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                New Game
              </Button>
              <Button
                onClick={handleSaveAndExit}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <Save className="w-5 h-5" />
                Save & Exit
              </Button>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback.visible && (
          <div
            className={`fixed bottom-32 right-8 p-4 rounded-lg text-white flex items-center gap-2 animate-pulse max-w-xs ${
              feedback.type === 'success'
                ? 'bg-green-500'
                : feedback.type === 'error'
                  ? 'bg-red-500'
                  : 'bg-blue-500'
            }`}
          >
            {feedback.type === 'success' && <Check className="w-5 h-5" />}
            {feedback.type === 'error' && <X className="w-5 h-5" />}
            {feedback.type === 'info' && <Lightbulb className="w-5 h-5" />}
            <span className="text-sm">{feedback.text}</span>
          </div>
        )}
      </div>
    )
  }

  return null
}
