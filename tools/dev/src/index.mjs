export async function main(argv = process.argv.slice(2)) {
  if (argv[0] === '--') argv = argv.slice(1);
  const command = argv[0] || 'start';

  if (command === 'start') {
    await import('./start.mjs');
    return;
  }

  if (command === 'stop') {
    console.log('[tools-dev] stop is a no-op until managed background lifecycle is introduced.');
    return;
  }

  if (command === '-h' || command === '--help' || command === 'help') {
    console.log(`Usage: tools-dev <command>

Commands:
  start   start the local daemon and web app
  stop    no-op placeholder until managed background lifecycle exists
`);
    return;
  }

  throw new Error(`Unknown tools-dev command: ${command}`);
}
