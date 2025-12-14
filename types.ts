

export interface GeneratedImage {
  id: string;
  url: string;
  promptUsed: string;
}

export type AppStep = 'upload' | 'validating' | 'generating' | 'selection' | 'describing' | 'result';

export type ImageResolution = '1K' | '2K' | '4K';

export type Gender = 'male' | 'female';

export type HairColor = 'original' | 'black' | 'dark_brown' | 'light_brown' | 'blonde' | 'red' | 'silver' | 'fashion';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface HairDescriptionSection {
  heading: string;
  content: string | string[];
}

export interface HairDescription {
  imageId: string;
  title: string;
  sections: HairDescriptionSection[];
}
