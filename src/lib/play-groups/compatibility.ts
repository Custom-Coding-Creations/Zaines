type GroupSizeCategory = 'small' | 'medium' | 'large' | 'mixed';
type GroupEnergyLevel = 'calm' | 'moderate' | 'high';
type AssessmentSizeCompatibility = 'small_only' | 'medium_and_small' | 'any';
type AssessmentEnergyLevel = 'low' | 'moderate' | 'high';

export type PetCompatibilityInput = {
  weight: number;
  assessment: {
    overallResult: 'approved' | 'conditional';
    sizeCompatibility: AssessmentSizeCompatibility;
    energyLevel: AssessmentEnergyLevel;
    reactivityLevel: number;
    validUntil: string | null;
  } | null;
};

export type GroupCompatibilityInput = {
  sizeCategory: GroupSizeCategory;
  energyLevel: GroupEnergyLevel;
};

export type CompatibilityResult = {
  score: number;
  reason: string;
};

export function getPetSizeCategory(weight: number): 'small' | 'medium' | 'large' {
  if (weight <= 25) return 'small';
  if (weight <= 55) return 'medium';
  return 'large';
}

export function scorePlayGroupCompatibility(
  petInput: PetCompatibilityInput,
  groupInput: GroupCompatibilityInput,
): CompatibilityResult {
  const assessment = petInput.assessment;
  if (!assessment) {
    return { score: 45, reason: 'No approved behavioral assessment on file' };
  }

  if (assessment.validUntil && new Date(assessment.validUntil) < new Date()) {
    return { score: 40, reason: 'Assessment expired - review before assignment' };
  }

  const petSize = getPetSizeCategory(petInput.weight);
  let score = assessment.overallResult === 'approved' ? 100 : 85;
  const reasons: string[] = [];

  if (groupInput.sizeCategory !== 'mixed' && groupInput.sizeCategory !== petSize) {
    score -= 20;
    reasons.push('size mismatch');
  }

  if (
    assessment.sizeCompatibility === 'small_only' &&
    (groupInput.sizeCategory === 'large' || groupInput.sizeCategory === 'mixed')
  ) {
    score -= 25;
    reasons.push('assessment prefers small-only group');
  }

  if (assessment.sizeCompatibility === 'medium_and_small' && groupInput.sizeCategory === 'large') {
    score -= 15;
    reasons.push('assessment avoids large-only groups');
  }

  const energyMismatch =
    (groupInput.energyLevel === 'high' && assessment.energyLevel === 'low') ||
    (groupInput.energyLevel === 'calm' && assessment.energyLevel === 'high');
  if (energyMismatch) {
    score -= 15;
    reasons.push('energy mismatch');
  }

  if (assessment.reactivityLevel >= 4 && groupInput.energyLevel === 'high') {
    score -= 15;
    reasons.push('high reactivity for high-energy group');
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  return {
    score: boundedScore,
    reason: reasons.length > 0 ? reasons.join(', ') : 'Strong behavioral fit',
  };
}

export function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (score >= 80) return 'default';
  if (score >= 60) return 'secondary';
  if (score >= 45) return 'outline';
  return 'destructive';
}
