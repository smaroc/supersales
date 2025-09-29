'use server'

import connectToDatabase from '@/lib/mongodb'
import { User, CallType, CallEvaluation, COLLECTIONS } from '@/lib/types'
import { auth } from '@clerk/nextjs/server'
import { ObjectId } from 'mongodb'

export async function seedHeadOfSalesData() {
  try {
    const { userId } = await auth()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    const { db } = await connectToDatabase()

    // Get current user data
    const currentUser = await db.collection<User>(COLLECTIONS.USERS).findOne({ clerkId: userId })
    if (!currentUser) {
      throw new Error('User not found')
    }

    // 1. Create default call types if they don't exist
    const existingCallTypes = await db.collection<CallType>(COLLECTIONS.CALL_TYPES)
      .find({ organizationId: currentUser.organizationId })
      .toArray()

    if (existingCallTypes.length === 0) {
      const defaultCallTypes: Omit<CallType, '_id'>[] = [
        {
          organizationId: currentUser.organizationId,
          name: 'Prospection',
          code: 'PROSPECT',
          description: 'Appel de prospection initiale pour qualifier les leads',
          order: 1,
          color: '#6B7280',
          isActive: true,
          metrics: {
            targetClosingRate: 5,
            avgDuration: 15,
            followUpDays: 3
          },
          criteria: [
            {
              name: 'Qualification du besoin',
              description: 'Le besoin du prospect a été clairement identifié',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Budget disponible',
              description: 'Le prospect a un budget défini pour la solution',
              weight: 6,
              type: 'boolean'
            },
            {
              name: 'Prise de RDV',
              description: 'Rendez-vous pris pour la suite du process',
              weight: 7,
              type: 'boolean'
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          organizationId: currentUser.organizationId,
          name: 'Rendez-vous R1',
          code: 'R1',
          description: 'Premier rendez-vous de qualification approfondie',
          order: 2,
          color: '#3B82F6',
          isActive: true,
          metrics: {
            targetClosingRate: 15,
            avgDuration: 45,
            followUpDays: 5
          },
          criteria: [
            {
              name: 'Présentation de la solution',
              description: 'Solution présentée de manière claire et adaptée',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Identification des décideurs',
              description: 'Les décideurs ont été identifiés',
              weight: 9,
              type: 'boolean'
            },
            {
              name: 'Questions posées',
              description: 'Questions pertinentes posées au prospect',
              weight: 7,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Gestion des objections',
              description: 'Les objections ont été correctement traitées',
              weight: 6,
              type: 'scale',
              scaleMax: 10
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          organizationId: currentUser.organizationId,
          name: 'Rendez-vous R2',
          code: 'R2',
          description: 'Deuxième rendez-vous de finalisation et closing',
          order: 3,
          color: '#10B981',
          isActive: true,
          metrics: {
            targetClosingRate: 25,
            avgDuration: 60,
            followUpDays: 7
          },
          criteria: [
            {
              name: 'Proposition commerciale',
              description: 'Proposition adaptée et personnalisée',
              weight: 9,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Présentation des bénéfices',
              description: 'Bénéfices clairement exposés et quantifiés',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Technique de closing',
              description: 'Technique de closing appropriée utilisée',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Négociation commerciale',
              description: 'Négociation efficace des conditions commerciales',
              weight: 7,
              type: 'scale',
              scaleMax: 10
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          organizationId: currentUser.organizationId,
          name: 'Suivi R3',
          code: 'R3',
          description: 'Appel de suivi et de relance post-proposition',
          order: 4,
          color: '#F59E0B',
          isActive: true,
          metrics: {
            targetClosingRate: 35,
            avgDuration: 30,
            followUpDays: 10
          },
          criteria: [
            {
              name: 'Relance efficace',
              description: 'Relance structurée et professionnelle',
              weight: 8,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Gestion des dernières objections',
              description: 'Objections finales traitées avec expertise',
              weight: 9,
              type: 'scale',
              scaleMax: 10
            },
            {
              name: 'Finalisation de la vente',
              description: 'La vente a-t-elle été finalisée',
              weight: 10,
              type: 'boolean'
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      await db.collection<CallType>(COLLECTIONS.CALL_TYPES).insertMany(defaultCallTypes)
    }

    // 2. Create sample sales reps if they don't exist
    const existingSalesReps = await db.collection<User>(COLLECTIONS.USERS)
      .find({
        organizationId: currentUser.organizationId,
        role: 'sales_rep'
      })
      .toArray()

    if (existingSalesReps.length === 0) {
      const sampleReps: Omit<User, '_id'>[] = [
        {
          clerkId: `demo_clerk_${Date.now()}_1`,
          organizationId: currentUser.organizationId,
          email: 'marie.dupont@acme.com',
          firstName: 'Marie',
          lastName: 'Dupont',
          role: 'sales_rep',
          isAdmin: false,
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
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          clerkId: `demo_clerk_${Date.now()}_2`,
          organizationId: currentUser.organizationId,
          email: 'pierre.martin@acme.com',
          firstName: 'Pierre',
          lastName: 'Martin',
          role: 'sales_rep',
          isAdmin: false,
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
          },
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          clerkId: `demo_clerk_${Date.now()}_3`,
          organizationId: currentUser.organizationId,
          email: 'sophie.bernard@acme.com',
          firstName: 'Sophie',
          lastName: 'Bernard',
          role: 'sales_rep',
          isAdmin: false,
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
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      const insertResult = await db.collection<User>(COLLECTIONS.USERS).insertMany(sampleReps)
      const savedReps = await db.collection<User>(COLLECTIONS.USERS)
        .find({ _id: { $in: Object.values(insertResult.insertedIds) } })
        .toArray()

      // 3. Generate sample call evaluations for the last 30 days
      const callTypes = await db.collection<CallType>(COLLECTIONS.CALL_TYPES)
        .find({ organizationId: currentUser.organizationId })
        .toArray()

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
      const sampleEvaluations: Omit<CallEvaluation, '_id'>[] = []

      for (const rep of savedReps) {
        // Generate 15-25 calls per rep over 30 days
        const numCalls = Math.floor(Math.random() * 11) + 15

        for (let i = 0; i < numCalls; i++) {
          const randomDate = new Date(thirtyDaysAgo.getTime() + Math.random() * (now.getTime() - thirtyDaysAgo.getTime()))
          const randomCallType = callTypes[Math.floor(Math.random() * callTypes.length)]

          // Simulate different outcomes based on call type
          let outcome: 'qualified' | 'not_qualified' | 'follow_up' | 'closed_won' | 'closed_lost'
          const scores: Record<string, number | boolean> = {}
          let totalScore = 0
          let weightedScore = 0

          const rand = Math.random() * 100
          if (randomCallType.code === 'R1') {
            outcome = rand < 15 ? 'closed_won' : (rand < 60 ? 'follow_up' : 'closed_lost')
          } else if (randomCallType.code === 'R2') {
            outcome = rand < 25 ? 'closed_won' : (rand < 70 ? 'follow_up' : 'closed_lost')
          } else if (randomCallType.code === 'R3') {
            outcome = rand < 35 ? 'closed_won' : (rand < 80 ? 'follow_up' : 'closed_lost')
          } else {
            outcome = rand < 5 ? 'closed_won' : (rand < 80 ? 'follow_up' : 'closed_lost')
          }

          // Generate scores based on criteria
          let totalWeight = 0
          for (const criteria of randomCallType.criteria) {
            let score: number | boolean
            if (criteria.type === 'boolean') {
              score = Math.random() < 0.7
            } else if (criteria.type === 'scale') {
              const maxScore = criteria.scaleMax || 10
              score = Math.floor(Math.random() * maxScore) + 1
            } else {
              score = Math.floor(Math.random() * 10) + 1
            }

            scores[criteria.name.replace(/\s/g, '_').toLowerCase()] = score

            if (criteria.type === 'scale') {
              totalScore += score as number
              weightedScore += ((score as number) / (criteria.scaleMax || 10)) * criteria.weight
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
            organizationId: currentUser.organizationId,
            callId: `call_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            salesRepId: rep._id!.toString(),
            evaluatorId: currentUser._id!,
            callTypeId: randomCallType._id!.toString(),
            callType: randomCallType.code,
            evaluationDate: randomDate,
            duration: Math.floor(Math.random() * 40) + 20,
            outcome,
            scores,
            totalScore: Math.round(totalScore),
            weightedScore: Math.round(weightedScore * 10) / 10,
            notes: `Evaluation automatique pour ${rep.firstName} ${rep.lastName}`,
            nextSteps: outcome === 'follow_up' ? 'Relancer dans 3 jours' : undefined,
            followUpDate: outcome === 'follow_up' ? new Date(randomDate.getTime() + 3 * 24 * 60 * 60 * 1000) : undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
      }

      await db.collection<CallEvaluation>(COLLECTIONS.CALL_EVALUATIONS).insertMany(sampleEvaluations)
    }

    // 4. Update user role to head_of_sales if admin and set isAdmin flag
    if (currentUser.role === 'admin') {
      await db.collection<User>(COLLECTIONS.USERS).updateOne(
        { _id: currentUser._id },
        {
          $set: {
            role: 'head_of_sales',
            isAdmin: true, // Set admin flag for admin/owner users
            updatedAt: new Date()
          }
        }
      )
    }

    return { success: true, message: 'Données Head of Sales initialisées avec succès' }
  } catch (error) {
    console.error('Error seeding Head of Sales data:', error)
    throw error
  }
}