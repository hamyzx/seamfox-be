import { REGEX_SANITIZE_FILE_KEY } from '../regex';

export const getFileKey = (filename: string, size: number) => {
  const uuid = crypto.randomUUID();
  const date = Date.now();
  const name = filename.replace(REGEX_SANITIZE_FILE_KEY, '_').split(' ').join('_');
  return `${uuid}/${date}/${size}/${name}`;
};
