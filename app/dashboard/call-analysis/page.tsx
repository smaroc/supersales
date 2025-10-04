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
      return <Meh className="h-4 w-4 text-amber-600" />
  }
}

function getSentimentColor(sentiment: string) {
  switch (sentiment) {
    case 'positive':
      return 'border border-green-200 bg-green-50 text-green-800'
    case 'negative':
      return 'border border-red-200 bg-red-50 text-red-800'
    default:
      return 'border border-amber-200 bg-amber-50 text-amber-800'
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-700'
  if (score >= 60) return 'text-amber-700'
  return 'text-red-700'
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-[400px] items-center justify-center text-gray-700">
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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-green-700">{averageScore}</div>
            <p className="mt-1 text-sm text-gray-700">
              +5.2 from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              Total Calls Analyzed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-gray-900">{totalCalls}</div>
            <p className="mt-1 text-sm text-gray-700">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-950">
              <Star className="h-5 w-5 text-amber-600" />
              Sentiment Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Positive</span>
                <span className="text-sm font-medium text-gray-900">{positivePercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-amber-700">Neutral</span>
                <span className="text-sm font-medium text-gray-900">{neutralPercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">Negative</span>
                <span className="text-sm font-medium text-gray-900">{negativePercentage}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-gray-950">Recent Call Analyses</CardTitle>
          <CardDescription className="text-gray-800">Detailed insights from your latest sales calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {callAnalytics.length > 0 ? callAnalytics.map((call) => (
              <div key={call._id} className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{call.client}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-700">
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
                    <div className={`flex items-center gap-2 rounded-full px-3 py-1 ${getSentimentColor(call.sentiment)}`}>
                      {getSentimentIcon(call.sentiment)}
                      <span className="text-sm font-medium capitalize">{call.sentiment}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${getScoreColor(call.score)}`}>
                        {call.score}
                      </div>
                      <div className="text-xs text-gray-700">Score</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-medium text-gray-900">Key Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {call.topics.map((topic, index) => (
                      <Badge key={index} variant="secondary" className="border border-gray-300 bg-gray-100 text-gray-700">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 font-medium text-gray-900">Key Moments</h4>
                  <div className="space-y-2">
                    {call.keyMoments.map((moment, index) => (
                      <div key={index} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
                        <div className="min-w-[50px] text-sm font-mono text-gray-700">
                          {moment.time}
                        </div>
                        <div className="flex-1">
                          <Badge
                            variant="outline"
                            className={`mb-1 ${
                              moment.type === 'positive' ? 'border-green-400 text-green-700' :
                              moment.type === 'negative' || moment.type === 'objection' ? 'border-red-400 text-red-700' :
                              'border-blue-400 text-blue-700'
                            }`}
                          >
                            {moment.type}
                          </Badge>
                          <p className="text-sm text-gray-700">{moment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                  <div>
                    <span className="text-sm font-medium text-gray-900">Outcome: </span>
                    <span className="text-sm text-gray-700">{call.outcome}</span>
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
                <p className="text-gray-700">No call analyses available</p>
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Call Analysis</h1>
          <p className="text-sm text-gray-700">AI-powered insights from your sales calls</p>
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
