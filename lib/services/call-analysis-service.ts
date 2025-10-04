import OpenAI from 'openai'
import connectToDatabase from '@/lib/mongodb'
import { CallAnalysis, CallRecord, COLLECTIONS } from '@/lib/types'
import { ObjectId } from 'mongodb'

let openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required')
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return openai
}

const FRENCH_COACH_PROMPT = `Tu es un coach expérimenté en vente par téléphone ou visio de programmes en ligne. Tu es un expert en vente, tu manie les mots et l'art du questionnement et de la psychologie pour vendre tes programmes.
Ici tu dois analyser les appels de vente de tes élèves afin qu'ils puissent s'améliorer et vendre de plus en plus mais toujours en gardant une connexion émotionnelle avec le prospect.

Utilises les documents que je t'ai fourni afin de me donner une analyse précise de l'appel de vente que je vais te donner dans le message suivant.

Je veux que tu analyses cet appel et que tu me donnes un rapport détaillé sur celui-ci  :

Ce rapport s'adresse au closeur pour qu'il progresse et améliore ses appels de ventes. Tu dois donc toujours le tutoyer. Tu dois donc toujours le TUTOYER dans ce rapport.

Closeur : (Son prénom, ne rien mettre si tu ne le trouves pas,  tutoie le si tu ne trouves pas son prénom)
Prospect : Tu devrais pouvoir trouver son prénom dans la transcription.
Durée de l'appel : durée totale de l'appel (voir le dernier timestamp)
venteEffectuee : Est-ce que le vendeur a conclu la vente  ? (true ou false)
temps_de_parole_closeur : calcule la proportion du temps de parole du closeur grâce à la transcription et au timestamp.
temps_de_parole_client : calcule la proportion du temps de parole du client grâce à la transcription et au timestamp.
resume_de_lappel : Une ou deux phrases maximum qui résume l'appel.

1. Connexion
[Note]
[Commentaire sur la création de la connexion initiale et la mise en place d'une relation de confiance avec le prospect.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé précisement sur cette étape en minutes  (Format mm:ss)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)
2. Cadrage de l'appel
[Note]
[Commentaire sur la clarté et la précision avec lesquelles l'objectif de l'appel a été défini.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé sur cette étape en minutes  (Format mm:ss)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)
3. Identification besoins et  douleurs
[Note]
[Commentaire sur la capacité à identifier et approfondir les besoins et douleurs du prospect.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé sur cette étape en minutes  (Format mm:ss)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)
4. Création de l'urgence
[Note]
[Commentaire sur l'efficacité à instiller un sentiment d'urgence chez le prospect.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé sur cette étape en minutes  (Format mm:ss)]
5. Validation des finances
[Note]
[Commentaire sur la capacité à explorer les capacités financières du prospect de manière appropriée.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)
6. Transition vers le pitch
[Note]
[Commentaire sur la fluidité de la transition entre la discussion des besoins et la présentation de l'offre.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé sur cette étape en minutes  (Format mm:ss)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)
7. Pitch de l'offre
[Note]
[Commentaire sur la clarté, la pertinence et l'impact du pitch.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé sur cette étape en minutes  (Format mm:ss)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)
8. Réponse aux objections
[Note]
[Commentaire sur la manière dont les objections ont été anticipées et traitées.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé sur cette étape en minutes  (Format mm:ss)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)
9. Clôture de l'appel
[Note]
[Commentaire sur la fermeté et l'efficacité de la clôture de l'appel.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé sur cette étape en minutes  (Format mm:ss)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)
10. Validation paiement & Onboarding
[Note]
[Commentaire sur la capacité à sécuriser un engagement ferme et à amorcer le processus d'onboarding.]
[Temps passé sur cette étape en pourcentage (par exemple 20 correspond à 20%)]
[Temps passé sur cette étape en minutes  (Format mm:ss)]
[Temps passé précisement sur cette étape en timestamp ( Format mm:ss - mm:ss)

LA SOMME DES [temps_passés] doit être égale à 100.
LE cumul de [temps passé en minute] doit être égal à la longueur du timestamp. Tu dois bien vérifier ces deux éléments.

2. RÉSUMÉ DES FORCES

Selon l'analyse de l'appel de vente, donne trois forces que tu as analysé chez le closeur.

3. AXES D'AMÉLIORATION
Selon l'analyse de l'appel de vente,  donne trois axes d'amélioration  en mentionnant les passages (avec les timestamps). Pour chaque axe d'amélioration, je veux que tu cites le passage à améliorer et que tu proposes une meilleure version pour que le closeur puisse s'améliorer comme par exemple :
"05:00 à 06:50 : Cites un passe que tu trouves dans la transcription de l'appel et qui ferait l'objet de l'amélioration en question."
Tu aurais pu dire : "Ecrire ici une autre manière plus commerciale selon les informations que je t'ai donné  ...."

Voici quelques informations dont tu dois faire attention :
-Calcule la durée de l'appel grâce au TimeStamp que je vais te fournir dans la transcription.
-Tu dois être le plus précis sur les temps.
-Je veux que le champs JSON "validation" soit un boolean : true ou false. true si la note est au dessus de 5 et false si c'est en dessous.
-Dans les résultats, je veux absolument les timestamps des phrases quand le closeur parle afin qu'il puisse savoir précisément où se trouve ses points d'améliorations.
-Si la vente n'a pas eu lieu alors il faudra ne rien indiquer dans la phase : Validation paiement & Onboarding et indiquer false sur le résultat de l'appel.


 Je veux également que tu me calcules le temps de parole du closeur et du prospect en fonction de la transcription. Donne moi le résultat en pourcentage mais uniquement la valeur sans unités.


-Je veux que tu utilises la façon de parler et le vocabulaire utilisé dans les documents que je t'ai fourni afin que cela se rapproche au mieux d'une analyse par le coach lui même.
-Je veux que dans les commentaires tu utilises le nom de closeur. Si tu ne le trouves pas alors tutoie le,  utilise le TU pour donner les conseils. Utilise le tutoiement à la deuxième personne du singulier dans tes commentaires et analyses. Dans les commentaires de chaque étape, je veux que tu sois le plus concis possible. Le commentaire ne doit pas dépasser deux phrases.

Je veux une réponse contentant UNIQUEMENT un fichier JSON comme l'exemple ci-après, tu dois absolument respecter les clés de ce fichier JSON pour que je puisse le deserializer dans mes objets :

"{
  "closeur": "",
  "prospect": "Antoine",
  "dureeAppel": "95:39",
  "venteEffectuee": true,
  "temps_de_parole_closeur": 45,
  "temps_de_parole_client": 55,
  "resume_de_lappel": "Tu as réussi à closer Antoine pour un programme de 12 000€ avec une bonne identification de ses douleurs.",
  "evaluationCompetences": [
    {
      "etapeProcessus": "Connexion",
      "evaluation": 8,
      "temps_passe": 5,
      "temps_passe_mm_ss": "04:48",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Bonne création de connexion initiale et mise en confiance avec le prospect.",
      "validation": true
    },
    {
      "etapeProcessus": "Cadrage de l'appel",
      "evaluation": 7,
      "temps_passe": 3,
      "temps_passe_mm_ss": "02:52",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Cadrage clair mais aurait pu être plus concis.",
      "validation": true
    },
    {
      "etapeProcessus": "Identification besoins et douleurs",
      "evaluation": 9,
      "temps_passe": 20,
      "temps_passe_mm_ss": "19:07",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Excellente identification des besoins et douleurs d'Antoine.",
      "validation": true
    },
    {
      "etapeProcessus": "Création de l'urgence",
      "evaluation": 6,
      "temps_passe": 10,
      "temps_passe_mm_ss": "09:34",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Urgence créée mais aurait pu être plus impactante.",
      "validation": true
    },
    {
      "etapeProcessus": "Validation des finances",
      "evaluation": 6,
      "temps_passe": 8,
      "temps_passe_mm_ss": "07:39",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Exploration des capacités financières correcte mais manque de profondeur.",
      "validation": true
    },
    {
      "etapeProcessus": "Transition vers le pitch",
      "evaluation": 7,
      "temps_passe": 5,
      "temps_passe_mm_ss": "04:48",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Transition fluide mais aurait pu être plus engageante.",
      "validation": true
    },
    {
      "etapeProcessus": "Pitch de l'offre",
      "evaluation": 8,
      "temps_passe": 15,
      "temps_passe_mm_ss": "14:21",
      "commentaire": "Pitch clair et pertinent mais pourrait être plus percutant.",
      "validation": true
    },
    {
      "etapeProcessus": "Réponse aux objections",
      "evaluation": 7,
      "temps_passe": 15,
      "temps_passe_mm_ss": "14:21",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Bonne gestion des objections mais manque de fermeté.",
      "validation": true
    },
    {
      "etapeProcessus": "Clôture de l'appel",
      "evaluation": 9,
      "temps_passe": 10,
      "temps_passe_mm_ss": "09:34",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Clôture ferme et efficace, bien menée.",
      "validation": true
    },
    {
      "etapeProcessus": "Validation paiement & Onboarding",
      "evaluation": 8,
      "temps_passe": 5,
      "temps_passe_mm_ss": "04:48",
      "timestamps": "mm:ss-mm:ss",
      "commentaire": "Engagement ferme et bon amorçage du processus d'onboarding.",
      "validation": true
    }
  ],
  "noteGlobale": {
    "total": 83,
    "sur100": "83"
  },
  "resumeForces": [
    {
      "pointFort": "Excellente connexion initiale avec le prospect, mise en confiance."
    },
    {
      "pointFort": "Bonne identification des besoins et douleurs d'Antoine."
    },
    {
      "pointFort": "Clôture ferme et efficace de l'appel."
    }
  ],
  "axesAmelioration": [
    {
      "axeAmelioration": "Création de l'urgence",
      "suggestion": "Renforcer l'urgence en soulignant les conséquences de ne pas agir immédiatement.",
      "exemple_issu_de_lappel": "24:24 à 24:42 : Imagine, tu restes dans ton business model là, que toi, tu as mis, c'est-à-dire celui que tu as créé. Qu'est-ce qui va se passer pour toi, selon toi, dans un an, deux ans, si tu es dans la même situation dans ta vie professionnelle, mais aussi dans ta vie personnelle ?",
      "alternative": "Antoine, si tu ne changes rien maintenant, tu risques de rester bloqué dans cette situation pendant encore des années, ce qui pourrait non seulement limiter ton potentiel de revenus mais aussi affecter ta qualité de vie personnelle."
    },
    {
      "axeAmelioration": "Validation des finances",
      "suggestion": "Explorer plus en profondeur les capacités financières du prospect pour s'assurer de sa capacité à investir.",
      "exemple_issu_de_lappel": "34:19 à 34:34 : Et est-ce que tu as justement prévu un budget pour te permettre, d'aller chercher ces 10 000 euros minimum par mois, d'aller chercher au-delà de ce business de prof, mathématique, d'aller chercher cette indépendance financière et temporelle ?",
      "alternative": "Antoine, tu m'as dit que tu gagnes bien ta vie actuellement. Peux-tu me donner une idée plus précise de ton budget disponible pour cet investissement afin que je sois certain que cela ne te mettra pas en difficulté financière ?"
    },
    {
      "axeAmelioration": "Pitch de l'offre",
      "suggestion": "Rendre le pitch plus percutant en utilisant des exemples concrets et des témoignages.",
      "exemple_issu_de_lappel": "37:03 à 37:11 : L'accompagnement auquel je pense pour toi, c'est notre accompagnement phare. C'est l'accompagnement aujourd'hui qui nous permet d'amener des personnes jusqu'à 300 000 euros, en termes de chiffre d'affaires, même plus jusqu'à 500 000 si besoin.",
      "alternative": "Antoine, pour te donner un exemple concret, un de nos clients a pu augmenter ses revenus de 200 000 euros en seulement trois mois grâce à notre programme. Nous allons utiliser les mêmes stratégies pour toi."
    }
  ],
  "commentairesSupplementaires": {
    "feedbackGeneral": "Globalement, un bon appel avec une bonne identification des besoins et une clôture efficace.",
    "prochainesEtapes": "Travailler sur la création d'urgence et approfondir la validation des finances pour les prochains appels."
  },
  "notesAdditionnelles": {
    "timestampsImportants": [
      "24:24",
      "34:19",
      "37:03"
    ],
    "ressourcesRecommandees": [
      "Vidéo sur la création de l'urgence",
      "Article sur la validation des finances"
    ]
  }
}"`

