import { ConfinementType, EquipmentItem } from './types'

// Default equipment for Dynamic Confinement (from Excel "Confinement dynamique")
export const DYNAMIC_CONFINEMENT_EQUIPMENT = [
  { id: 'plateforme-gazelle-1m', name: 'Plateforme gazelle 1m', isDefault: true, defaultQuantity: 1 },
  { id: 'aspirateur-the', name: 'Aspirateur THE', isDefault: true, defaultQuantity: 1 },
  { id: 'petit-aspirateur', name: 'Petit aspirateur', isDefault: true, defaultQuantity: 1 },
  { id: 'extracteurs-5000', name: 'Extracteurs 5000 m3/h', isDefault: true, defaultQuantity: 1 },
  { id: 'unite-filtration', name: 'Unité de filtration', isDefault: true, defaultQuantity: 1 },
  { id: 'unite-chauffante', name: 'Unité chauffante de filtration', isDefault: true, defaultQuantity: 1 },
  { id: 'sas-decontamination-materiel', name: 'Sas de décontamination du matériel/déchet 3c', isDefault: true, defaultQuantity: 1 },
  { id: 'sas-decontamination-personnel-5c', name: 'Sas de décontamination du personnel 5c', isDefault: true, defaultQuantity: 1 },
  { id: 'coffret-16a', name: 'Coffret électrique 16A', isDefault: true, defaultQuantity: 1 },
  { id: 'coffret-32a', name: 'Coffret électrique 32A', isDefault: true, defaultQuantity: 1 },
  { id: 'coffret-63a', name: 'Coffret électrique 63A', isDefault: true, defaultQuantity: 1 },
  { id: 'coffret-125a', name: 'Coffret électrique 125A', isDefault: true, defaultQuantity: 1 },
  { id: 'chariot-elevateur-10m', name: 'Chariot élévateur à bras télescopique 10m', isDefault: true, defaultQuantity: 1 },
  { id: 'marteau-piqueur', name: 'Marteau piqueur – burineur', isDefault: true, defaultQuantity: 1 },
  { id: 'ponceuse-125', name: 'Ponceuse à main 125', isDefault: true, defaultQuantity: 1 },
  { id: 'scie-sabre', name: 'Scie sabre', isDefault: true, defaultQuantity: 1 },
  { id: 'perceuse', name: 'Perceuse', isDefault: true, defaultQuantity: 1 },
  { id: 'visseuse', name: 'Visseuse', isDefault: true, defaultQuantity: 1 },
  // Optional equipment (not default)
  { id: 'conteneur-materiel', name: 'Conteneur matériel', isDefault: false, defaultQuantity: 0 },
  { id: 'roulotte-base-vie', name: 'Roulotte base vie', isDefault: false, defaultQuantity: 0 },
  { id: 'module-vestiaire', name: 'Module vestiaire', isDefault: false, defaultQuantity: 0 },
  { id: 'module-refectoire', name: 'Module réfectoire', isDefault: false, defaultQuantity: 0 },
  { id: 'machine-fumee', name: 'Machine à fumée', isDefault: false, defaultQuantity: 0 },
  { id: 'echafaudage-4m', name: 'Echafaudage roulant 4m', isDefault: false, defaultQuantity: 0 },
  { id: 'controleur-depression', name: 'Contrôleur de dépression', isDefault: false, defaultQuantity: 0 },
  { id: 'extracteurs-500', name: 'Extracteurs 500 m3/h', isDefault: false, defaultQuantity: 0 },
  { id: 'extracteurs-2000', name: 'Extracteurs 2000 m3/h', isDefault: false, defaultQuantity: 0 },
  { id: 'extracteurs-10000', name: 'Extracteurs 10000 m3/h', isDefault: false, defaultQuantity: 0 },
  { id: 'rectifieuse-220v', name: 'Rectifieuse de sol BG 220v', isDefault: false, defaultQuantity: 0 },
  { id: 'rectifieuse-380v', name: 'Rectifieuse de sol BG 380v', isDefault: false, defaultQuantity: 0 },
  { id: 'sas-personnel-3c', name: 'Sas de décontamination du personnel 3c', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-adduction-2-4', name: "Groupe adduction d'air 2-4 opérateurs", isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-adduction-4-6', name: "Groupe adduction d'aire 4-6 opérateurs", isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-electrogene-10kva', name: 'Groupe électrogène de production 10kva', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-electrogene-20kva', name: 'Groupe électrogène de production 20kva', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-electrogene-40kva', name: 'Groupe électrogène de production 40kva', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-electrogene-60kva', name: 'Groupe électrogène de production 60kva', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-secours-6kva', name: 'Groupe électrogène de secours 6kva', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-secours-20kva', name: 'Groupe électrogène de secours 20kva', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-secours-40kva', name: 'Groupe électrogène de secours 40kva', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-secours-60kva', name: 'Groupe électrogène de secours 60kva', isDefault: false, defaultQuantity: 0 },
  { id: 'chariot-13m', name: 'Chariot élévateur à bras télescopique 13m', isDefault: false, defaultQuantity: 0 },
  { id: 'chariot-17m', name: 'Chariot élévateur à bras télescopique 17m', isDefault: false, defaultQuantity: 0 },
  { id: 'pistolet-airless', name: 'Pistolet Airless – polyasim', isDefault: false, defaultQuantity: 0 },
  { id: 'boulonneuse', name: 'Boulonneuse à choc', isDefault: false, defaultQuantity: 0 },
  { id: 'cloueur-gaz', name: 'Cloueur à gaz', isDefault: false, defaultQuantity: 0 },
]

// Default equipment for Static Confinement (from Excel "Confinement statique")
export const STATIC_CONFINEMENT_EQUIPMENT = [
  { id: 'roulotte-base-vie', name: 'Roulotte base vie', isDefault: true, defaultQuantity: 1 },
  { id: 'umd', name: 'Unité mobile de décontamination', isDefault: true, defaultQuantity: 1 },
  { id: 'petit-aspirateur', name: 'Petit aspirateur', isDefault: true, defaultQuantity: 1 },
  { id: 'coffret-16a', name: 'Coffret électrique 16A', isDefault: true, defaultQuantity: 1 },
  { id: 'groupe-electrogene-10kva', name: 'Groupe électrogène de production 10kva', isDefault: true, defaultQuantity: 1 },
  { id: 'marteau-piqueur', name: 'Marteau piqueur – burineur', isDefault: true, defaultQuantity: 1 },
  { id: 'scie-sabre', name: 'Scie sabre', isDefault: true, defaultQuantity: 1 },
  { id: 'perceuse', name: 'Perceuse', isDefault: true, defaultQuantity: 1 },
  { id: 'visseuse', name: 'Visseuse', isDefault: true, defaultQuantity: 1 },
  // Optional equipment (not default)
  { id: 'conteneur-materiel', name: 'Conteneur matériel', isDefault: false, defaultQuantity: 0 },
  { id: 'module-vestiaire', name: 'Module vestiaire', isDefault: false, defaultQuantity: 0 },
  { id: 'module-refectoire', name: 'Module réfectoire', isDefault: false, defaultQuantity: 0 },
  { id: 'plateforme-gazelle-1m', name: 'Plateforme gazelle 1m', isDefault: false, defaultQuantity: 0 },
  { id: 'echafaudage-4m', name: 'Echafaudage roulant 4m', isDefault: false, defaultQuantity: 0 },
  { id: 'coffret-32a', name: 'Coffret électrique 32A', isDefault: false, defaultQuantity: 0 },
  { id: 'coffret-63a', name: 'Coffret électrique 63A', isDefault: false, defaultQuantity: 0 },
  { id: 'coffret-125a', name: 'Coffret électrique 125A', isDefault: false, defaultQuantity: 0 },
  { id: 'groupe-electrogene-20kva', name: 'Groupe électrogène de production 20kva', isDefault: false, defaultQuantity: 0 },
  { id: 'nacelle-12m', name: 'Nacelle à bras déporté 12m', isDefault: false, defaultQuantity: 0 },
  { id: 'nacelle-16m', name: 'Nacelle à bras déporté 16m', isDefault: false, defaultQuantity: 0 },
  { id: 'nacelle-18m', name: 'Nacelle à bras déporté 18m', isDefault: false, defaultQuantity: 0 },
  { id: 'nacelle-20m', name: 'Nacelle à bras déporté 20m', isDefault: false, defaultQuantity: 0 },
  { id: 'nacelle-40m', name: 'Nacelle à bras déporté 40m', isDefault: false, defaultQuantity: 0 },
  { id: 'nacelle-ciseaux-10m', name: 'Nacelle ciseaux 10m', isDefault: false, defaultQuantity: 0 },
  { id: 'nacelle-ciseaux-15m', name: 'Nacelle ciseaux 15m', isDefault: false, defaultQuantity: 0 },
  { id: 'nacelle-ciseaux-20m', name: 'Nacelle ciseaux 20m', isDefault: false, defaultQuantity: 0 },
  { id: 'chariot-elevateur-10m', name: 'Chariot élévateur à bras télescopique 10m', isDefault: false, defaultQuantity: 0 },
  { id: 'chariot-13m', name: 'Chariot élévateur à bras télescopique 13m', isDefault: false, defaultQuantity: 0 },
  { id: 'chariot-17m', name: 'Chariot élévateur à bras télescopique 17m', isDefault: false, defaultQuantity: 0 },
]

/**
 * Get default equipment list for a confinement type
 */
export function getDefaultEquipment(confinementType: ConfinementType): EquipmentItem[] {
  if (confinementType === 'dual') {
    // For dual confinement, merge both dynamic and static equipment
    const dynamicItems = DYNAMIC_CONFINEMENT_EQUIPMENT.filter(item => item.isDefault)
    const staticItems = STATIC_CONFINEMENT_EQUIPMENT.filter(item => item.isDefault)

    // Merge and deduplicate by id, prioritizing dynamic equipment
    const allItems = [...dynamicItems]
    staticItems.forEach(staticItem => {
      if (!allItems.find(item => item.id === staticItem.id)) {
        allItems.push(staticItem)
      }
    })

    return allItems.map(item => ({
      id: item.id,
      name: item.name,
      isDefault: true,
      quantity: item.defaultQuantity
    }))
  }

  const template = confinementType === 'dynamic'
    ? DYNAMIC_CONFINEMENT_EQUIPMENT
    : STATIC_CONFINEMENT_EQUIPMENT

  return template
    .filter(item => item.isDefault)
    .map(item => ({
      id: item.id,
      name: item.name,
      isDefault: true,
      quantity: item.defaultQuantity
    }))
}

/**
 * Get all equipment options for a confinement type (including optional)
 */
export function getAllEquipmentOptions(confinementType: ConfinementType) {
  if (confinementType === 'dual') {
    // For dual confinement, merge both lists
    const allItems = [...DYNAMIC_CONFINEMENT_EQUIPMENT]
    STATIC_CONFINEMENT_EQUIPMENT.forEach(staticItem => {
      if (!allItems.find(item => item.id === staticItem.id)) {
        allItems.push(staticItem)
      }
    })
    return allItems
  }

  return confinementType === 'dynamic'
    ? DYNAMIC_CONFINEMENT_EQUIPMENT
    : STATIC_CONFINEMENT_EQUIPMENT
}

/**
 * Get installation tasks for a confinement type
 */
export function getInstallationTasks(confinementType: ConfinementType): string[] {
  if (confinementType === 'dynamic') {
    return [
      'Installation SAS',
      'Mise en place des parois de confinement (film polyane sur structure non décontaminable)',
      'Installation aéraulique et mise en dépression',
      'Signalisation et balisage zone amiante'
    ]
  } else if (confinementType === 'static') {
    return [
      'Installation UMD',
      "Mise en place d'une protection par film polyane sur les éléments non décontaminables",
      'Barriérage physique, signalisation et balisage de la zone'
    ]
  } else {
    // Dual confinement: combine both
    return [
      'Installation SAS',
      'Installation UMD',
      'Mise en place des parois de confinement (film polyane sur structure non décontaminable)',
      "Mise en place d'une protection par film polyane sur les éléments non décontaminables",
      'Installation aéraulique et mise en dépression',
      'Barriérage physique, signalisation et balisage zone amiante'
    ]
  }
}

/**
 * Get removal/repli tasks for a confinement type
 */
export function getRemovalTasks(confinementType: ConfinementType): string[] {
  if (confinementType === 'dynamic') {
    return [
      'Nettoyage final des surfaces (sols, murs, plafonds)',
      'Contrôle visuel avant démontage',
      'Démontage SAS',
      'Déconfinement et repli des installations'
    ]
  } else if (confinementType === 'static') {
    return [
      'Nettoyage final des surfaces (sols, murs, plafonds)',
      'Contrôle visuel avant repli',
      "Repli de l'UMD"
    ]
  } else {
    // Dual confinement: combine both
    return [
      'Nettoyage final des surfaces (sols, murs, plafonds)',
      'Contrôle visuel avant démontage/repli',
      'Démontage SAS',
      "Repli de l'UMD",
      'Déconfinement et repli des installations'
    ]
  }
}

/**
 * AI-suggested equipment based on parameters
 * This is a placeholder for future AI integration
 */
export function suggestEquipment(params: {
  confinementType: ConfinementType
  numberOfOperators: number
  materialTypes: string[]
  surfaceArea?: number
}): EquipmentItem[] {
  const baseEquipment = getDefaultEquipment(params.confinementType)
  const suggestions: EquipmentItem[] = [...baseEquipment]

  // Adjust quantities based on number of operators
  if (params.numberOfOperators >= 2) {
    const toolsToMultiply = ['marteau-piqueur', 'ponceuse-125', 'scie-sabre', 'perceuse', 'visseuse']
    toolsToMultiply.forEach(toolId => {
      const tool = suggestions.find(item => item.id === toolId)
      if (tool) {
        tool.quantity = params.numberOfOperators
      }
    })
  }

  // Add specific equipment based on material types
  params.materialTypes.forEach(material => {
    if (material.toLowerCase().includes('colle de sol') || material.toLowerCase().includes('dalle')) {
      // Add floor grinder if not already present
      const hasGrinder = suggestions.some(item => item.id.includes('rectifieuse'))
      if (!hasGrinder && params.confinementType === 'dynamic') {
        suggestions.push({
          id: 'rectifieuse-220v',
          name: 'Rectifieuse de sol BG 220v',
          isDefault: false,
          quantity: 1
        })
      }
    }
  })

  return suggestions
}

/**
 * Estimate film polyane area
 * Simple heuristic: perimeter-based estimation
 */
export function estimateFilmPolyaneArea(params: {
  surfaceArea?: number
  height?: number
}): number {
  if (!params.surfaceArea) return 0

  // Rough estimation: assume rectangular room
  // Area = L × W, Perimeter ≈ 2(L + W)
  // For square room: L = W = √Area, Perimeter = 4√Area
  const estimatedHeight = params.height || 2.5 // Default 2.5m height
  const perimeter = 4 * Math.sqrt(params.surfaceArea)
  const wallArea = perimeter * estimatedHeight
  const totalArea = wallArea + params.surfaceArea // walls + ceiling

  return Math.ceil(totalArea * 1.1) // Add 10% for overlaps and waste
}
