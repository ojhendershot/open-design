export async function main(argv = []) {
  if (argv[0] === '--') argv = argv.slice(1);
  const command = argv[0] || 'help';

  if (command === '-h' || command === '--help' || command === 'help') {
    console.log(`Usage: tools-pack <command>

tools-pack is a boundary placeholder until packaging lanes are defined.
`);
    return;
  }

  throw new Error(`Unknown tools-pack command: ${command}`);
}
