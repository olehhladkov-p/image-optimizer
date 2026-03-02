import path from 'path';

export const FileUtils = {
  parseFileName(filename: string) {
    const ext = path.extname(filename).slice(1);
    const name = path.basename(filename, path.extname(filename));
    return { name, ext };
  }
};
