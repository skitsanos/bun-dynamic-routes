import './_compiled.ts' with {type: 'file'};
import {embeddedFiles} from 'bun';

const isRunningAsCompiled = (): boolean => embeddedFiles.length > 0;
export default isRunningAsCompiled;