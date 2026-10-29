export const WORKSPACE_ROOT = 'WORKSPACE_ROOT';

export const GIT_DIRECTORY_NAME = '.git';
export const NODE_MODULES_DIRECTORY_NAME = 'node_modules';
export const ENV_FILE_NAME = '.env';
export const ENV_FILE_PREFIX = '.env.';
export const ENV_EXAMPLE_FILE_NAME = '.env.example';
export const CURRENT_DIRECTORY_SEGMENT = '.';

export const SKIPPED_NAMES: readonly string[] = [
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
];

export const BINARY_SNIFF_BYTES = 8 * 1024;

export const BINARY_EXTENSIONS: readonly string[] = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.ico',
  '.icns',
  '.tif',
  '.tiff',
  '.webp',
  '.avif',
  '.heic',
  '.psd',
  '.svgz',
  '.zip',
  '.tar',
  '.gz',
  '.tgz',
  '.bz2',
  '.xz',
  '.zst',
  '.7z',
  '.rar',
  '.jar',
  '.war',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.obj',
  '.o',
  '.a',
  '.lib',
  '.class',
  '.wasm',
  '.pyc',
  '.pyo',
  '.node',
  '.sqlite',
  '.sqlite3',
  '.db',
  '.mp3',
  '.m4a',
  '.aac',
  '.wav',
  '.flac',
  '.ogg',
  '.oga',
  '.opus',
  '.mp4',
  '.m4v',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.wmv',
  '.flv',
];

export const EMPTY_ROOT_MESSAGE = 'workspace root must not be empty';
export const EMPTY_PATH_MESSAGE = 'path must not be empty';
export const NULL_BYTE_PATH_MESSAGE = 'path must not contain a null byte';
export const OUTSIDE_WORKSPACE_MESSAGE = 'path is outside the workspace';
export const GIT_PROTECTED_MESSAGE = '.git directory is protected';
export const ENV_READ_DENIED_MESSAGE = 'reading .env files is not allowed';
export const ENV_WRITE_DENIED_MESSAGE = 'writing .env files is not allowed';
export const NODE_MODULES_WRITE_DENIED_MESSAGE =
  'writing into node_modules is not allowed. Install packages with a command instead';
export const BINARY_READ_DENIED_MESSAGE = 'binary files cannot be read';
