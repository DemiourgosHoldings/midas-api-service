export class ProcessNftRequest {
  collection?: string;
  identifier?: string;
  forceRefreshMedia?: boolean;
  forceRefreshMetadata?: boolean;
  forceRefreshThumbnail?: boolean;
  skipRefreshThumbnail?: boolean;
}