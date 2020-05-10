import * as expander from '@matanlurey/tts-expander';
import path from 'path';

(async (): Promise<void> => {
  const source = path.join('dist', 'Sandbox.json');
  const target = 'mod';
  const splitter = new expander.SplitIO();
  const modTree = await splitter.readSaveAndSplit(source);
  await splitter.writeSplit(target, modTree);
})();