export class CallAnalysisService {
  static async analyzeCall(callRecordId: string): Promise<void> {
    try {
      console.log(`Starting OpenAI analysis for call record: ${callRecordId}`)

      const { db } = await connectToDatabase()

      // Get the call record
      const callRecord = await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).findOne({
        _id: new ObjectId(callRecordId)
      })

      if (!callRecord) {
        console.error(`Call record not found: ${callRecordId}`)
        return
      }

      if (!callRecord.transcript || callRecord.transcript.trim() === '') {
        console.warn(`No transcript available for call record: ${callRecordId}`)
        return
      }

      // Check if analysis already exists
      const existingAnalysis = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).findOne({
        callRecordId: new ObjectId(callRecordId)
      })

      if (existingAnalysis) {
        console.log(`Analysis already exists for call record: ${callRecordId}`)
        return
      }

      // Create a placeholder analysis record
      const analysisRecord: Partial<CallAnalysis> = {
        organizationId: callRecord.organizationId,
        callRecordId: new ObjectId(callRecordId),
        salesRepId: callRecord.salesRepId,
        closeur: '',
        prospect: '',
        dureeAppel: '',
        venteEffectuee: false,
        temps_de_parole_closeur: 0,
        temps_de_parole_client: 0,
        resume_de_lappel: '',
        evaluationCompetences: [],
        noteGlobale: { total: 0, sur100: '0' },
        resumeForces: [],
        axesAmelioration: [],
        commentairesSupplementaires: { feedbackGeneral: '', prochainesEtapes: '' },
        notesAdditionnelles: { timestampsImportants: [], ressourcesRecommandees: [] },
        analysisStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).insertOne(analysisRecord as CallAnalysis)
      const analysisId = result.insertedId

