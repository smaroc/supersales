import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  Clock, 
  TrendingUp, 
  User, 
  Calendar,
  Play,
  Download,
  MessageCircle,
  Heart,
  Frown,
  Meh,
  Star,
  Loader2
} from 'lucide-react'
import { getCallAnalyses } from '@/app/actions/call-analysis'

interface KeyMoment {
  time: string
  type: 'objection' | 'positive' | 'decision' | 'question' | 'negative' | 'concern' | 'end'
  text: string
}

interface CallAnalytic {
  _id: string
  client: string
  representative: string
  duration: string
  date: string
  sentiment: 'positive' | 'negative' | 'neutral'
  score: number
  topics: string[]
  outcome: string
  keyMoments: KeyMoment[]
}

function getSentimentIcon(sentiment: string) {
  switch (sentiment) {
    case 'positive':
      return <Heart className="h-4 w-4 text-green-600" />
    case 'negative':
      return <Frown className="h-4 w-4 text-red-600" />
    default:
      return <Meh className="h-4 w-4 text-yellow-600" />
  }
}

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case 'positive':
      return 'text-green-600 bg-green-50 dark:bg-green-900/20'
    case 'negative':
      return 'text-red-600 bg-red-50 dark:bg-red-900/20'
    default:
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">Loading call analytics...</span>
    </div>
  )
}

async function CallAnalyticsContent() {
  const callAnalytics: CallAnalytic[] = await getCallAnalyses('')
  
  // Calculate some basic statistics
  const totalCalls = callAnalytics.length
  const averageScore = totalCalls > 0 ? 
    (callAnalytics.reduce((sum, call) => sum + call.score, 0) / totalCalls).toFixed(1) : '0'
  
  const sentimentDistribution = callAnalytics.reduce(
    (acc, call) => {
      acc[call.sentiment] = (acc[call.sentiment] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const positivePercentage = totalCalls > 0 ? 
    Math.round((sentimentDistribution.positive || 0) / totalCalls * 100) : 0
  const neutralPercentage = totalCalls > 0 ? 
    Math.round((sentimentDistribution.neutral || 0) / totalCalls * 100) : 0
  const negativePercentage = totalCalls > 0 ? 
    Math.round((sentimentDistribution.negative || 0) / totalCalls * 100) : 0

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{averageScore}</div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              +5.2 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Total Calls Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCalls}</div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-600" />
              Sentiment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-green-600">Positive</span>
                <span className="text-sm font-medium">{positivePercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-yellow-600">Neutral</span>
                <span className="text-sm font-medium">{neutralPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-600">Negative</span>
                <span className="text-sm font-medium">{negativePercentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Call Analyses</CardTitle>
          <CardDescription>Detailed insights from your latest sales calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {callAnalytics.length > 0 ? callAnalytics.map((call) => (
              <div key={call._id} className="border rounded-lg p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{call.client}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {call.representative}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {call.duration}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(call.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${getSentimentColor(call.sentiment)}`}>
                      {getSentimentIcon(call.sentiment)}
                      <span className="text-sm font-medium capitalize">{call.sentiment}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(call.score)}`}>
                        {call.score}
                      </div>
                      <div className="text-xs text-gray-500">Score</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Key Topics</h4>
                  <div className="flex gap-2">
                    {call.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Key Moments</h4>
                  <div className="space-y-2">
                    {call.keyMoments.map((moment, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded">
                        <div className="text-sm font-mono text-gray-500 min-w-[50px]">
                          {moment.time}
                        </div>
                        <div className="flex-1">
                          <Badge 
                            variant="outline" 
                            className={`mb-1 ${
                              moment.type === 'positive' ? 'border-green-500 text-green-700' :
                              moment.type === 'negative' || moment.type === 'objection' ? 'border-red-500 text-red-700' :
                              'border-blue-500 text-blue-700'
                            }`}
                          >
                            {moment.type}
                          </Badge>
                          <p className="text-sm">{moment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <span className="text-sm font-medium">Outcome: </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{call.outcome}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Play className="mr-2 h-4 w-4" />
                      Listen
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No call analyses available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export default function CallAnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Call Analysis</h1>
          <p className="text-gray-600 dark:text-gray-300">AI-powered insights from your sales calls</p>
        </div>
        <Button>
          <Phone className="mr-2 h-4 w-4" />
          New Analysis
        </Button>
      </div>

      <Suspense fallback={<LoadingSpinner />}>
        <CallAnalyticsContent />
      </Suspense>
    </div>
  )
}