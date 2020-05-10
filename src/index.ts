import * as expander from '@matanlurey/tts-expander';
import Editor from '@matanlurey/tts-editor';
import * as steam from '@matanlurey/tts-runner/steam_finder';
import * as runner from '@matanlurey/tts-runner';
import * as fs from 'fs-extra';
import path from 'path';

/**
 * Builds the mod from `mod/` to `dist/`, returning the filename.
 */
async function buildToDist(): Promise<string> {
  const source = path.join('mod', 'Sandbox.json'); 
  const target = path.join('dist', 'Sandbox.json');
  const saveFile = await new expander.SplitIO().readAndCollapse(source);
  await fs.writeFile(target, JSON.stringify(saveFile, undefined, '  '));
  return target;
}

/**
 * Builds the source tree from `dist/` to `mod`/.
 */
async function extractToMod(): Promise<void> {
  const source = path.join('dist', 'Sandbox.json');
  const target = 'mod';
  const splitter = new expander.SplitIO();
  const modTree = await splitter.readSaveAndSplit(source);
  await splitter.writeSplit(target, modTree);
  // TODO: Return diff.
}

async function createSymlink(): Promise<void> {
  // TODO: Add non-win32 support.
  const from = path.join(steam.homeDir.win32(process.env), 'Saves', 'TTSDevLink');
  return fs.symlink(path.resolve('dist'), from, "junction");
}

async function destroySymlink(): Promise<void> {
  // TODO: Add non-win32 support.
  const from = path.join(steam.homeDir.win32(process.env), 'Saves', 'TTSDevLink');
  return fs.remove(from);
}

async function createAutoExec(): Promise<void> {
  const output = path.join(steam.homeDir.win32(process.env), 'autoexec.cfg');
  await fs.writeFile(output, [
    // Singleplayer.
    'host_game 1',

    // Load TTSAutoSave.
    'load TTSDevLink/Sandbox',

    // Close the "Games" window.
    'ui_games_window OFF',
  ].join('\n'), 'utf-8');
  console.log('Wrote', output);
}

async function deleteAutoExec(): Promise<void> {
  const output = path.join(steam.homeDir.win32(process.env), 'autoexec.cfg');
  return fs.remove(output);
}

/**
 * Entrypoint to `npm start`.
 */
(async (): Promise<void> => {
  console.log('Building...');
  await buildToDist();

  console.log('Linking...');
  await createSymlink();

  console.log('Configuring...');
  await createAutoExec();

  console.log('Listening...');
  const editor = new Editor();
  await editor.listen(); 
  
  console.log('Launching...');
  const tts = await runner.launch();

  editor.on('gameSaved', () => {
    console.log('Received GAME SAVED. Updating source files...');

    extractToMod().then(() => {
      console.log('Updated!');
    });
  });

  tts.process.once('exit', () => {
    console.log('Closing...');
    deleteAutoExec().then(() => destroySymlink()).then(() => {
      console.log('Bye!');
      process.exit(0);
    });
  });
})();
