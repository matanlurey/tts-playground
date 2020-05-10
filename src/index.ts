import * as expander from '@matanlurey/tts-expander';
import Editor, {
  OutgoingJsonObject,
} from '@matanlurey/tts-editor';
import * as steam from '@matanlurey/tts-runner/steam_finder';
import * as runner from '@matanlurey/tts-runner';
import * as fs from 'fs-extra';
import chokidar from 'chokidar';
import path from 'path';

/**
 * Builds the mod from `mod/` to `dist/`, returning the tree.
 */
async function buildToDist(): Promise<expander.SplitSaveState> {
  const source = path.join('mod', 'Sandbox.json');
  const target = path.join('dist', 'Sandbox.json');
  const splitter = new expander.SplitIO();
  const saveFile = await splitter.readAndCollapse(source);
  await fs.writeFile(target, JSON.stringify(saveFile, undefined, '  '));
  return expander.splitSave(saveFile);
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
}

async function createSymlink(): Promise<void> {
  // TODO: Add non-win32 support.
  const from = path.join(
    steam.homeDir.win32(process.env),
    'Saves',
    'TTSDevLink',
  );
  return fs.symlink(path.resolve('dist'), from, 'junction');
}

async function destroySymlink(): Promise<void> {
  // TODO: Add non-win32 support.
  const from = path.join(
    steam.homeDir.win32(process.env),
    'Saves',
    'TTSDevLink',
  );
  return fs.remove(from);
}

async function createAutoExec(): Promise<void> {
  const output = path.join(steam.homeDir.win32(process.env), 'autoexec.cfg');
  await fs.writeFile(
    output,
    [
      // Singleplayer.
      'host_game 1',

      // Load TTSAutoSave.
      'load TTSDevLink/Sandbox',

      // Close the "Games" window.
      'ui_games_window OFF',
    ].join('\n'),
    'utf-8',
  );
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
  fs.mkdirpSync(path.join('dist', 'edit'));
  await buildToDist();

  console.log('Linking...');
  await createSymlink();

  console.log('Configuring...');
  await createAutoExec();

  console.log('Listening...');
  const editor = new Editor();
  await editor.listen();

  console.log('Watching...');
  const watcher = chokidar.watch(path.join('dist', 'edit'));
  watcher.on('change', (file) => {
    const guid = path.basename(file).split('.')[0];
    const base = path.join(path.dirname(file), guid);
    const lua = `${base}.lua`;
    const xml = `${base}.xml`;
    const out: OutgoingJsonObject = {
      guid,
      script: fs.readFileSync(lua, 'utf-8'),
      ui: fs.readFileSync(xml, 'utf-8'),
    };
    fs.removeSync(lua);
    fs.removeSync(xml);
    console.log('Pushing', guid);
    editor.saveAndPlay([out]).then(() => {
      console.log('Updated!');
    });
  });

  console.log('Launching...');
  const tts = await runner.launch();

  editor.on('pushingNewObject', (event) => {
    // TODO: If this is an existing script, we should just notify the user.
    //
    // Add a new file to dist/edit, and watch that folder for changes.
    const edit = path.join('dist', 'edit');
    for (const state of event.scriptStates) {
      const name = path.join(edit, state.guid);
      const lua = `${name}.lua`;
      const xml = `${name}.xml`;
      if (!fs.existsSync(lua)) {
        fs.writeFile(lua, state.script, 'utf-8');
        fs.writeFile(xml, state.ui || '', 'utf-8');
      }
    }
  });

  editor.on('gameSaved', () => {
    console.log('Received GAME SAVED. Updating source files...');

    extractToMod().then(() => {
      // TODO: Diff against modTree.
      console.log('Updated!');
    });
  });

  tts.process.once('exit', () => {
    console.log('Closing...');
    deleteAutoExec()
      .then(() => destroySymlink())
      .then(() => {
        fs.removeSync(path.join('dist', 'edit'));
        console.log('Bye!');
        process.exit(0);
      });
  });
})();
