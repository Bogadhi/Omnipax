import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from 'ticket-booking-shared';

export const FEATURE_KEY = 'requires_feature';
export const RequiresFeature = (feature: FeatureKey) => SetMetadata(FEATURE_KEY, feature);