      try {
        // Prepare the transcript for analysis
        const transcriptForAnalysis = `Voici la transcription de l'appel de vente à analyser:

Titre: ${callRecord.title}
Durée: ${Math.round(callRecord.actualDuration)} minutes
Date: ${callRecord.scheduledStartTime.toISOString()}

Transcription:
${callRecord.transcript}`

        console.log(`Sending transcript to OpenAI for analysis (${callRecord.transcript.length} characters)`)

        // Call OpenAI API
        const openaiClient = getOpenAIClient()
        const completion = await openaiClient.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            {
              role: "system",
              content: FRENCH_COACH_PROMPT
            },
            {
              role: "user",
              content: transcriptForAnalysis
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        })

        const rawResponse = completion.choices[0]?.message?.content

        if (!rawResponse) {
          throw new Error('No response received from OpenAI')
        }

        console.log('Received response from OpenAI')

        // Parse the JSON response
        let analysisData
        try {
          // Clean the response to extract just the JSON
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
          if (!jsonMatch) {
            throw new Error('No JSON found in OpenAI response')
          }

          analysisData = JSON.parse(jsonMatch[0])
        } catch (parseError) {
          console.error('Error parsing OpenAI JSON response:', parseError)
          console.error('Raw response:', rawResponse)
          throw new Error('Failed to parse OpenAI response as JSON')
        }

