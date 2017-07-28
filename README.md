# [xkcd-z-password][xkcd-z-password]

An XKCD-style password generator.

By default, it comes with 113809 officially recognised words, of which only 70806 are in the default filter. For the same with no badwords, use [@ZaneHannanAU/xkcd-z-password-nobadwords][xkcd-z-password-nobad].

It is heavily based on [@fardog/node-xkcd-password][xkcd-password], however some aspects of generation are rather different.

[xkcd-z-password-nobad]: https://github.com/ZaneHannanAU/xkcd-z-password-nobad
[xkcd-z-password]: https://www.npmjs.com/package/xkcd-z-password

## Usage

```javascript
const xkcdPassword = require('xkcd-z-password').init();

xkcdPassword.generate().then(a => console.log(a.join(' ')));
xkcdPassword.generate(7).then(a => a.join(' ')).then(console.log);

// ... in an asynchronous DB
xkcdPassword.generate(4)
.then(a => {
  let pw = a.join(' ');
  notifyUser({newPW: pw});
  return pw;
})
.then(DefaultPasswordHashingFunction)
```

Note that this is a single use, not indicative of all possible uses.

For example, here is one with longer and shorter passwords.

```javascript
// A better use
const xkcdPassword = require('xkcd-z-password').init({
  minLength: 3, maxLength: 9, numWords: 3
});

// db data set given a user value or function
xkcdPassword.generate()
.then(pw => pw.join(' '))
.then(pw => {
  user.setPassword(pw) // recommended for pw storage: bcrypt/bcryptwasm/bcryptjs
  .then(b => {
    if (b) user.notify({type: 'PWSET', data: pw})
  })
})
```

## Differences

xkcd-z-password runs off an integrated array where all indefinites are removed, allowing faster password generation (non-redoing) and possibly lower memory usage (fewer instances of uvstrings in memory).

On the flipside, it means that once it's "ready", it cannot be modified beyond the addition of words that match the generated or provided filter function.

The provided filter function does not include the mentioned bad words, being many times more simple in nature (comparing length).



[xkcd-password]: https://github.com/fardog/node-xkcd-password "fardog/node-xkcd-password (xkcd-password on npmjs)"


## CLI

A mini CLI is bundled with the package, providing some basic setup and functionality, as well as a simple test.

Note that it does not use anything specific, and is decidedly short and generic to allow it to be made easily, accessible via `cd node_modules/xkcd-z-password && npm start`.

The entirety of it is listed below.

```javascript
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
```
