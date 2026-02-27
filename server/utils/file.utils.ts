import path from 'path';

/** Utility for file and path operations */
export const FileUtils = {
  /** Extracts filename stem and extension from a string */
  parseFileName(filename: string) {
    const ext = path.extname(filename).slice(1);
    const name = path.basename(filename, path.extname(filename));
    return { name, ext };
  }
};
