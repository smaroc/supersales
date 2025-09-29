import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ZoomService } from '@/lib/services/zoom-service'
import { FathomService } from '@/lib/services/fathom-service'
import { FirefilesService } from '@/lib/services/firefiles-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform } = params

    let testResult: { success: boolean; message: string; details?: any } = {
      success: false,
      message: 'Unknown error'
    }

    try {
      switch (platform) {
        case 'zoom':
          const zoomService = new ZoomService(body)
          testResult = await zoomService.testConnection()
          break
        
        case 'fathom':
          const fathomService = new FathomService(body)
          testResult = await fathomService.testConnection()
          break
        
        case 'firefiles':
          const firefilesService = new FirefilesService(body)
          testResult = await firefilesService.testConnection()
          break
        
        default:
          return NextResponse.json(
            { error: 'Unsupported platform' },
            { status: 400 }
          )
      }

      return NextResponse.json(testResult)
    } catch (serviceError: any) {
      return NextResponse.json({
        success: false,
        message: serviceError.message || 'Connection test failed',
        details: serviceError.details
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error testing integration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}