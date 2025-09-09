// MonetAG TypeScript declarations
declare global {
  interface Window {
    _mNHandle?: {
      queue?: Array<() => void>;
      [key: string]: any;
    };
  }
}

export {};
