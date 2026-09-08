/**
 * Shared Blood Compatibility & Cross-Match Utilities for Frontend & Client Services
 */

export const BLOOD_GROUPS = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
export const COMPONENT_TYPES = ['RBC', 'PLASMA', 'PLATELETS', 'WHOLE_BLOOD'];

// RBC (Red Blood Cells) Compatibility Matrix
const RBC_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

// PLASMA Compatibility Matrix (ABO inverted)
const PLASMA_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'A-', 'AB+', 'AB-'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'B-', 'AB+', 'AB-'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+', 'AB-'],
};

// PLATELETS Compatibility Matrix
const PLATELETS_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'B-', 'AB-'],
  'O+': ['O+', 'O-', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'O-', 'AB-'],
  'A+': ['A+', 'A-', 'O+', 'AB+'],
  'B-': ['B-', 'B+', 'O-', 'AB-'],
  'B+': ['B+', 'B-', 'O+', 'AB+'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'B+', 'O+'],
};

// WHOLE BLOOD Compatibility Matrix
const WHOLE_BLOOD_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O+'],
  'A-': ['A-'],
  'A+': ['A+'],
  'B-': ['B-'],
  'B+': ['B+'],
  'AB-': ['AB-'],
  'AB+': ['AB+'],
};

export function isValidBloodGroup(group) {
  return BLOOD_GROUPS.includes(group);
}

export function isValidComponentType(component) {
  return COMPONENT_TYPES.includes(component);
}

export function getCompatibleDonorGroups(recipientBloodGroup, componentType = 'RBC') {
  if (!isValidBloodGroup(recipientBloodGroup)) {
    throw new Error(`Invalid recipient blood group: ${recipientBloodGroup}`);
  }
  const comp = componentType.toUpperCase();
  if (!isValidComponentType(comp)) {
    throw new Error(`Invalid component type: ${componentType}`);
  }

  switch (comp) {
    case 'RBC':
      return RBC_COMPATIBILITY[recipientBloodGroup] || [];
    case 'PLASMA':
      return PLASMA_COMPATIBILITY[recipientBloodGroup] || [];
    case 'PLATELETS':
      return PLATELETS_COMPATIBILITY[recipientBloodGroup] || [];
    case 'WHOLE_BLOOD':
      return WHOLE_BLOOD_COMPATIBILITY[recipientBloodGroup] || [];
    default:
      return [recipientBloodGroup];
  }
}

export function getCompatibleRecipientGroups(donorBloodGroup, componentType = 'RBC') {
  if (!isValidBloodGroup(donorBloodGroup)) {
    throw new Error(`Invalid donor blood group: ${donorBloodGroup}`);
  }
  const comp = componentType.toUpperCase();
  const compatible = [];

  for (const recipientGroup of BLOOD_GROUPS) {
    const donors = getCompatibleDonorGroups(recipientGroup, comp);
    if (donors.includes(donorBloodGroup)) {
      compatible.push(recipientGroup);
    }
  }
  return compatible;
}

export function isCompatible(donorBloodGroup, recipientBloodGroup, componentType = 'RBC') {
  if (!isValidBloodGroup(donorBloodGroup) || !isValidBloodGroup(recipientBloodGroup)) {
    return false;
  }
  const compatibleDonors = getCompatibleDonorGroups(recipientBloodGroup, componentType);
  return compatibleDonors.includes(donorBloodGroup);
}

export function getCompatibilityDetails(donorBloodGroup, recipientBloodGroup, componentType = 'RBC') {
  const compatible = isCompatible(donorBloodGroup, recipientBloodGroup, componentType);
  const isExact = donorBloodGroup === recipientBloodGroup;
  const comp = componentType.toUpperCase();

  if (!compatible) {
    return {
      donorBloodGroup,
      recipientBloodGroup,
      componentType: comp,
      compatible: false,
      matchType: 'incompatible',
      priorityRank: 999,
      reason: `${donorBloodGroup} ${comp} contains incompatible antigens or antibodies for an ${recipientBloodGroup} recipient. Transfusion is contraindicated.`
    };
  }

  const compatibleList = getCompatibleDonorGroups(recipientBloodGroup, comp);
  const priorityIndex = compatibleList.indexOf(donorBloodGroup);

  let reason = '';
  if (isExact) {
    reason = `${donorBloodGroup} ${comp} is an identical isogroup match for an ${recipientBloodGroup} recipient (Priority 1).`;
  } else if (comp === 'RBC' && donorBloodGroup === 'O-') {
    reason = `O- is a universal Red Blood Cell donor, devoid of A, B, and Rh antigens, safe as an emergency compatible alternative for an ${recipientBloodGroup} recipient.`;
  } else if (comp === 'RBC' && donorBloodGroup === 'O+') {
    reason = `O+ RBC lacks A and B antigens, safe as a compatible alternative for an Rh-positive (${recipientBloodGroup}) recipient.`;
  } else if (comp === 'PLASMA' && (donorBloodGroup === 'AB+' || donorBloodGroup === 'AB-')) {
    reason = `${donorBloodGroup} plasma lacks anti-A and anti-B antibodies, making it a universal plasma donor for an ${recipientBloodGroup} recipient.`;
  } else {
    reason = `${donorBloodGroup} ${comp} is an approved compatible alternative (Priority ${priorityIndex + 1}) for an ${recipientBloodGroup} recipient.`;
  }

  return {
    donorBloodGroup,
    recipientBloodGroup,
    componentType: comp,
    compatible: true,
    matchType: isExact ? 'exact_match' : 'compatible_alternative',
    priorityRank: priorityIndex + 1,
    reason,
    medicalDisclaimer: 'Automated compatibility aid. Final clinical compatibility must be confirmed by laboratory serological crossmatching.'
  };
}

export function calculateMatchScore(details, distanceKm = 0, isSufficient = true) {
  if (!details || !details.compatible) return 0;

  let score = 0;
  if (details.matchType === 'exact_match') {
    score += 40;
  } else {
    const priorityPenalty = Math.min(15, (details.priorityRank - 1) * 3);
    score += Math.max(15, 25 - priorityPenalty);
  }

  if (isSufficient) {
    score += 25;
  } else {
    score += 10;
  }

  const dist = Math.max(0, distanceKm);
  const distanceScore = Math.max(0, Math.round(20 * (1 - Math.min(1, dist / 50))));
  score += distanceScore;

  return Math.min(100, Math.max(0, score));
}
