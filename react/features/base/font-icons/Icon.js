// FIXME The import of react-native-vector-icons makes the file native-specific
// but the file's name and/or location (within the directory structure) don't
// reflect that, it suggests the file is platform-independent.
import { createIconSetFromIcoMoon } from 'react-native-vector-icons';

// FIXME Share this with fonts/selection.json
import icoMoonConfig from './jitsi.json';

/**
 * Creates the Jitsi icon set from the ico moon project config file.
 */
export const Icon = createIconSetFromIcoMoon(icoMoonConfig);
