export type ReduxStoreType = {
  content: {
    mediaItems: {
      [trackId: string]: {
        item: {
          title: string;
          album: { title: string; cover: string };
          artists: { name: string }[];
        };
      };
    };
  };
  entities: {
    tracks: {
      entities: {
        [trackId: string]: {
          attributes: {
            externalLinks: { href: string }[];
          };
        };
      };
    };
  };
  playQueue: {
    sourceName: string;
    shuffleModeEnabled: boolean;
    repeatMode: 0 | 1 | 2;
  };
  playbackControls: {
    mediaProduct: {
      productId: string;
    };
    playbackContext: {
      actualDuration: number;
      actualAudioQuality?: string;
      bitDepth?: number | null;
      sampleRate?: number | null;
      codec?: string | null;
    };
    playbackState: string;
    volume: number;
  };
  favorites: {
    tracks: number[];
  };
};
