type GroupEnergyLevel = 'calm' | 'moderate' | 'high';

export type StaffRecommendationInput = {
  staffMemberId: string;
  role: string;
  certifications: string[];
  scheduledForSlot: boolean;
  groupsAssignedToday: number;
};

export type StaffRecommendationContext = {
  groupEnergyLevel: GroupEnergyLevel;
};

export type StaffRecommendation = {
  staffMemberId: string;
  score: number;
  reasons: string[];
};

function hasRelevantBehaviorCertifications(certifications: string[]) {
  const normalized = certifications.map((certification) => certification.toLowerCase());
  return normalized.some(
    (value) =>
      value.includes('behavior') ||
      value.includes('training') ||
      value.includes('handling') ||
      value.includes('reactive'),
  );
}

export function scoreStaffRecommendation(
  input: StaffRecommendationInput,
  context: StaffRecommendationContext,
): StaffRecommendation {
  const reasons: string[] = [];
  let score = 100;

  if (!input.scheduledForSlot) {
    score -= 40;
    reasons.push('No matching shift for this play group time slot');
  } else {
    reasons.push('Scheduled during selected play group time');
  }

  if (input.groupsAssignedToday > 0) {
    const loadPenalty = Math.min(45, input.groupsAssignedToday * 15);
    score -= loadPenalty;
    reasons.push(`Current workload: ${input.groupsAssignedToday} group${input.groupsAssignedToday === 1 ? '' : 's'} today`);
  } else {
    reasons.push('No existing play group load today');
  }

  if (input.role === 'manager') {
    score += 5;
    reasons.push('Manager oversight bonus');
  }

  if (context.groupEnergyLevel === 'high' && hasRelevantBehaviorCertifications(input.certifications)) {
    score += 12;
    reasons.push('Behavior/training certification matches high-energy group');
  }

  if (context.groupEnergyLevel === 'calm' && input.role === 'groomer') {
    score += 6;
    reasons.push('Groomer role often aligns with calm group handling');
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  return {
    staffMemberId: input.staffMemberId,
    score: boundedScore,
    reasons,
  };
}