        // Update the analysis record with OpenAI results
        const updateData: Partial<CallAnalysis> = {
          ...analysisData,
          rawAnalysisResponse: rawResponse,
          analysisStatus: 'completed',
          updatedAt: new Date()
        }

        await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).updateOne(
          { _id: analysisId },
          { $set: updateData }
        )

        // Update call record status
        await db.collection<CallRecord>(COLLECTIONS.CALL_RECORDS).updateOne(
          { _id: new ObjectId(callRecordId) },
          {
            $set: {
              status: 'evaluated',
              updatedAt: new Date()
            }
          }
        )

        console.log(`Successfully completed OpenAI analysis for call record: ${callRecordId}`)

      } catch (apiError) {
        console.error(`Error during OpenAI analysis for call ${callRecordId}:`, apiError)

        // Update analysis record with error
        await db.collection<CallAnalysis>(COLLECTIONS.CALL_ANALYSIS).updateOne(
          { _id: analysisId },
          {
            $set: {
              analysisStatus: 'failed',
              analysisError: apiError instanceof Error ? apiError.message : 'Unknown error',
              updatedAt: new Date()
            }
          }
        )

      }

    } catch (error) {
      console.error(`CallAnalysisService.analyzeCall error for ${callRecordId}:`, error)
    }
  }
}