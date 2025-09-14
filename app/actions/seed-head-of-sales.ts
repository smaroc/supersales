'use server'

import dbConnect from '@/lib/mongodb'
import { CallType } from '@/lib/models/call-type'
import { CallEvaluation } from '@/lib/models/call-evaluation'
import User from '@/models/User'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

export async function seedHeadOfSalesData() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      throw new Error('Unauthorized')
    }

    await dbConnect()

    // 1. Create default call types if they don't exist
    const existingCallTypes = await CallType.find({
      organizationId: session.user.organizationId
    })

    if (existingCallTypes.length === 0) {
      const defaultCallTypes = [
        {
          organizationId: session.user.organizationId,
          name: 'Prospection',
          code: 'PROSPECT',
          description: 'Appel de prospection initiale pour qualifier les leads',
          order: 1,
          color: '#6B7280',
          metrics: {
            targetClosingRate: 5,
            avgDuration: 15,
            followUpRequired: true
          },
          evaluationCriteria: [
            {
              name: 'Accroche commerciale',
              description: 'Qualité de l\'approche et de la présentation initiale',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Qualification du besoin',
              description: 'Capacité à identifier et qualifier le besoin client',
              weight: 9,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Prise de RDV',
              description: 'Rendez-vous pris pour la suite du process',
              weight: 7,
              type: 'boolean'
            }
          ]
        },
        {
          organizationId: session.user.organizationId,
          name: 'Rendez-vous R1',
          code: 'R1',
          description: 'Premier rendez-vous de qualification approfondie',
          order: 2,
          color: '#3B82F6',
          metrics: {
            targetClosingRate: 15,
            avgDuration: 45,
            followUpRequired: true
          },
          evaluationCriteria: [
            {
              name: 'Écoute active',
              description: 'Capacité à écouter et comprendre les besoins client',
              weight: 9,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Présentation solution',
              description: 'Qualité de la présentation de la solution adaptée',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Budget qualifié',
              description: 'Le budget a-t-il été correctement qualifié',
              weight: 7,
              type: 'boolean'
            },
            {
              name: 'Décideur identifié',
              description: 'Le décideur a-t-il été identifié et impliqué',
              weight: 8,
              type: 'boolean'
            },
            {
              name: 'Objections traitées',
              description: 'Les objections ont été correctement traitées',
              weight: 6,
              type: 'scale',
              scaleMax: 10
            }
          ]
        },
        {
          organizationId: session.user.organizationId,
          name: 'Rendez-vous R2',
          code: 'R2',
          description: 'Deuxième rendez-vous de finalisation et closing',
          order: 3,
          color: '#10B981',
          metrics: {
            targetClosingRate: 25,
            avgDuration: 60,
            followUpRequired: false
          },
          evaluationCriteria: [
            {
              name: 'Technique de closing',
              description: 'Efficacité des techniques de closing utilisées',
              weight: 10,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Gestion des objections finales',
              description: 'Traitement des dernières objections avant signature',
              weight: 9,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Proposition commerciale',
              description: 'Qualité et pertinence de la proposition finale',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Signature obtenue',
              description: 'Le contrat a-t-il été signé lors du RDV',
              weight: 10,
              type: 'boolean'
            },
            {
              name: 'Conditions négociées',
              description: 'Négociation efficace des conditions commerciales',
              weight: 7,
              type: 'scale',
              scaleMax: 10
            }
          ]
        },
        {
          organizationId: session.user.organizationId,
          name: 'Suivi R3',
          code: 'R3',
          description: 'Appel de suivi et de relance post-proposition',
          order: 4,
          color: '#F59E0B',
          metrics: {
            targetClosingRate: 35,
            avgDuration: 30,
            followUpRequired: false
          },
          evaluationCriteria: [
            {
              name: 'Suivi personnalisé',
              description: 'Qualité du suivi et de la personnalisation',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Relance efficace',
              description: 'Efficacité de la relance et de la réactivation',
              weight: 9,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Nouvelles objections',
              description: 'Traitement des nouvelles objections éventuelles',
              weight: 7,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Finalisation',
              description: 'La vente a-t-elle été finalisée',
              weight: 10,
              type: 'boolean'
            }
          ]
        }
      ]

      await CallType.insertMany(defaultCallTypes)
    }

    // 2. Create sample sales reps if they don't exist
    const existingSalesReps = await User.find({
      organizationId: session.user.organizationId,
      role: 'sales_rep'
    })

    if (existingSalesReps.length === 0) {
      const sampleReps = [
        {
          organizationId: session.user.organizationId,
          email: 'marie.dupont@acme.com',
          firstName: 'Marie',
          lastName: 'Dupont',
          role: 'sales_rep',
          isActive: true,
          permissions: {
            canViewAllData: false,
            canManageUsers: false,
            canManageSettings: false,
            canExportData: false,
            canDeleteData: false
          },
          preferences: {
            theme: 'system',
            notifications: {
              email: true,
              inApp: true,
              callSummaries: true,
              weeklyReports: true
            },
            dashboard: {
              defaultView: 'calls',
              refreshInterval: 300
            }
          }
        },
        {
          organizationId: session.user.organizationId,
          email: 'pierre.martin@acme.com',
          firstName: 'Pierre',
          lastName: 'Martin',
          role: 'sales_rep',
          isActive: true,
          permissions: {
            canViewAllData: false,
            canManageUsers: false,
            canManageSettings: false,
            canExportData: false,
            canDeleteData: false
          },
          preferences: {
            theme: 'system',
            notifications: {
              email: true,
              inApp: true,
              callSummaries: true,
              weeklyReports: true
            },
            dashboard: {
              defaultView: 'calls',
              refreshInterval: 300
            }
          }
        },
        {
          organizationId: session.user.organizationId,
          email: 'sophie.bernard@acme.com',
          firstName: 'Sophie',
          lastName: 'Bernard',
          role: 'sales_rep',
          isActive: true,
          permissions: {
            canViewAllData: false,
            canManageUsers: false,
            canManageSettings: false,
            canExportData: false,
            canDeleteData: false
          },
          preferences: {
            theme: 'system',
            notifications: {
              email: true,
              inApp: true,
              callSummaries: true,
              weeklyReports: true
            },
            dashboard: {
              defaultView: 'calls',
              refreshInterval: 300
            }
          }
        }
      ]

      const savedReps = await User.insertMany(sampleReps)

      // 3. Generate sample call evaluations for the last 30 days
      const callTypes = await CallType.find({ organizationId: session.user.organizationId })
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))

      const sampleEvaluations = []
      
      for (const rep of savedReps) {
        // Generate 15-25 calls per rep over 30 days
        const numCalls = Math.floor(Math.random() * 11) + 15
        
        for (let i = 0; i < numCalls; i++) {
          const randomDate = new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()))
          const randomCallType = callTypes[Math.floor(Math.random() * callTypes.length)]
          
          // Simulate different outcomes based on call type
          let outcome: string
          let scores = []
          let totalScore = 0
          let weightedScore = 0
          
          const rand = Math.random() * 100
          if (randomCallType.code === 'R1') {
            outcome = rand < 15 ? 'closed_won' : (rand < 60 ? 'follow_up_required' : 'closed_lost')
          } else if (randomCallType.code === 'R2') {
            outcome = rand < 25 ? 'closed_won' : (rand < 70 ? 'follow_up_required' : 'closed_lost')
          } else if (randomCallType.code === 'R3') {
            outcome = rand < 35 ? 'closed_won' : (rand < 80 ? 'follow_up_required' : 'closed_lost')
          } else {
            outcome = rand < 5 ? 'closed_won' : (rand < 80 ? 'follow_up_required' : 'closed_lost')
          }

          // Generate scores based on criteria
          let totalWeight = 0
          for (const criteria of randomCallType.evaluationCriteria) {
            let score: any
            if (criteria.type === 'boolean') {
              score = Math.random() < 0.7
            } else if (criteria.type === 'scale') {
              const maxScore = criteria.scaleMax || 10
              score = Math.floor(Math.random() * maxScore) + 1
            } else {
              score = `Commentaire pour ${criteria.name}`
            }

            scores.push({
              criteriaId: criteria.name.replace(/\s/g, '_').toLowerCase(),
              criteriaName: criteria.name,
              score,
              maxScore: criteria.scaleMax,
              weight: criteria.weight
            })

            if (criteria.type === 'scale') {
              totalScore += score
              weightedScore += (score / (criteria.scaleMax || 10)) * criteria.weight
              totalWeight += criteria.weight
            } else if (criteria.type === 'boolean') {
              const boolScore = score ? (criteria.scaleMax || 10) : 0
              totalScore += boolScore
              weightedScore += (boolScore / (criteria.scaleMax || 10)) * criteria.weight
              totalWeight += criteria.weight
            }
          }

          if (totalWeight > 0) {
            weightedScore = (weightedScore / totalWeight) * 100
          }

          sampleEvaluations.push({
            organizationId: session.user.organizationId,
            callId: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            salesRepId: rep._id.toString(),
            evaluatorId: session.user.id,
            callTypeId: randomCallType._id.toString(),
            callType: randomCallType.code,
            evaluationDate: randomDate,
            duration: Math.floor(Math.random() * 40) + 20,
            outcome,
            scores,
            totalScore: Math.round(totalScore),
            weightedScore: Math.round(weightedScore * 10) / 10,
            notes: `Evaluation automatique pour ${rep.firstName} ${rep.lastName}`,
            recording: {
              duration: Math.floor(Math.random() * 40) + 20
            },
            nextSteps: outcome === 'follow_up_required' ? ['Relancer dans 3 jours', 'Envoyer documentation'] : []
          })
        }
      }

      await CallEvaluation.insertMany(sampleEvaluations)
    }

    // 4. Update user role to head_of_sales if admin
    if (session.user.role === 'admin') {
      await User.findByIdAndUpdate(session.user.id, {
        role: 'head_of_sales'
      })
    }

    return { success: true, message: 'Données Head of Sales initialisées avec succès' }
  } catch (error) {
    console.error('Error seeding Head of Sales data:', error)
    throw error
  }
}