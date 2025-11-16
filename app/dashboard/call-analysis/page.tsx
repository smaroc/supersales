import { getCallAnalyses } from '@/app/actions/call-analysis'
import { getAuthorizedUser } from '@/app/actions/users'
import { CallAnalysisContent } from '@/components/call-analysis-content'

async function CallAnalysisPage() {
  const user = await getAuthorizedUser()

  if (!user || !user.currentUser) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-950">Accès non autorisé</p>
        </div>
      </div>
    )
  }

  // Fetch ALL call types - filtering will be done client-side
  const allCallAnalytics = await getCallAnalyses(user.currentUser._id.toString(), { includeAllTypes: true })

  return <CallAnalysisContent allCallAnalytics={allCallAnalytics} />
}

export default CallAnalysisPage