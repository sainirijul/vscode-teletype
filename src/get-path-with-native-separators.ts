import * as path from 'path';

const WINDOWS_PATH_SEP_SEARCH_PATTERN = /\\/g;
const POSIX_PATH_SEP_SEARCH_PATTERN = /\//g;

export default function getPathWithNativeSeparators(uriStr: string, targetPathSeparator: string = path.sep): string {
    const PATH_SEP_SEARCH_PATTERN = (targetPathSeparator === '/') ? WINDOWS_PATH_SEP_SEARCH_PATTERN : POSIX_PATH_SEP_SEARCH_PATTERN;
    return uriStr.replace(PATH_SEP_SEARCH_PATTERN, targetPathSeparator);
}
