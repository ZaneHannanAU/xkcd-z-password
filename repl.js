const repl = require('repl');

require('.')
.init({minLength: 0, maxLength: Infinity, numWords: 4})
.once('ready', x => {
  console.log('Ready');
  const r = repl.start('> ');
  r.context.xkcdp = x;
  r.defineCommand('generate', {
    help: 'xkcd-z-password: generate and log password',
    action(length) {
      x.generate(parseInt(length || '4'))
      .then(generated => generated.join(' '))
      .then(console.log)
      .catch(console.error)
      .then(() => this.displayPrompt())
    }
  })
})
